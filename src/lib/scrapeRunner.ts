import { prisma } from "@/lib/prisma";
import { ensureGeocode } from "@/lib/services/geocode";
import { sendNewListingsDigest } from "@/lib/services/email";
import { scrapeSources } from "@/lib/scrapers";
import { normalizeListing } from "@/lib/scrapers/normalize";
import type { NormalizedListing, SourceStat } from "@/lib/scrapers/types";

export type RunScrapeOptions = {
  dryRun?: boolean;
  notify?: boolean;
};

export type RunScrapeResult = {
  totalFound: number;
  normalized: number;
  newCount: number;
  updatedCount: number;
  inactiveCount: number;
  sourceStats: SourceStat[];
  errors: Array<{ source: string; message: string }>;
  email: { sent: boolean; reason?: string };
};

export async function runScrape(options: RunScrapeOptions = {}): Promise<RunScrapeResult> {
  const dryRun = options.dryRun ?? false;
  const shouldNotify = options.notify ?? !dryRun;
  const sourceStats: SourceStat[] = [];
  const errors: Array<{ source: string; message: string }> = [];
  const newListingsForEmail: NormalizedListing[] = [];
  let totalFound = 0;
  let normalizedCount = 0;
  let newCount = 0;
  let updatedCount = 0;
  let inactiveCount = 0;

  const run = dryRun
    ? null
    : await prisma.scrapeRun.create({
        data: { status: "running" }
      });

  for (const source of scrapeSources) {
    const stat: SourceStat = {
      source: source.slug,
      sourceName: source.name,
      fetched: 0,
      normalized: 0,
      created: 0,
      updated: 0,
      inactive: 0
    };

    try {
      const rawListings = await source.scrape();
      stat.fetched = rawListings.length;
      totalFound += rawListings.length;

      const seenExternalIds = new Set<string>();
      for (const raw of rawListings) {
        const normalized = normalizeListing(raw);
        if (!normalized) continue;

        const listing = await ensureGeocode(normalized, dryRun);
        stat.normalized += 1;
        normalizedCount += 1;
        seenExternalIds.add(listing.externalId);

        if (dryRun) continue;

        const existing = await prisma.listing.findUnique({
          where: {
            source_externalId: {
              source: listing.source,
              externalId: listing.externalId
            }
          }
        });

        if (!existing) {
          await prisma.listing.create({
            data: toPrismaListing(listing)
          });
          stat.created += 1;
          newCount += 1;
          newListingsForEmail.push(listing);
        } else {
          const changed = existing.contentHash !== listing.contentHash;
          await prisma.listing.update({
            where: { id: existing.id },
            data: {
              ...toPrismaListing(listing),
              firstSeenAt: existing.firstSeenAt,
              notifiedAt: existing.notifiedAt,
              inactiveAt: null
            }
          });
          if (changed) {
            stat.updated += 1;
            updatedCount += 1;
          }
        }
      }

      if (!dryRun) {
        const stale = await prisma.listing.updateMany({
          where: {
            source: source.slug,
            inactiveAt: null,
            externalId: { notIn: [...seenExternalIds] }
          },
          data: {
            inactiveAt: new Date()
          }
        });
        stat.inactive += stale.count;
        inactiveCount += stale.count;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      stat.error = message;
      errors.push({ source: source.slug, message });
    }

    sourceStats.push(stat);
  }

  const email = shouldNotify ? await sendNewListingsDigest(newListingsForEmail) : { sent: false, reason: "disabled" };
  if (!dryRun && email.sent && newListingsForEmail.length) {
    await prisma.listing.updateMany({
      where: {
        OR: newListingsForEmail.map((listing) => ({
          source: listing.source,
          externalId: listing.externalId
        }))
      },
      data: { notifiedAt: new Date() }
    });
  }

  const status = errors.length === scrapeSources.length ? "failed" : errors.length ? "partial" : "success";
  const result: RunScrapeResult = {
    totalFound,
    normalized: normalizedCount,
    newCount,
    updatedCount,
    inactiveCount,
    sourceStats,
    errors,
    email
  };

  if (run) {
    await prisma.scrapeRun.update({
      where: { id: run.id },
      data: {
        status,
        finishedAt: new Date(),
        totalFound,
        newCount,
        updatedCount,
        inactiveCount,
        sourceStats: sourceStats as never,
        errors: errors as never
      }
    });
  }

  return result;
}

function toPrismaListing(listing: NormalizedListing) {
  return {
    source: listing.source,
    externalId: listing.externalId,
    title: listing.title,
    address: listing.address,
    neighborhood: listing.neighborhood,
    rent: listing.rent,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    sqft: listing.sqft,
    availableDate: listing.availableDate,
    url: listing.url,
    applyUrl: listing.applyUrl,
    contactEmail: listing.contactEmail,
    contactPhone: listing.contactPhone,
    imageUrls: listing.imageUrls,
    lat: listing.lat,
    lng: listing.lng,
    description: listing.description,
    contentHash: listing.contentHash,
    lastSeenAt: new Date()
  };
}

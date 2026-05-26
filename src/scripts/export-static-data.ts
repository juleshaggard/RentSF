import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import type { ListingDTO, ScrapeRunDTO } from "@/lib/types";

type ListingsPayload = {
  listings?: ListingDTO[];
};

const outputDir = path.join(process.cwd(), "public", "data");
const listingsOutputPath = path.join(outputDir, "listings.json");
const previousListingsPath = process.env.PREVIOUS_LISTINGS_PATH ?? listingsOutputPath;

async function main() {
  const previousListings = await readPreviousListings(previousListingsPath);
  const previousByKey = new Map(previousListings.map((listing) => [listingKey(listing), listing]));

  const [listings, runs] = await Promise.all([
    prisma.listing.findMany({
      where: { inactiveAt: null },
      orderBy: [{ firstSeenAt: "desc" }, { rent: "asc" }]
    }),
    prisma.scrapeRun.findMany({
      take: 12,
      orderBy: { startedAt: "desc" }
    })
  ]);

  const newListingCutoff = Date.now() - 1000 * 60 * 60 * 24;
  const listingPayload: ListingDTO[] = listings.map((listing) => {
    const previous = previousByKey.get(`${listing.source}:${listing.externalId}`);
    const firstSeenAt = previous?.firstSeenAt ?? listing.firstSeenAt.toISOString();

    return {
      id: previous?.id ?? listing.id,
      source: listing.source,
      externalId: listing.externalId,
      title: listing.title,
      address: listing.address,
      neighborhood: listing.neighborhood,
      rent: listing.rent,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      sqft: listing.sqft,
      availableDate: listing.availableDate?.toISOString() ?? null,
      url: listing.url,
      applyUrl: listing.applyUrl,
      contactEmail: listing.contactEmail,
      contactPhone: listing.contactPhone,
      imageUrls: asStringArray(listing.imageUrls),
      lat: listing.lat,
      lng: listing.lng,
      description: listing.description,
      firstSeenAt,
      lastSeenAt: listing.lastSeenAt.toISOString(),
      inactiveAt: listing.inactiveAt?.toISOString() ?? null,
      isNew: new Date(firstSeenAt).getTime() >= newListingCutoff
    };
  });

  const runPayload: ScrapeRunDTO[] = runs.map((run) => ({
    id: run.id,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt?.toISOString() ?? null,
    status: run.status,
    totalFound: run.totalFound,
    newCount: run.newCount,
    updatedCount: run.updatedCount,
    inactiveCount: run.inactiveCount,
    sourceStats: run.sourceStats,
    errors: run.errors
  }));

  await fs.mkdir(outputDir, { recursive: true });
  await Promise.all([
    fs.writeFile(
      listingsOutputPath,
      `${JSON.stringify({ generatedAt: new Date().toISOString(), listings: listingPayload }, null, 2)}\n`
    ),
    fs.writeFile(
      path.join(outputDir, "scrape-runs.json"),
      `${JSON.stringify({ generatedAt: new Date().toISOString(), runs: runPayload }, null, 2)}\n`
    )
  ]);

  console.log(`Exported ${listingPayload.length} listings and ${runPayload.length} scrape runs to public/data.`);
}

async function readPreviousListings(filePath: string): Promise<ListingDTO[]> {
  try {
    const payload = JSON.parse(await fs.readFile(filePath, "utf8")) as ListingsPayload;
    return Array.isArray(payload.listings) ? payload.listings : [];
  } catch {
    return [];
  }
}

function listingKey(listing: Pick<ListingDTO, "source" | "externalId">) {
  return `${listing.source}:${listing.externalId}`;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

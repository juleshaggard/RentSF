import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ListingDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const listings = await prisma.listing.findMany({
      where: { inactiveAt: null },
      orderBy: [{ firstSeenAt: "desc" }, { rent: "asc" }]
    });

    const newListingCutoff = Date.now() - 1000 * 60 * 60 * 24;
    const payload: ListingDTO[] = listings.map((listing) => ({
      id: listing.id,
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
      firstSeenAt: listing.firstSeenAt.toISOString(),
      lastSeenAt: listing.lastSeenAt.toISOString(),
      inactiveAt: listing.inactiveAt?.toISOString() ?? null,
      isNew: listing.firstSeenAt.getTime() >= newListingCutoff
    }));

    return NextResponse.json({ listings: payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ listings: [], error: message }, { status: 200 });
  }
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

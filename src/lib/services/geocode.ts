import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import type { NormalizedListing } from "@/lib/scrapers/types";

type GeocodeResult = {
  lat: number;
  lng: number;
  normalizedAddress?: string;
};

const SF_BOUNDS = {
  minLat: 37.6,
  maxLat: 37.84,
  minLng: -122.53,
  maxLng: -122.35
};

let lastNominatimRequestAt = 0;

export async function ensureGeocode(listing: NormalizedListing, dryRun = false): Promise<NormalizedListing> {
  if (isUsefulCoordinate(listing.lat, listing.lng)) {
    return listing;
  }

  const address = listing.address;
  if (!address || dryRun) {
    return listing;
  }

  const cached = await prisma.geocodeCache.findUnique({ where: { address } });
  if (cached) {
    return { ...listing, lat: cached.lat, lng: cached.lng };
  }

  const result = await geocodeAddress(address);
  if (!result) return listing;

  await prisma.geocodeCache.upsert({
    where: { address },
    update: {
      normalizedAddress: result.normalizedAddress ?? null,
      lat: result.lat,
      lng: result.lng
    },
    create: {
      address,
      normalizedAddress: result.normalizedAddress ?? null,
      lat: result.lat,
      lng: result.lng
    }
  });

  return { ...listing, lat: result.lat, lng: result.lng };
}

async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  await waitForNominatimRateLimit();

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", address);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "us");
  url.searchParams.set("viewbox", `${SF_BOUNDS.minLng},${SF_BOUNDS.maxLat},${SF_BOUNDS.maxLng},${SF_BOUNDS.minLat}`);
  url.searchParams.set("bounded", "1");
  if (env.NOMINATIM_EMAIL) {
    url.searchParams.set("email", env.NOMINATIM_EMAIL);
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent": env.NOMINATIM_USER_AGENT,
      Referer: env.PUBLIC_BASE_URL
    }
  });
  if (!response.ok) return null;
  const data = (await response.json()) as Array<{
    lat?: string;
    lon?: string;
    display_name?: string;
  }>;
  const feature = data[0];
  if (!feature?.lat || !feature.lon) return null;
  const lat = Number(feature.lat);
  const lng = Number(feature.lon);
  if (!isUsefulCoordinate(lat, lng)) return null;
  return { lat, lng, normalizedAddress: feature.display_name };
}

function isUsefulCoordinate(lat?: number | null, lng?: number | null): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    lat >= SF_BOUNDS.minLat &&
    lat <= SF_BOUNDS.maxLat &&
    lng >= SF_BOUNDS.minLng &&
    lng <= SF_BOUNDS.maxLng
  );
}

async function waitForNominatimRateLimit() {
  const elapsed = Date.now() - lastNominatimRequestAt;
  const waitMs = Math.max(0, 1100 - elapsed);
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  lastNominatimRequestAt = Date.now();
}

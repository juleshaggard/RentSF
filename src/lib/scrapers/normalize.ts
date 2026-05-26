import type { NormalizedListing, RawListing } from "./types";
import {
  cleanText,
  hashListing,
  parseBathrooms,
  parseBedrooms,
  parseSqft,
  unique
} from "./utils";

export function normalizeListing(raw: RawListing): NormalizedListing | null {
  const title = cleanText(raw.title);
  const description = cleanText(raw.description);
  const neighborhood = cleanText(raw.neighborhood) || null;
  const city = cleanText(raw.city) || inferCity(raw.address, raw.url);
  const address = normalizeAddress(raw.address, neighborhood);
  const textCorpus = [title, address, neighborhood, city, description].filter(Boolean).join(" ");

  if (!title || !raw.externalId || !isSanFrancisco(city, address, raw.url) || isCommercialListing(title)) {
    return null;
  }

  const bedrooms = raw.bedrooms ?? parseBedrooms(textCorpus);
  const bathrooms = raw.bathrooms ?? parseBathrooms(textCorpus);
  const sqft = raw.sqft ?? parseSqft(textCorpus);
  const imageUrls = unique(raw.imageUrls ?? []);
  const normalized: Omit<NormalizedListing, "contentHash"> = {
    source: raw.source,
    sourceName: raw.sourceName,
    externalId: cleanText(raw.externalId),
    title,
    address,
    city,
    neighborhood,
    rent: raw.rent ?? null,
    bedrooms,
    bathrooms: bathrooms ?? null,
    sqft: sqft ?? null,
    availableDate: raw.availableDate ?? null,
    url: raw.url,
    applyUrl: raw.applyUrl ?? null,
    contactEmail: raw.contactEmail ?? null,
    contactPhone: raw.contactPhone ?? null,
    imageUrls,
    lat: raw.lat ?? null,
    lng: raw.lng ?? null,
    description: description || null
  };

  return {
    ...normalized,
    contentHash: hashListing({
      title: normalized.title,
      address: normalized.address,
      rent: normalized.rent,
      bedrooms: normalized.bedrooms,
      bathrooms: normalized.bathrooms,
      sqft: normalized.sqft,
      availableDate: normalized.availableDate?.toISOString(),
      url: normalized.url,
      applyUrl: normalized.applyUrl,
      contactEmail: normalized.contactEmail,
      imageUrls: normalized.imageUrls,
      description: normalized.description
    })
  };
}

function normalizeAddress(address?: string | null, neighborhood?: string | null) {
  const clean = cleanText(address);
  if (clean) return clean;
  const hood = cleanText(neighborhood);
  return hood ? `${hood}, San Francisco, CA` : "San Francisco, CA";
}

function inferCity(address?: string | null, url?: string | null): string | null {
  const text = `${address ?? ""} ${url ?? ""}`.toLowerCase();
  return text.includes("san francisco") || text.includes("sf") ? "San Francisco" : null;
}

function isSanFrancisco(city: string | null, address: string, url: string) {
  if (city && !isSanFranciscoCity(city)) {
    return false;
  }

  const haystack = `${city ?? ""} ${address} ${url}`.toLowerCase();
  if (haystack.includes("south san francisco")) return false;
  return /\bsan francisco\b/.test(haystack) || /\b941[0-9]{2}\b/.test(haystack);
}

function isSanFranciscoCity(city: string) {
  return /^(?:san francisco|sf)(?:\b|,)/i.test(cleanText(city));
}

function isCommercialListing(title: string) {
  const text = title.toLowerCase();
  return (
    /\bcommercial\b/.test(text) ||
    /\bretail space\b/.test(text) ||
    /\boffice space\b/.test(text) ||
    /\boffices?\s+(?:available|space)\b/.test(text) ||
    /\bfull floor offices\b/.test(text)
  );
}

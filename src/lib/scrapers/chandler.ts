import * as cheerio from "cheerio";
import { fetchText } from "./http";
import type { RawListing, ScrapeSource } from "./types";
import {
  absoluteUrl,
  attr,
  cleanText,
  extractContactEmail,
  extractEmail,
  extractImageUrls,
  extractPhone,
  parseBathrooms,
  parseBedrooms,
  parseMoney,
  unique
} from "./utils";

const SOURCE_URL = "https://chandlerproperties.com/rental-listings/";
const CONTACT_EMAIL = "info@chandlerproperties.com";

export const chandlerSource: ScrapeSource = {
  slug: "chandler",
  name: "Chandler Properties",
  url: SOURCE_URL,
  contactEmail: CONTACT_EMAIL,
  scrape: async () => {
    const listings = parseChandlerListings(await fetchText(SOURCE_URL));
    return Promise.all(listings.map(enrichChandlerListing));
  }
};

export function parseChandlerListings(html: string): RawListing[] {
  const $ = cheerio.load(html);
  const listings: RawListing[] = [];

  $(".listing-item").each((_, element) => {
    const root = $(element);
    const detailsHref = attr(root.find('a[href*="lid="]').first(), "href");
    const detailUrl = absoluteUrl(SOURCE_URL, detailsHref) ?? SOURCE_URL;
    const uid = new URL(detailUrl).searchParams.get("lid") ?? detailsHref ?? cleanText(root.text());
    const description = cleanText(root.text());
    const img = root.find("img[data-src], img[src]").first();
    const imageUrl = attr(img, "data-src") ?? attr(img, "src");
    const applyUrl = absoluteUrl(SOURCE_URL, attr(root.find('a[href*="rental_applications"]').first(), "href"));

    listings.push({
      source: chandlerSource.slug,
      sourceName: chandlerSource.name,
      externalId: uid,
      title: cleanText(root.find(".address").text()),
      address: cleanText(root.find(".address").text()),
      city: "San Francisco",
      rent: parseMoney(root.find(".rent-price").text()),
      bedrooms: parseBedrooms(root.find(".beds").text()),
      bathrooms: parseBathrooms(root.find(".baths").text()),
      availableDate: parseAvailable(root.find(".lstng-avail").text()),
      url: detailUrl,
      applyUrl,
      contactEmail: extractEmail(description) ?? CONTACT_EMAIL,
      contactPhone: extractPhone(description),
      imageUrls: unique([absoluteUrl(SOURCE_URL, imageUrl)]),
      description
    });
  });

  return listings;
}

async function enrichChandlerListing(listing: RawListing): Promise<RawListing> {
  try {
    const html = await fetchText(listing.url);
    const $ = cheerio.load(html);
    const detailText = cleanText($.text());
    return {
      ...listing,
      contactEmail: extractContactEmail($, $.root(), detailText) ?? listing.contactEmail,
      contactPhone: extractPhone(detailText) ?? listing.contactPhone,
      imageUrls: unique([...(listing.imageUrls ?? []), ...extractImageUrls($, $.root(), listing.url)])
    };
  } catch {
    return listing;
  }
}

function parseAvailable(value: string): Date | null {
  const text = cleanText(value).toLowerCase();
  if (!text) return null;
  if (text.includes("now")) return new Date();
  const parsed = Date.parse(text.replace(/^available\s+/i, ""));
  return Number.isNaN(parsed) ? null : new Date(parsed);
}

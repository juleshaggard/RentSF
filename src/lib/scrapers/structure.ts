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
  parseSqft,
  unique
} from "./utils";

const SOURCE_URL = "https://showmojo.com/0538409020/l/Structure?sort_by=HIGHEST_RENT_FIRST";
const BASE_URL = "https://showmojo.com";
const CONTACT_EMAIL = "info@structureproperties.com";

export const structureSource: ScrapeSource = {
  slug: "structure",
  name: "Structure Properties",
  url: "https://structureproperties.com/available-rentals/",
  contactEmail: CONTACT_EMAIL,
  scrape: async () => {
    const listings = parseStructureListings(await fetchText(SOURCE_URL));
    return Promise.all(listings.map(enrichStructureListing));
  }
};

export function parseStructureListings(html: string): RawListing[] {
  const $ = cheerio.load(html);
  const listings: RawListing[] = [];

  $(".js-listing").each((_, element) => {
    const root = $(element);
    const uid = (attr(root, "id") ?? "").replace(/^uid_/, "");
    const cityZip = cleanText(root.find(".listing-city-state-zip").text());
    const street = cleanText(root.find(".listing-address-header").text());
    const title = cleanText(root.find(".listing-title").first().text());
    const details = cleanText(root.find(".listing-details").text());
    const scheduleHref = attr(root.find(".js-wsi-schedule-link").first(), "href");
    const iconText = cleanText(root.find(".listing-icons-data").text());
    const imageUrls = unique(
      root
        .find(".listing-pictures img")
        .map((_, img) => attr($(img), "src"))
        .get()
        .map((url) => absoluteUrl(BASE_URL, url))
    );

    listings.push({
      source: structureSource.slug,
      sourceName: structureSource.name,
      externalId: uid || scheduleHref || title,
      title,
      address: [street, cityZip].filter(Boolean).join(", "),
      city: cityZip.includes("San Francisco") ? "San Francisco" : null,
      rent: parseMoney(root.find(".price").text()),
      bedrooms: parseBedrooms(`Bed ${iconText} ${details}`),
      bathrooms: parseBathrooms(`Bath ${iconText} ${details}`),
      sqft: parseSqft(`${iconText} ${details}`),
      url: absoluteUrl(BASE_URL, scheduleHref) ?? structureSource.url,
      applyUrl: absoluteUrl(BASE_URL, scheduleHref),
      contactEmail: extractEmail(details) ?? CONTACT_EMAIL,
      contactPhone: extractPhone(details),
      imageUrls,
      lat: Number(attr(root, "data-lat")) || null,
      lng: Number(attr(root, "data-long")) || null,
      description: details
    });
  });

  return listings;
}

async function enrichStructureListing(listing: RawListing): Promise<RawListing> {
  try {
    const html = await fetchText(listing.url);
    const $ = cheerio.load(html);
    const detailText = cleanText($.text());
    return {
      ...listing,
      contactEmail: extractContactEmail($, $.root(), detailText) ?? listing.contactEmail,
      contactPhone: extractPhone(detailText) ?? listing.contactPhone,
      imageUrls: unique([...(listing.imageUrls ?? []), ...extractImageUrls($, $.root(), listing.url)]),
      description: listing.description || detailText
    };
  } catch {
    return listing;
  }
}

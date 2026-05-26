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

const SOURCE_URL = "https://jwavro.com/rental_list.php?hood=San%20Francisco";
const BASE_URL = "https://jwavro.com/";
const CONTACT_EMAIL = "info@jwavro.com";

export const jwavroSource: ScrapeSource = {
  slug: "j-wavro",
  name: "J. Wavro Associates",
  url: SOURCE_URL,
  contactEmail: CONTACT_EMAIL,
  scrape: async () => {
    const listings = parseJwavroListings(await fetchText(SOURCE_URL));
    return Promise.all(listings.map(enrichJwavroListing));
  }
};

export function parseJwavroListings(html: string): RawListing[] {
  const $ = cheerio.load(html);
  const listings: RawListing[] = [];

  $(".rental-card-link").each((_, element) => {
    const root = $(element);
    const href = attr(root, "href");
    const detailUrl = absoluteUrl(BASE_URL, href) ?? SOURCE_URL;
    const text = cleanText(root.text());
    const description = cleanText(root.find(".rental-card-description").text());
    const title = description || attr(root.find("img").first(), "alt") || text.slice(0, 120);

    listings.push({
      source: jwavroSource.slug,
      sourceName: jwavroSource.name,
      externalId: detailUrl.split("id=").pop() ?? detailUrl,
      title,
      address: `${cleanText(root.attr("data-neighborhood"))}, San Francisco, CA`,
      city: "San Francisco",
      neighborhood: cleanText(root.attr("data-neighborhood")),
      rent: parseMoney(root.attr("data-price") ?? text),
      bedrooms: parseBedrooms(`${root.attr("data-bedrooms")} BR`),
      bathrooms: parseBathrooms(text),
      url: detailUrl,
      contactEmail: extractEmail(text) ?? CONTACT_EMAIL,
      contactPhone: extractPhone(text),
      imageUrls: unique([absoluteUrl(BASE_URL, attr(root.find("img").first(), "src"))]),
      description: text
    });
  });

  return listings;
}

async function enrichJwavroListing(listing: RawListing): Promise<RawListing> {
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

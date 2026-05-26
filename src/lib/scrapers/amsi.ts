import * as cheerio from "cheerio";
import { fetchText } from "./http";
import type { RawListing, ScrapeSource } from "./types";
import {
  absoluteUrl,
  attr,
  cleanText,
  extractContactEmail,
  extractPhone,
  parseBathrooms,
  parseBedrooms,
  parseMoney,
  parseSqft,
  unique
} from "./utils";

const SOURCE_URL = "https://www.amsires.com/unfurnished-rentals-search";
const CONTACT_EMAIL = "rentals@amsires.com";

export const amsiSource: ScrapeSource = {
  slug: "amsi",
  name: "AMSI",
  url: SOURCE_URL,
  contactEmail: CONTACT_EMAIL,
  scrape: async () => parseAmsiListings(await fetchText(SOURCE_URL))
};

export function parseAmsiListings(html: string): RawListing[] {
  const $ = cheerio.load(html);
  const listings: RawListing[] = [];

  $(".listing-item, .map-item").each((_, element) => {
    const root = $(element);
    const href = attr(root.find('a[href*="listings/detail"], a.apm-view-details').first(), "href");
    const detailUrl = absoluteUrl(SOURCE_URL, href) ?? SOURCE_URL;
    const text = cleanText(root.text());
    const title = cleanText(root.find(".tagline, .address, h3").first().text()) || text.slice(0, 120);

    listings.push({
      source: amsiSource.slug,
      sourceName: amsiSource.name,
      externalId: detailUrl.split("/").pop() ?? title,
      title,
      address: cleanText(root.find(".address").text()),
      city: "San Francisco",
      rent: parseMoney(text),
      bedrooms: parseBedrooms(text),
      bathrooms: parseBathrooms(text),
      sqft: parseSqft(text),
      url: detailUrl,
      applyUrl: absoluteUrl(SOURCE_URL, attr(root.find(".apm-apply-now").first(), "href")),
      contactEmail: extractContactEmail($, root, text) ?? CONTACT_EMAIL,
      contactPhone: extractPhone(text),
      imageUrls: unique(
        root
          .find("[data-background-image], img")
          .map((_, image) => attr($(image), "data-background-image") ?? attr($(image), "src"))
          .get()
          .map((url) => absoluteUrl(SOURCE_URL, url))
      ),
      description: text
    });
  });

  return listings;
}

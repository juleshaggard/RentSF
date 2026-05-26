import * as cheerio from "cheerio";
import { fetchText } from "./http";
import type { RawListing, ScrapeSource } from "./types";
import {
  absoluteUrl,
  attr,
  cleanText,
  extractContactEmail,
  parseBathrooms,
  parseBedrooms,
  parseMoney,
  unique
} from "./utils";

const SOURCE_URL = "https://sfbayrentalco.com/available-residential-properties/";
const CONTACT_EMAIL = "info@sfbayrentalco.com";

export const sfBaySource: ScrapeSource = {
  slug: "sf-bay-rental-co",
  name: "SF Bay Rental Co.",
  url: SOURCE_URL,
  contactEmail: CONTACT_EMAIL,
  scrape: async () => {
    const pages: string[] = [];
    for (let page = 1; page <= 5; page += 1) {
      const url = page === 1 ? SOURCE_URL : `${SOURCE_URL}page/${page}/`;
      const html = await fetchText(url);
      pages.push(html);
      if (!html.includes('class="next page-numbers"')) break;
    }
    return pages.flatMap((html) => parseSfBayListings(html));
  }
};

export function parseSfBayListings(html: string): RawListing[] {
  const $ = cheerio.load(html);
  const listings: RawListing[] = [];

  $(".green-street-box").each((_, element) => {
    const root = $(element);
    const href = attr(root.find('a[href*="/property/"]').first(), "href");
    const detailUrl = absoluteUrl(SOURCE_URL, href) ?? SOURCE_URL;
    const title = cleanText(root.find(".green-street-text h3").first().text());
    const text = cleanText(root.text());
    const city = inferCity(title);

    listings.push({
      source: sfBaySource.slug,
      sourceName: sfBaySource.name,
      externalId: detailUrl,
      title,
      address: city === "San Francisco" ? `${title}, San Francisco, CA` : title,
      city,
      rent: parseMoney(root.find(".green-street-text h2").first().text()),
      bedrooms: parseBedrooms(text),
      bathrooms: parseBathrooms(text),
      url: detailUrl,
      contactEmail: extractContactEmail($, root, text) ?? CONTACT_EMAIL,
      imageUrls: unique(
        root
          .find("img[src]")
          .map((_, img) => attr($(img), "src"))
          .get()
          .filter((src) => !src.includes("icon"))
          .map((src) => absoluteUrl(SOURCE_URL, src))
      ),
      description: text
    });
  });

  return listings;
}

function inferCity(value: string) {
  const text = value.toLowerCase();
  if (text.includes("san francisco")) return "San Francisco";
  if (text.includes("oakland")) return "Oakland";
  if (text.includes("menlo park")) return "Menlo Park";
  if (text.includes("berkeley")) return "Berkeley";
  if (text.includes("alameda")) return "Alameda";
  if (text.includes("san mateo")) return "San Mateo";
  if (text.includes("daly city")) return "Daly City";
  return "San Francisco";
}

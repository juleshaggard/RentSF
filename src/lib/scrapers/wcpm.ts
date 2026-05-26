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
  parseJsonArrayLiteral,
  parseMoney,
  parseSqft,
  unique
} from "./utils";

const SOURCE_URL = "https://wcpm.appfolio.com/listings/listings?filters%5Bcity%5D=San+Francisco";
const BASE_URL = "https://wcpm.appfolio.com";
const CONTACT_EMAIL = "info@wcpm.com";

type WcpmMarker = {
  latitude: number;
  longitude: number;
  address: string;
  default_photo_url?: string;
  rent_range?: string;
  unit_specs?: string;
  listing_id: number;
  detail_page_url?: string;
};

export const wcpmSource: ScrapeSource = {
  slug: "wcpm",
  name: "WCPM",
  url: "https://wcpm.appfolio.com/listings/listings",
  contactEmail: CONTACT_EMAIL,
  scrape: async () => {
    const listings = parseWcpmListings(await fetchText(SOURCE_URL));
    return Promise.all(listings.map(enrichWcpmListing));
  }
};

export function parseWcpmListings(html: string): RawListing[] {
  const $ = cheerio.load(html);
  const markers = new Map(
    parseJsonArrayLiteral<WcpmMarker>(html, "markers:").map((marker) => [String(marker.listing_id), marker])
  );
  const listings: RawListing[] = [];

  $(".js-listing-item").each((_, element) => {
    const root = $(element);
    const listingId = (attr(root, "id") ?? "").replace(/^listing_/, "");
    const marker = markers.get(listingId);
    const titleAnchor = root.find(".js-listing-title a").first();
    const detailUrl = absoluteUrl(BASE_URL, attr(titleAnchor, "href")) ?? absoluteUrl(BASE_URL, marker?.detail_page_url) ?? wcpmSource.url;
    const externalId = detailUrl.split("/").pop() ?? listingId;
    const description = cleanText(root.find(".js-listing-description").text());
    const bedBath = cleanText(root.find(".js-listing-blurb-bed-bath, .detail-box__value").text());
    const image = attr(root.find(".js-listing-image").first(), "data-original") ?? marker?.default_photo_url;
    const applyUrl = absoluteUrl(BASE_URL, attr(root.find(".js-listing-apply").first(), "href"));

    listings.push({
      source: wcpmSource.slug,
      sourceName: wcpmSource.name,
      externalId,
      title: cleanText(titleAnchor.text()),
      address: cleanText(root.find(".js-listing-address").text()) || marker?.address,
      city: "San Francisco",
      rent: parseMoney(root.find(".js-listing-blurb-rent").text()) ?? parseMoney(marker?.rent_range),
      bedrooms: parseBedrooms(bedBath || marker?.unit_specs),
      bathrooms: parseBathrooms(bedBath || marker?.unit_specs),
      sqft: parseSqft(root.find(".js-listing-square-feet").text() || marker?.unit_specs),
      url: detailUrl,
      applyUrl,
      contactEmail: extractEmail(description) ?? CONTACT_EMAIL,
      contactPhone: extractPhone(description),
      imageUrls: unique([image]),
      lat: marker?.latitude ?? null,
      lng: marker?.longitude ?? null,
      description
    });
  });

  return listings;
}

async function enrichWcpmListing(listing: RawListing): Promise<RawListing> {
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

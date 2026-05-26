import * as cheerio from "cheerio";
import { describe, expect, it } from "vitest";
import { buildInquiryMailto } from "../src/lib/mailto";
import { getPetPolicy } from "../src/lib/pet-policy";
import { normalizeListing } from "../src/lib/scrapers/normalize";
import { extractContactEmail, extractEmail, parseBathrooms, parseBedrooms } from "../src/lib/scrapers/utils";
import type { RawListing } from "../src/lib/scrapers/types";

const baseRaw: RawListing = {
  source: "fixture",
  sourceName: "Fixture Source",
  externalId: "listing-1",
  title: "Bright 1 Bedroom in Lower Haight",
  address: "123 Page St, San Francisco, CA 94102",
  city: "San Francisco",
  rent: 2995,
  bedrooms: 1,
  bathrooms: 1,
  url: "https://example.com/listing-1"
};

describe("listing normalization", () => {
  it("keeps San Francisco listings across bedroom counts", () => {
    const listing = normalizeListing(baseRaw);
    const studio = normalizeListing({ ...baseRaw, externalId: "studio", bedrooms: 0, title: "Studio apartment" });
    const twoBedroom = normalizeListing({ ...baseRaw, externalId: "two-bed", bedrooms: 2, title: "Two bedroom flat" });

    expect(listing?.bedrooms).toBe(1);
    expect(studio?.bedrooms).toBe(0);
    expect(twoBedroom?.bedrooms).toBe(2);
    expect(listing?.city).toBe("San Francisco");
    expect(listing?.contentHash).toHaveLength(64);
  });

  it("infers bedrooms from clear listing text when structured data is missing", () => {
    const listing = normalizeListing({
      ...baseRaw,
      bedrooms: null,
      description: "Top floor two bedroom apartment with hardwood floors."
    });

    expect(listing?.bedrooms).toBe(2);
  });

  it("excludes non-SF listings", () => {
    expect(
      normalizeListing({
        ...baseRaw,
        address: "123 Grand Ave, Oakland, CA",
        city: "Oakland",
        url: "https://example.com/oakland"
      })
    ).toBeNull();
    expect(
      normalizeListing({
        ...baseRaw,
        title: "4256 Piedmont Ave #22, Oakland",
        address: "4256 Piedmont Ave #22, Oakland, San Francisco, CA",
        city: "Oakland"
      })
    ).toBeNull();
    expect(
      normalizeListing({
        ...baseRaw,
        title: "Ground Floor Retail Space on Grand Ave, South San Francisco",
        address: "Grand Ave, South San Francisco, CA",
        city: "South San Francisco"
      })
    ).toBeNull();
  });

  it("excludes commercial listings from broad source pages", () => {
    expect(
      normalizeListing({
        ...baseRaw,
        title: "Great Commercial Space on Market",
        bedrooms: null
      })
    ).toBeNull();
    expect(
      normalizeListing({
        ...baseRaw,
        title: "2 Bedroom with Home Office",
        bedrooms: 2
      })?.bedrooms
    ).toBe(2);
  });

  it("uses stable content hashes for unchanged listing content", () => {
    const first = normalizeListing(baseRaw);
    const second = normalizeListing({ ...baseRaw });
    const changed = normalizeListing({ ...baseRaw, rent: 3095 });

    expect(second?.contentHash).toBe(first?.contentHash);
    expect(changed?.contentHash).not.toBe(first?.contentHash);
  });
});

describe("field extraction helpers", () => {
  it("parses common bed and bath label formats", () => {
    expect(parseBedrooms("Bed: 1 Bath: 1")).toBe(1);
    expect(parseBedrooms("1BR / 1BA")).toBe(1);
    expect(parseBedrooms("1-bedroom apartment")).toBe(1);
    expect(parseBedrooms("Two bedroom flat")).toBe(2);
    expect(parseBedrooms("three-bedroom flat")).toBe(3);
    expect(parseBedrooms("Studio apartment")).toBe(0);
    expect(parseBathrooms("Baths: 1.5")).toBe(1.5);
  });

  it("skips placeholder emails before using source contact addresses", () => {
    expect(extractEmail("Example: user@example.com. Contact leasing@building.com")).toBe("leasing@building.com");
  });

  it("prefers listing agent mailto links over generic fallback text", () => {
    const $ = cheerio.load(`
      <section>
        <a href="mailto:info@jwavro.com">Contact office</a>
        <a href="mailto:oren@jwavro.com?subject=Interested%20in%20the%20listing">Email Agent</a>
        <p>Contact info@example.com for placeholders.</p>
      </section>
    `);

    expect(extractContactEmail($, $("section"), "Fallback info@jwavro.com")).toBe("oren@jwavro.com");
  });

  it("detects pet and cat friendly listing text", () => {
    expect(
      getPetPolicy({
        title: "Renovated 1BD",
        address: "123 Page St, San Francisco, CA",
        neighborhood: null,
        source: "fixture",
        description: "Pet-friendly building with laundry."
      })
    ).toEqual({ allowsAnimals: true, allowsCats: true });

    expect(
      getPetPolicy({
        title: "Sunny flat",
        address: "123 Page St, San Francisco, CA",
        neighborhood: null,
        source: "fixture",
        description: "Dogs ok, no cats."
      })
    ).toEqual({ allowsAnimals: true, allowsCats: false });

    expect(
      getPetPolicy({
        title: "Quiet apartment",
        address: "123 Page St, San Francisco, CA",
        neighborhood: null,
        source: "fixture",
        description: "Sorry, no pets."
      })
    ).toEqual({ allowsAnimals: false, allowsCats: false });
  });

  it("builds useful prefilled contact emails", () => {
    const mailto = buildInquiryMailto({
      contactEmail: "leasing@example.com",
      title: "Bright 2 Bedroom",
      address: "123 Page St, San Francisco, CA",
      bedrooms: 2,
      rent: 2995,
      url: "https://example.com/listing-1"
    });

    expect(mailto).toContain("mailto:leasing@example.com");
    expect(decodeURIComponent(mailto ?? "")).toContain("Viewing request for 123 Page St, San Francisco, CA");
    expect(decodeURIComponent(mailto ?? "")).toContain("Hi,\n\nI'm interested in the 2-bedroom at 123 Page St, San Francisco, CA");
    expect(decodeURIComponent(mailto ?? "")).toContain("Full address: 123 Page St, San Francisco, CA");
    expect(decodeURIComponent(mailto ?? "")).toContain("earliest showing time");
    expect(decodeURIComponent(mailto ?? "")).toContain("Rent: $2,995/mo");
  });
});

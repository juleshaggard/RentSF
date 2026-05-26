import { fetchJson } from "./http";
import type { RawListing, ScrapeSource } from "./types";
import { cleanText, parseMoney, unique } from "./utils";

const DATA_URL = "https://rentbt.com/wp-json/property-search/v1/data";
const CONTACT_EMAIL = "apartments@rentbt.com";

type BrickProperty = {
  propertyName: string;
  propertyId: string;
  address: string;
  city: string;
  state: string;
  zipcode: string;
  latitude?: string;
  longitude?: string;
  neighborhood?: string;
};

type BrickApartment = {
  id: string;
  propertyName: string;
  propertyId: string;
  floorplanName: string;
  apartmentName: string;
  apartmentId: string;
  beds: string;
  baths: string;
  minrent: string;
  maxrent: string;
  sqft?: string;
  apartmentImages?: string;
  applyOnlineURL?: string;
  description?: string;
};

type BrickResponse = {
  properties: BrickProperty[];
  apartments: BrickApartment[];
};

export const brickTimberSource: ScrapeSource = {
  slug: "brick-timber",
  name: "Brick + Timber",
  url: "https://rentbt.com/browse-apartments/",
  contactEmail: CONTACT_EMAIL,
  scrape: async () => parseBrickTimberListings(await fetchJson<BrickResponse>(DATA_URL))
};

export function parseBrickTimberListings(data: BrickResponse): RawListing[] {
  const properties = new Map(data.properties.map((property) => [property.propertyId, property]));

  return data.apartments
    .filter((apartment) => apartment.beds === "1")
    .map((apartment) => {
      const property = properties.get(apartment.propertyId);
      const images = safeImages(apartment.apartmentImages);
      const address = property
        ? `${property.address}${apartment.apartmentName ? ` #${apartment.apartmentName}` : ""}, ${property.city}, ${property.state} ${property.zipcode}`
        : apartment.propertyName;

      return {
        source: brickTimberSource.slug,
        sourceName: brickTimberSource.name,
        externalId: apartment.apartmentId || apartment.id,
        title: cleanText(`${apartment.propertyName} ${apartment.apartmentName} ${apartment.floorplanName}`),
        address,
        city: property?.city ?? null,
        neighborhood: property?.neighborhood ?? null,
        rent: parseMoney(apartment.minrent),
        bedrooms: Number(apartment.beds),
        bathrooms: Number(apartment.baths),
        sqft: apartment.sqft ? Number(apartment.sqft) : null,
        url: brickTimberSource.url,
        applyUrl: apartment.applyOnlineURL ?? null,
        contactEmail: CONTACT_EMAIL,
        imageUrls: images,
        lat: property?.latitude ? Number(property.latitude) : null,
        lng: property?.longitude ? Number(property.longitude) : null,
        description: cleanText(apartment.description)
      };
    });
}

function safeImages(value?: string): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as Array<{ imageURL?: string }>;
    return unique(parsed.map((image) => image.imageURL));
  } catch {
    return [];
  }
}

export type RawListing = {
  source: string;
  sourceName: string;
  externalId: string;
  title: string;
  address?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  rent?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  sqft?: number | null;
  availableDate?: Date | null;
  url: string;
  applyUrl?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  imageUrls?: string[];
  lat?: number | null;
  lng?: number | null;
  description?: string | null;
};

export type NormalizedListing = Required<
  Pick<RawListing, "source" | "sourceName" | "externalId" | "title" | "url">
> & {
  address: string;
  city: string | null;
  neighborhood: string | null;
  rent: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  availableDate: Date | null;
  applyUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  imageUrls: string[];
  lat: number | null;
  lng: number | null;
  description: string | null;
  contentHash: string;
};

export type ScrapeSource = {
  slug: string;
  name: string;
  url: string;
  contactEmail?: string;
  scrape: () => Promise<RawListing[]>;
};

export type SourceStat = {
  source: string;
  sourceName: string;
  fetched: number;
  normalized: number;
  created: number;
  updated: number;
  inactive: number;
  error?: string;
};

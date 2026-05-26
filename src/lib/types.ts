export type ListingDTO = {
  id: string;
  source: string;
  externalId: string;
  title: string;
  address: string;
  neighborhood: string | null;
  rent: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  availableDate: string | null;
  url: string;
  applyUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  imageUrls: string[];
  lat: number | null;
  lng: number | null;
  description: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  inactiveAt: string | null;
  isNew: boolean;
};

export type ScrapeRunDTO = {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  totalFound: number;
  newCount: number;
  updatedCount: number;
  inactiveCount: number;
  sourceStats: unknown;
  errors: unknown;
};

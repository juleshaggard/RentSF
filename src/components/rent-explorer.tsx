"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import clsx from "clsx";
import {
  ArrowUpDown,
  Bath,
  BedDouble,
  Calendar,
  Cat,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Home,
  Mail,
  MapPin,
  PawPrint,
  RefreshCw,
  Ruler,
  Search,
  SlidersHorizontal,
  X
} from "lucide-react";
import type { ListingDTO, ScrapeRunDTO } from "@/lib/types";
import { buildInquiryEmail } from "@/lib/mailto";
import { getPetPolicy } from "@/lib/pet-policy";
import { ListingMap } from "./rent-map";

type SortKey = "newest" | "price-asc" | "price-desc";
type BedroomFilter = "any" | "studio" | "1" | "2" | "3plus" | "unknown";

const STATIC_EXPORT = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function RentExplorer() {
  const [listings, setListings] = useState<ListingDTO[]>([]);
  const [runs, setRuns] = useState<ScrapeRunDTO[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [maxRent, setMaxRent] = useState("");
  const [bedroomFilter, setBedroomFilter] = useState<BedroomFilter>("any");
  const [sort, setSort] = useState<SortKey>("newest");
  const [animalsOnly, setAnimalsOnly] = useState(false);
  const [catsOnly, setCatsOnly] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const listingPath = STATIC_EXPORT ? "/data/listings.json" : "/api/listings";
      const runsPath = STATIC_EXPORT ? "/data/scrape-runs.json" : "/api/scrape-runs";
      const [listingResponse, runResponse] = await Promise.all([
        fetch(withBasePath(listingPath), { cache: "no-store" }),
        fetch(withBasePath(runsPath), { cache: "no-store" })
      ]);
      const listingData = (await listingResponse.json()) as { listings: ListingDTO[]; error?: string };
      const runData = (await runResponse.json()) as { runs: ScrapeRunDTO[]; error?: string };
      setListings(listingData.listings ?? []);
      setRuns(runData.runs ?? []);
      setError(friendlyError(listingData.error ?? runData.error));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const rentCap = maxRent ? Number(maxRent) : null;
    const next = listings.filter((listing) => {
      const matchesQuery =
        !normalizedQuery ||
        [listing.title, listing.address, listing.neighborhood, listing.source]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesRent = rentCap === null || !listing.rent || listing.rent <= rentCap;
      const matchesBedrooms = matchesBedroomFilter(listing, bedroomFilter);
      const petPolicy = getPetPolicy(listing);
      const matchesAnimals = !animalsOnly || petPolicy.allowsAnimals;
      const matchesCats = !catsOnly || petPolicy.allowsCats;
      return matchesQuery && matchesRent && matchesBedrooms && matchesAnimals && matchesCats;
    });

    next.sort((a, b) => {
      if (sort === "price-asc") return (a.rent ?? Number.MAX_SAFE_INTEGER) - (b.rent ?? Number.MAX_SAFE_INTEGER);
      if (sort === "price-desc") return (b.rent ?? 0) - (a.rent ?? 0);
      return new Date(b.firstSeenAt).getTime() - new Date(a.firstSeenAt).getTime();
    });

    return next;
  }, [animalsOnly, bedroomFilter, catsOnly, listings, maxRent, query, sort]);

  const selected = filtered.find((listing) => listing.id === selectedId) ?? filtered[0] ?? null;
  const detailListing = listings.find((listing) => listing.id === detailId) ?? null;
  const latestRun = runs[0];
  const pricedListings = filtered.filter((listing) => listing.rent);
  const averageRent = pricedListings.length
    ? Math.round(pricedListings.reduce((sum, listing) => sum + (listing.rent ?? 0), 0) / pricedListings.length)
    : null;
  const handleMapSelect = useCallback((id: string) => {
    setSelectedId(id);
    setDetailId(id);
  }, []);

  return (
    <main className="min-h-[100dvh] bg-paper text-ink lg:flex lg:h-[100dvh] lg:flex-col lg:overflow-hidden">
      <header className="sticky top-0 z-20 shrink-0 border-b border-line bg-paper/95 backdrop-blur lg:static">
        <div className="mx-auto flex max-w-[1680px] flex-col gap-4 px-4 py-4 lg:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="grid size-9 place-items-center rounded-full bg-coral text-sm font-black text-paper">RSF</div>
                <h1 className="text-2xl font-semibold tracking-normal">RentSF</h1>
              </div>
              <p className="mt-1 text-sm text-muted">
                {filtered.length} active listing{filtered.length === 1 ? "" : "s"}
                {averageRent ? ` · average $${averageRent.toLocaleString()}/mo` : ""}
                {latestRun?.finishedAt ? ` · updated ${formatRelative(latestRun.finishedAt)}` : ""}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {latestRun ? (
                <span
                  className={clsx(
                    "rounded-full border px-3 py-2 text-xs font-semibold",
                    latestRun.status === "success"
                      ? "border-teal/30 bg-teal/10 text-ink"
                      : "border-coral/30 bg-coral/10 text-ink"
                  )}
                >
                  {latestRun.status} · {latestRun.newCount} new
                </span>
              ) : null}
              <button
                className="inline-flex items-center gap-2 rounded-full border border-line bg-white/70 px-4 py-2 text-sm font-semibold shadow-airbnb transition active:scale-[0.98]"
                onClick={() => void loadData()}
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 lg:flex-row">
            <label className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={17} />
              <input
                className="h-12 w-full rounded-full border border-line bg-white/80 pl-11 pr-4 text-sm outline-none transition focus:border-ink"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Neighborhood, street, source"
              />
            </label>
            <label className="relative lg:w-[180px]">
              <SlidersHorizontal className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={17} />
              <input
                className="h-12 w-full rounded-full border border-line bg-white/80 pl-11 pr-4 text-sm outline-none transition focus:border-ink"
                value={maxRent}
                onChange={(event) => setMaxRent(event.target.value.replace(/[^0-9]/g, ""))}
                placeholder="Max rent"
                inputMode="numeric"
              />
            </label>
            <label className="relative lg:w-[170px]">
              <BedDouble className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={17} />
              <select
                className="h-12 w-full appearance-none rounded-full border border-line bg-white/80 pl-11 pr-4 text-sm outline-none transition focus:border-ink"
                value={bedroomFilter}
                onChange={(event) => setBedroomFilter(event.target.value as BedroomFilter)}
              >
                <option value="any">Any beds</option>
                <option value="studio">Studio</option>
                <option value="1">1 bed</option>
                <option value="2">2 beds</option>
                <option value="3plus">3+ beds</option>
                <option value="unknown">Beds unknown</option>
              </select>
            </label>
            <label className="relative lg:w-[160px]">
              <ArrowUpDown className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={17} />
              <select
                className="h-12 w-full appearance-none rounded-full border border-line bg-white/80 pl-11 pr-4 text-sm outline-none transition focus:border-ink"
                value={sort}
                onChange={(event) => setSort(event.target.value as SortKey)}
              >
                <option value="newest">Newest</option>
                <option value="price-asc">Price low</option>
                <option value="price-desc">Price high</option>
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2 lg:w-[292px]">
              <FilterToggle
                active={animalsOnly}
                icon={<PawPrint size={15} />}
                label="Animals ok"
                onClick={() => setAnimalsOnly((current) => !current)}
              />
              <FilterToggle
                active={catsOnly}
                icon={<Cat size={15} />}
                label="Cats ok"
                onClick={() => setCatsOnly((current) => !current)}
              />
            </div>
            <div className="grid grid-cols-2 rounded-full border border-line bg-white/80 p-1 lg:hidden">
              <button
                className={clsx("rounded-full px-4 py-2 text-sm font-semibold", mobileView === "list" && "bg-ink text-paper")}
                onClick={() => setMobileView("list")}
              >
                List
              </button>
              <button
                className={clsx("rounded-full px-4 py-2 text-sm font-semibold", mobileView === "map" && "bg-ink text-paper")}
                onClick={() => setMobileView("map")}
              >
                Map
              </button>
            </div>
          </div>

          {error ? (
            <div className="rounded-xl border border-coral/25 bg-coral/10 px-4 py-3 text-sm font-medium text-ink">
              {error}
            </div>
          ) : null}
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-[1680px] flex-1 grid-cols-1 gap-0 lg:min-h-0 lg:grid-cols-[minmax(520px,1fr)_520px]">
        <div className={clsx("h-[calc(100dvh-176px)] min-h-[520px] lg:h-full lg:min-h-0", mobileView === "list" && "hidden lg:block")}>
          <ListingMap
            listings={filtered}
            selectedId={selected?.id ?? null}
            hoveredId={hoveredId}
            onSelect={handleMapSelect}
          />
        </div>

        <aside className={clsx("border-l border-line bg-paper lg:min-h-0 lg:overflow-hidden", mobileView === "map" && "hidden lg:block")}>
          <div className="max-h-none overflow-y-auto lg:h-full">
            {loading ? (
              <ListingSkeleton />
            ) : filtered.length ? (
              <div className="divide-y divide-line">
                {filtered.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    selected={listing.id === selected?.id}
                    onHover={setHoveredId}
                    onSelect={setSelectedId}
                    onOpen={setDetailId}
                  />
                ))}
              </div>
            ) : (
              <div className="px-8 py-20">
                <div className="rounded-2xl border border-line bg-white/70 p-8 text-center shadow-airbnb">
                  <MapPin className="mx-auto text-coral" size={28} />
                  <h2 className="mt-4 text-lg font-semibold">No matching listings</h2>
                  <p className="mt-2 text-sm text-muted">Try clearing filters or run the scraper after adding environment credentials.</p>
                </div>
              </div>
            )}
          </div>
        </aside>
      </section>

      {detailListing ? <ListingDetailDrawer listing={detailListing} onClose={() => setDetailId(null)} /> : null}
    </main>
  );
}

function withBasePath(path: string) {
  return `${BASE_PATH}${path}`;
}

function ListingCard({
  listing,
  selected,
  onHover,
  onSelect,
  onOpen
}: {
  listing: ListingDTO;
  selected: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const emailDraft = buildInquiryEmail(listing);
  const petPolicy = getPetPolicy(listing);
  const image = listing.imageUrls[0];

  return (
    <article
      className={clsx(
        "group cursor-pointer px-4 py-5 transition md:px-6",
        selected ? "bg-white" : "bg-paper hover:bg-white/70"
      )}
      onMouseEnter={() => onHover(listing.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => {
        onSelect(listing.id);
        onOpen(listing.id);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-[168px_1fr]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-line">
          {image ? (
            <Image
              src={image}
              alt={listing.title}
              fill
              sizes="(min-width: 640px) 168px, 100vw"
              unoptimized
              className="object-cover transition duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="grid size-full place-items-center text-muted">
              <MapPin size={24} />
            </div>
          )}
          {listing.isNew ? (
            <span className="absolute left-3 top-3 rounded-full bg-coral px-2.5 py-1 text-xs font-bold text-paper">New</span>
          ) : null}
          {listing.imageUrls.length > 1 ? (
            <span className="absolute bottom-3 right-3 rounded-full bg-ink/80 px-2.5 py-1 text-xs font-bold text-paper">
              1 / {listing.imageUrls.length}
            </span>
          ) : null}
        </div>

        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="line-clamp-2 text-base font-semibold leading-snug">{listing.title}</h2>
              <p className="mt-1 line-clamp-1 text-sm text-muted">{listing.address}</p>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-lg font-bold">{listing.rent ? `$${listing.rent.toLocaleString()}` : "Ask"}</div>
              <div className="text-xs text-muted">per month</div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-ink">
            <Fact icon={<BedDouble size={14} />} label={bedroomLabel(listing.bedrooms)} />
            <Fact icon={<Bath size={14} />} label={listing.bathrooms ? `${listing.bathrooms} bath` : "bath n/a"} />
            {listing.sqft ? <Fact icon={<Ruler size={14} />} label={`${listing.sqft.toLocaleString()} sqft`} /> : null}
            {listing.availableDate ? <Fact icon={<Calendar size={14} />} label={formatDate(listing.availableDate)} /> : null}
            {petPolicy.allowsAnimals ? <Fact icon={<PawPrint size={14} />} label="Animals ok" /> : null}
            {petPolicy.allowsCats ? <Fact icon={<Cat size={14} />} label="Cats ok" /> : null}
          </div>

          <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted">{listing.description || listing.neighborhood || listing.source}</p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {emailDraft ? (
              <a
                className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper transition active:scale-[0.98]"
                href={emailDraft.mailto}
                onClick={(event) => {
                  event.stopPropagation();
                }}
              >
                <Mail size={15} />
                Email
              </a>
            ) : null}
            <a
              className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold transition active:scale-[0.98]"
              href={listing.url}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
            >
              <ExternalLink size={15} />
              View
            </a>
            {listing.applyUrl ? (
              <a
                className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold transition active:scale-[0.98]"
                href={listing.applyUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
              >
                Apply
              </a>
            ) : null}
            <span className="ml-auto rounded-full bg-white/70 px-3 py-2 text-xs font-semibold text-muted">{sourceLabel(listing.source)}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

function ListingDetailDrawer({ listing, onClose }: { listing: ListingDTO; onClose: () => void }) {
  const [imageIndex, setImageIndex] = useState(0);
  const emailDraft = buildInquiryEmail(listing);
  const petPolicy = getPetPolicy(listing);
  const images = listing.imageUrls;
  const image = images[imageIndex] ?? null;

  useEffect(() => {
    setImageIndex(0);
  }, [listing.id]);

  function moveImage(direction: -1 | 1) {
    if (!images.length) return;
    setImageIndex((current) => (current + direction + images.length) % images.length);
  }

  return (
    <div className="fixed inset-0 z-40 bg-ink/20" role="dialog" aria-modal="true">
      <button className="absolute inset-0 size-full cursor-default" type="button" onClick={onClose} aria-label="Close listing details" />
      <aside className="absolute bottom-0 right-0 top-auto flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-paper shadow-[0_28px_90px_rgba(43,40,38,0.28)] sm:bottom-4 sm:right-4 sm:top-4 sm:max-h-none sm:w-[460px] sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-muted">{sourceLabel(listing.source)}</span>
          <button
            className="grid size-9 place-items-center rounded-full border border-line bg-white text-ink transition active:scale-[0.96]"
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={17} />
          </button>
        </div>

        <div className="overflow-y-auto">
          <div className="relative aspect-[16/10] bg-line">
            {image ? (
              <Image
                src={image}
                alt={listing.title}
                fill
                sizes="(min-width: 640px) 460px, 100vw"
                unoptimized
                className="object-cover"
              />
            ) : (
              <div className="grid size-full place-items-center text-muted">
                <Home size={34} />
              </div>
            )}
            {listing.isNew ? (
              <span className="absolute left-4 top-4 rounded-full bg-coral px-3 py-1.5 text-xs font-bold text-paper">New</span>
            ) : null}
            {images.length > 1 ? (
              <>
                <button
                  className="absolute left-4 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-paper/95 text-ink shadow-airbnb transition active:scale-[0.96]"
                  type="button"
                  onClick={() => moveImage(-1)}
                  aria-label="Previous image"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  className="absolute right-4 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-paper/95 text-ink shadow-airbnb transition active:scale-[0.96]"
                  type="button"
                  onClick={() => moveImage(1)}
                  aria-label="Next image"
                >
                  <ChevronRight size={18} />
                </button>
                <span className="absolute bottom-4 right-4 rounded-full bg-ink/80 px-3 py-1.5 text-xs font-bold text-paper">
                  {imageIndex + 1} / {images.length}
                </span>
              </>
            ) : null}
          </div>

          <div className="space-y-5 p-5">
            <div>
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-2xl font-semibold leading-tight">{listing.title}</h2>
                <div className="shrink-0 text-right">
                  <div className="text-2xl font-bold">{listing.rent ? `$${listing.rent.toLocaleString()}` : "Ask"}</div>
                  <div className="text-xs text-muted">per month</div>
                </div>
              </div>
              <p className="mt-2 flex items-start gap-2 text-sm leading-6 text-muted">
                <MapPin className="mt-1 shrink-0" size={15} />
                {listing.address}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <Fact icon={<BedDouble size={14} />} label={bedroomLabel(listing.bedrooms)} />
              <Fact icon={<Bath size={14} />} label={listing.bathrooms ? `${listing.bathrooms} bath` : "bath n/a"} />
              {listing.sqft ? <Fact icon={<Ruler size={14} />} label={`${listing.sqft.toLocaleString()} sqft`} /> : null}
              {listing.availableDate ? <Fact icon={<Calendar size={14} />} label={formatDate(listing.availableDate)} /> : null}
              {petPolicy.allowsAnimals ? <Fact icon={<PawPrint size={14} />} label="Animals ok" /> : null}
              {petPolicy.allowsCats ? <Fact icon={<Cat size={14} />} label="Cats ok" /> : null}
            </div>

            {listing.description ? (
              <p className="text-sm leading-6 text-muted">{listing.description}</p>
            ) : (
              <p className="text-sm leading-6 text-muted">No long-form description was published for this listing.</p>
            )}

            <div className={clsx("grid gap-2", emailDraft ? "grid-cols-2" : "grid-cols-1")}>
              {emailDraft ? (
                <a
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-paper transition active:scale-[0.98]"
                  href={emailDraft.mailto}
                >
                  <Mail size={15} />
                  Mail
                </a>
              ) : null}
              <a
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-line bg-white px-5 text-sm font-semibold transition active:scale-[0.98]"
                href={listing.url}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={15} />
                View
              </a>
            </div>

            <div className="border-t border-line pt-4 text-xs text-muted">
              First seen {formatRelative(listing.firstSeenAt)} · last checked {formatRelative(listing.lastSeenAt)}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Fact({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5">
      {icon}
      {label}
    </span>
  );
}

function FilterToggle({
  active,
  icon,
  label,
  onClick
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={clsx(
        "inline-flex h-12 items-center justify-center gap-2 rounded-full border px-3 text-sm font-semibold transition active:scale-[0.98]",
        active
          ? "border-ink bg-ink text-paper"
          : "border-line bg-white/80 text-ink hover:bg-white"
      )}
      type="button"
      onClick={onClick}
    >
      {icon}
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

function ListingSkeleton() {
  return (
    <div className="divide-y divide-line">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="grid gap-4 px-6 py-5 sm:grid-cols-[168px_1fr]">
          <div className="aspect-[4/3] animate-pulse rounded-xl bg-line" />
          <div className="space-y-3">
            <div className="h-5 w-3/4 animate-pulse rounded bg-line" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-line" />
            <div className="h-4 w-full animate-pulse rounded bg-line" />
            <div className="h-10 w-44 animate-pulse rounded-full bg-line" />
          </div>
        </div>
      ))}
    </div>
  );
}

function sourceLabel(source: string) {
  return source
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function matchesBedroomFilter(listing: ListingDTO, filter: BedroomFilter) {
  const bedrooms = listing.bedrooms;
  if (filter === "any") return true;
  if (filter === "unknown") return bedrooms === null;
  if (filter === "studio") return bedrooms === 0;
  if (filter === "3plus") return bedrooms !== null && bedrooms >= 3;
  return bedrooms === Number(filter);
}

function bedroomLabel(value: number | null) {
  if (value === null) return "Beds n/a";
  if (value === 0) return "Studio";
  if (value === 1) return "1 bed";
  return `${formatBedroomNumber(value)} beds`;
}

function formatBedroomNumber(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value));
}

function formatRelative(value: string) {
  const delta = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(delta / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function friendlyError(message?: string) {
  if (!message) return null;
  if (message.includes("Can't reach database server")) {
    return "Database unavailable. Run npm run db:migrate or update DATABASE_URL, then refresh.";
  }
  return message;
}

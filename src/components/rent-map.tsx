"use client";

import { useEffect, useMemo, useRef } from "react";
import type { DivIcon, Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import type { ListingDTO } from "@/lib/types";

type ListingMapProps = {
  listings: ListingDTO[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
};

export function ListingMap({ listings, selectedId, hoveredId, onSelect }: ListingMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Map<string, LeafletMarker>>(new Map());
  const hasFitBoundsRef = useRef(false);
  const mappableListings = useMemo(
    () => listings.filter((listing) => typeof listing.lat === "number" && typeof listing.lng === "number"),
    [listings]
  );
  const mappableKey = useMemo(
    () => mappableListings.map((listing) => `${listing.id}:${listing.lat}:${listing.lng}:${listing.rent ?? "ask"}`).join("|"),
    [mappableListings]
  );

  useEffect(() => {
    let cancelled = false;
    const markers = markersRef.current;

    async function loadMap() {
      if (!containerRef.current || mapRef.current) return;
      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        center: [37.771, -122.431],
        zoom: 12,
        zoomControl: false,
        attributionControl: true
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      mapRef.current = map;
    }

    void loadMap();

    return () => {
      cancelled = true;
      markers.forEach((marker) => marker.remove());
      markers.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function renderMarkers() {
      const map = mapRef.current;
      if (!map) return;
      const L = await import("leaflet");
      if (cancelled) return;

      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();

      mappableListings.forEach((listing) => {
        const lat = listing.lat as number;
        const lng = listing.lng as number;
        const icon = priceIcon(L, listing, false);
        const marker = L.marker([lat, lng], { icon })
          .addTo(map)
          .on("click", () => onSelect(listing.id));
        markersRef.current.set(listing.id, marker);
      });

      const bounds = L.latLngBounds(mappableListings.map((listing) => [listing.lat as number, listing.lng as number]));
      if (!hasFitBoundsRef.current && bounds.isValid()) {
        map.fitBounds(bounds, { padding: [70, 70], maxZoom: 14, animate: true, duration: 0.6 });
        hasFitBoundsRef.current = true;
      }
    }

    void renderMarkers();
    return () => {
      cancelled = true;
    };
  }, [mappableKey, mappableListings, onSelect]);

  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const markerElement = marker.getElement()?.querySelector(".price-marker") as HTMLElement | null;
      if (markerElement) {
        markerElement.dataset.active = String(id === selectedId || id === hoveredId);
      }
    });
  }, [hoveredId, selectedId]);

  return (
    <div className="relative size-full overflow-hidden bg-[oklch(94%_0.012_75)]">
      <div ref={containerRef} className="size-full" />
      {!mappableListings.length ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center px-6">
          <div className="max-w-sm rounded-2xl border border-line bg-white/85 p-6 text-center shadow-airbnb backdrop-blur">
            <h2 className="text-lg font-semibold">No mapped listings yet</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Run the scraper to geocode listings and fill the map.</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function priceIcon(
  L: typeof import("leaflet"),
  listing: ListingDTO,
  active: boolean
): DivIcon {
  return L.divIcon({
    className: "",
    html: `<button class="price-marker" data-active="${active}" type="button">${listing.rent ? `$${compactPrice(listing.rent)}` : "Ask"}</button>`,
    iconAnchor: [24, 34]
  });
}

function compactPrice(value: number) {
  if (value >= 1000) {
    return `${Math.round(value / 100) / 10}k`;
  }
  return value.toLocaleString();
}

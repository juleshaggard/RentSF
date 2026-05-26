# RentSF

Hourly scraper and Airbnb-style map UI for San Francisco rentals.

This version runs without Docker, Postgres, or Mapbox:

- SQLite stores listings in `prisma/dev.db`.
- Leaflet + OpenStreetMap render the map with no API key.
- Nominatim geocodes uncached addresses at a polite 1 request/second.
- Resend still sends new-listing digests when configured.

## Local Setup

1. Copy `.env.example` to `.env` and fill in `RESEND_API_KEY`, `ALERT_FROM`, and `ADMIN_TOKEN`.
2. Install dependencies and create the SQLite database:

```bash
npm install
npm run db:generate
npm run db:migrate
```

3. Run one scrape:

```bash
npm run scrape:once
```

4. Start the web app:

```bash
npm run dev
```

5. In a second terminal, run the hourly worker:

```bash
npm run worker
```

The app is available at `http://localhost:3000`.

## Useful Commands

```bash
npm run scrape:once -- --dry-run
curl -X POST http://localhost:3000/api/admin/scrape -H "x-admin-token: $ADMIN_TOKEN"
```

Public Nominatim requires a descriptive `NOMINATIM_USER_AGENT`, clear OpenStreetMap attribution, and no heavy usage. RentSF caches geocodes and rate-limits requests accordingly.

## GitHub Pages

This repo includes a GitHub Actions Pages workflow. On pushes to `main`, manual dispatches, and an hourly schedule, it:

1. Creates a fresh SQLite database in the runner.
2. Scrapes the rental sources without sending email.
3. Exports active listings to `public/data/listings.json`.
4. Builds a static Next.js export and deploys `out/` to GitHub Pages.

GitHub Pages is static hosting, so the deployed site reads JSON snapshots instead of live API routes. The local app still uses the API routes, SQLite, the manual scrape endpoint, and the hourly worker.

To build the Pages version locally:

```bash
DATABASE_URL=file:./dev.db NEXT_PUBLIC_BASE_PATH=/RentSF npm run export:static-data
DATABASE_URL=file:./dev.db NEXT_PUBLIC_BASE_PATH=/RentSF npm run build:pages
```

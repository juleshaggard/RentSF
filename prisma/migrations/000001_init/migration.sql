-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "neighborhood" TEXT,
    "rent" INTEGER,
    "bedrooms" REAL,
    "bathrooms" REAL,
    "sqft" INTEGER,
    "availableDate" DATETIME,
    "url" TEXT NOT NULL,
    "applyUrl" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "imageUrls" JSONB NOT NULL DEFAULT [],
    "lat" REAL,
    "lng" REAL,
    "description" TEXT,
    "contentHash" TEXT NOT NULL,
    "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inactiveAt" DATETIME,
    "notifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ScrapeRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "status" TEXT NOT NULL,
    "totalFound" INTEGER NOT NULL DEFAULT 0,
    "newCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "inactiveCount" INTEGER NOT NULL DEFAULT 0,
    "sourceStats" JSONB,
    "errors" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "GeocodeCache" (
    "address" TEXT NOT NULL PRIMARY KEY,
    "normalizedAddress" TEXT,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Listing_inactiveAt_firstSeenAt_idx" ON "Listing"("inactiveAt", "firstSeenAt");

-- CreateIndex
CREATE INDEX "Listing_source_idx" ON "Listing"("source");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_source_externalId_key" ON "Listing"("source", "externalId");

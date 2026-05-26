import { amsiSource } from "./amsi";
import { brickTimberSource } from "./brick-timber";
import { chandlerSource } from "./chandler";
import { jwavroSource } from "./jwavro";
import { sfBaySource } from "./sfbay";
import { structureSource } from "./structure";
import type { ScrapeSource } from "./types";
import { wcpmSource } from "./wcpm";

export const scrapeSources: ScrapeSource[] = [
  chandlerSource,
  structureSource,
  amsiSource,
  brickTimberSource,
  wcpmSource,
  sfBaySource,
  jwavroSource
];

export const sourceEmailFallbacks = new Map(scrapeSources.map((source) => [source.slug, source.contactEmail ?? null]));

import cron from "node-cron";
import { env } from "@/lib/env";
import { runScrape } from "@/lib/scrapeRunner";

async function scrapeWithLogging() {
  const startedAt = new Date().toISOString();
  console.log(`[worker] scrape started ${startedAt}`);
  try {
    const result = await runScrape();
    console.log(`[worker] scrape finished ${JSON.stringify(result)}`);
  } catch (error) {
    console.error("[worker] scrape failed", error);
  }
}

void scrapeWithLogging();

cron.schedule(env.SCRAPE_CRON, () => {
  void scrapeWithLogging();
});

console.log(`[worker] scheduled with cron "${env.SCRAPE_CRON}"`);

import { runScrape } from "@/lib/scrapeRunner";

const dryRun = process.argv.includes("--dry-run");
const noNotify = process.argv.includes("--no-notify");

runScrape({ dryRun, notify: !noNotify && !dryRun })
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

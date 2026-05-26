import fs from "node:fs";
import path from "node:path";

const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";

if (databaseUrl.startsWith("file:")) {
  const rawPath = databaseUrl.slice("file:".length).split("?")[0];
  const dbPath = path.isAbsolute(rawPath)
    ? rawPath
    : path.resolve(process.cwd(), "prisma", rawPath);

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.closeSync(fs.openSync(dbPath, "a"));
}

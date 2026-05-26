import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  ALERT_FROM: z.string().optional(),
  ALERT_RECIPIENT: z.string().email().default("hello@haggard.design"),
  NOMINATIM_USER_AGENT: z.string().default("RentSF/0.1 (hello@haggard.design)"),
  NOMINATIM_EMAIL: z.string().email().optional(),
  ADMIN_TOKEN: z.string().optional(),
  PUBLIC_BASE_URL: z.string().url().default("http://localhost:3000"),
  SCRAPE_CRON: z.string().default("0 * * * *")
});

export const env = envSchema.parse(process.env);

import crypto from "node:crypto";
import type { Cheerio, CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";

export function cleanText(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function absoluteUrl(base: string, href?: string | null): string | null {
  if (!href) return null;
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

export function attr($el: Cheerio<AnyNode>, name: string): string | null {
  return $el.attr(name) ?? null;
}

export function firstText($: CheerioAPI, root: Cheerio<AnyNode>, selectors: string[]): string {
  for (const selector of selectors) {
    const value = cleanText(root.find(selector).first().text());
    if (value) return value;
  }
  return cleanText(root.text());
}

export function parseMoney(value: string | null | undefined): number | null {
  const text = cleanText(value);
  const dollarMatch = text.match(/\$\s*([0-9][0-9,]{2,})(?:\.\d{2})?/);
  const match = dollarMatch ?? text.match(/\b([0-9][0-9,]{2,})(?:\.\d{2})?\b/);
  if (!match) return null;
  return Number(match[1].replaceAll(",", ""));
}

export function parseNumber(value: string | null | undefined): number | null {
  const match = cleanText(value).match(/([0-9]+(?:\.[0-9]+)?)/);
  return match ? Number(match[1]) : null;
}

export function parseBedrooms(value: string | null | undefined): number | null {
  const text = cleanText(value).toLowerCase();
  if (!text) return null;
  if (/\bstudio\b/.test(text)) return 0;
  if (/\bone\s+(?:bed|bedroom|br)\b/.test(text)) return 1;

  const match =
    text.match(/\b([0-9]+(?:\.[0-9]+)?)\s*\+?\s*(?:bd|bed|beds|br|bedroom|bedrooms)\b/) ??
    text.match(/\b(?:bd|bed|beds|br|bedroom|bedrooms)\s*:?\s*([0-9]+(?:\.[0-9]+)?)/);
  return match ? Number(match[1]) : null;
}

export function parseBathrooms(value: string | null | undefined): number | null {
  const text = cleanText(value).toLowerCase();
  const match =
    text.match(/\b([0-9]+(?:\.[0-9]+)?)\s*(?:ba|bath|baths|bathroom|bathrooms)\b/) ??
    text.match(/\b(?:ba|bath|baths|bathroom|bathrooms)\s*:?\s*([0-9]+(?:\.[0-9]+)?)/);
  return match ? Number(match[1]) : null;
}

export function parseSqft(value: string | null | undefined): number | null {
  const text = cleanText(value).toLowerCase();
  const match = text.match(/\b([0-9][0-9,]{1,})\s*(?:sq\.?\s*ft|sqft|sf)\b/);
  return match ? Number(match[1].replaceAll(",", "")) : null;
}

export function extractEmail(value: string | null | undefined): string | null {
  const matches = cleanText(value).matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi);
  for (const match of matches) {
    const email = normalizeEmailCandidate(match[0]);
    if (email) return email;
  }
  return null;
}

export function extractContactEmail(
  $: CheerioAPI,
  root: Cheerio<AnyNode>,
  fallbackText?: string | null
): string | null {
  const candidates: Array<{ email: string; priority: number }> = [];
  const rootEmail = extractMailtoEmail(attr(root, "href"));
  if (rootEmail) candidates.push({ email: rootEmail, priority: contactEmailPriority(root.text()) });

  root.find("a[href]").each((_, element) => {
    const link = $(element);
    const email = extractMailtoEmail(attr(link, "href"));
    if (!email) return;

    const context = [link.text(), attr(link, "class"), attr(link.parent(), "class")].filter(Boolean).join(" ");
    candidates.push({ email, priority: contactEmailPriority(context) });
  });

  if (candidates.length > 0) {
    return candidates.sort((first, second) => second.priority - first.priority)[0]?.email ?? null;
  }

  return extractEmail(fallbackText ?? root.text());
}

export function extractPhone(value: string | null | undefined): string | null {
  const match = cleanText(value).match(/(?:\+?1[\s.-]?)?\(?[2-9][0-9]{2}\)?[\s.-]?[0-9]{3}[\s.-]?[0-9]{4}/);
  return match ? match[0] : null;
}

export function extractImageUrls($: CheerioAPI, root: Cheerio<AnyNode>, baseUrl: string): string[] {
  const values: Array<string | null | undefined> = [];

  root.find("img, a, source, [data-src], [data-href], [data-original], [style]").each((_, element) => {
    const node = $(element);
    values.push(
      attr(node, "data-href"),
      attr(node, "data-src"),
      attr(node, "data-original"),
      attr(node, "srcset")?.split(",")[0]?.trim().split(/\s+/)[0],
      attr(node, "src"),
      attr(node, "href")
    );

    const style = attr(node, "style");
    const styleUrl = style?.match(/url\((['"]?)(.*?)\1\)/i)?.[2];
    values.push(styleUrl);
  });

  return unique(
    values
      .map((value) => absoluteUrl(baseUrl, value))
      .filter((value): value is string => Boolean(value))
      .filter(isLikelyListingImage)
      .map(preferLargeImage)
  );
}

export function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

export function hashListing(input: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export function parseJsonArrayLiteral<T>(html: string, prefix: string): T[] {
  const start = html.indexOf(prefix);
  if (start === -1) return [];
  const arrayStart = html.indexOf("[", start);
  if (arrayStart === -1) return [];

  let depth = 0;
  for (let i = arrayStart; i < html.length; i += 1) {
    const char = html[i];
    if (char === "[") depth += 1;
    if (char === "]") depth -= 1;
    if (depth === 0) {
      try {
        return JSON.parse(html.slice(arrayStart, i + 1)) as T[];
      } catch {
        return [];
      }
    }
  }

  return [];
}

function isLikelyListingImage(value: string) {
  const url = value.toLowerCase();
  if (url.startsWith("data:")) return false;
  if (url.includes("logo")) return false;
  if (url.includes("icon")) return false;
  if (url.includes("sprite")) return false;
  if (url.includes("hudimg") || url.includes("jwavro_word")) return false;
  if (url.includes("googletagmanager")) return false;
  if (url.includes("google.com/maps")) return false;
  if (url.includes("appfolio_touch") || url.includes("appfolio_startup")) return false;
  if (url.endsWith(".svg")) return false;

  return (
    /\.(?:jpg|jpeg|png|webp|gif)(?:[?#].*)?$/i.test(value) ||
    url.includes("images.cdn.appfolio.com") ||
    url.includes("static.letsrent.com") ||
    url.includes("s3.amazonaws.com/showmojo") ||
    url.includes("showmojo-dev") ||
    url.includes("/wp-content/uploads/")
  );
}

function preferLargeImage(value: string) {
  return value.replace("/medium.", "/large.").replace("/standard/", "/large/");
}

function extractMailtoEmail(href: string | null | undefined) {
  const value = cleanText(href);
  if (!value.toLowerCase().startsWith("mailto:")) return null;

  const rawAddress = value.replace(/^mailto:/i, "").split("?")[0].split(/[;,]/)[0];
  try {
    return normalizeEmailCandidate(decodeURIComponent(rawAddress));
  } catch {
    return normalizeEmailCandidate(rawAddress);
  }
}

function normalizeEmailCandidate(value: string | null | undefined) {
  const match = cleanText(value).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (!match) return null;

  const email = match[0].replace(/[.,;:)]+$/, "");
  return isPlaceholderEmail(email) ? null : email;
}

function contactEmailPriority(value: string) {
  const text = cleanText(value).toLowerCase();
  if (/\b(?:email\s+agent|agent|leasing\s+agent|property\s+manager|showing\s+agent)\b/.test(text)) return 2;
  if (/\b(?:leasing|showing|tour|schedule)\b/.test(text)) return 1;
  return 0;
}

function isPlaceholderEmail(value: string) {
  const domain = value.toLowerCase().split("@")[1] ?? "";
  return ["example.com", "example.org", "example.net", "test.com", "email.com"].includes(domain);
}

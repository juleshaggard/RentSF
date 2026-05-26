import { Resend } from "resend";
import { env } from "@/lib/env";
import type { NormalizedListing } from "@/lib/scrapers/types";
export { buildInquiryMailto as buildMailto } from "@/lib/mailto";

export async function sendNewListingsDigest(listings: NormalizedListing[]) {
  if (!listings.length) return { sent: false, reason: "no-listings" };
  if (!env.RESEND_API_KEY || !env.ALERT_FROM) {
    return { sent: false, reason: "missing-email-config" };
  }

  const resend = new Resend(env.RESEND_API_KEY);
  const subject = `${listings.length} new SF 1-bedroom ${listings.length === 1 ? "rental" : "rentals"}`;

  await resend.emails.send({
    from: env.ALERT_FROM,
    to: env.ALERT_RECIPIENT,
    subject,
    html: renderDigestHtml(listings),
    text: renderDigestText(listings)
  });

  return { sent: true };
}

function renderDigestHtml(listings: NormalizedListing[]) {
  const items = listings
    .map(
      (listing) => `
        <tr>
          <td style="padding:18px 0;border-bottom:1px solid #ece7e0;">
            <div style="font-size:18px;font-weight:700;color:#2b2826;">${escapeHtml(listing.title)}</div>
            <div style="margin-top:4px;color:#625d57;">${escapeHtml(listing.address)}</div>
            <div style="margin-top:8px;color:#2b2826;">${listing.rent ? `$${listing.rent.toLocaleString()}/mo` : "Rent not listed"} · ${listing.bathrooms ?? "?"} bath</div>
            <div style="margin-top:12px;">
              <a href="${listing.url}" style="color:#d84a3a;text-decoration:none;font-weight:700;">View listing</a>
            </div>
          </td>
        </tr>
      `
    )
    .join("");

  return `
    <div style="background:#fbfaf7;padding:28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <div style="max-width:680px;margin:0 auto;background:#fffdf9;border:1px solid #ece7e0;border-radius:18px;padding:28px;">
        <h1 style="margin:0 0 8px;color:#2b2826;font-size:26px;">New SF 1-bedroom rentals</h1>
        <p style="margin:0;color:#625d57;">Fresh listings from the hourly RentSF scrape.</p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;">${items}</table>
      </div>
    </div>
  `;
}

function renderDigestText(listings: NormalizedListing[]) {
  return listings
    .map((listing) => {
      return [
        listing.title,
        listing.address,
        listing.rent ? `$${listing.rent.toLocaleString()}/mo` : "Rent not listed",
        listing.url
      ].join("\n");
    })
    .join("\n\n");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

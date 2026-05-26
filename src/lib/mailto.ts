export type InquiryEmail = {
  to: string;
  subject: string;
  body: string;
  mailto: string;
  gmailUrl: string;
  clipboardText: string;
};

export function buildInquiryEmail(listing: {
  contactEmail: string | null;
  title: string;
  address: string;
  rent: number | null;
  url: string;
}): InquiryEmail | null {
  if (!listing.contactEmail) return null;
  const address = listing.address || listing.title;
  const subject = `Viewing request for ${address}`;
  const body = [
    "Hi,",
    "",
    `I'm interested in the 1-bedroom at ${address}. It looks like it could be a good fit, and I'd love to come see it if it's still available.`,
    "",
    `Listing: ${listing.title}`,
    listing.address ? `Full address: ${listing.address}` : null,
    listing.rent ? `Rent: $${listing.rent.toLocaleString()}/mo` : null,
    `Link: ${listing.url}`,
    "",
    "Could you let me know the earliest showing time that works, and if there is anything you would like me to send over before viewing?",
    "",
    "Thanks!"
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  const to = listing.contactEmail;
  const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const clipboardText = [`To: ${to}`, `Subject: ${subject}`, "", body].join("\n");

  return { to, subject, body, mailto, gmailUrl, clipboardText };
}

export function buildInquiryMailto(listing: Parameters<typeof buildInquiryEmail>[0]) {
  return buildInquiryEmail(listing)?.mailto ?? null;
}

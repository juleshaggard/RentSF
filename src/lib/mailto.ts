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
  const subject = `Interested in ${listing.address || listing.title}`;
  const body = [
    "Hi,",
    "",
    `I saw this listing and would love to schedule a viewing: ${listing.title}`,
    listing.address ? `Address: ${listing.address}` : null,
    listing.rent ? `Rent: $${listing.rent.toLocaleString()}/mo` : null,
    `Listing: ${listing.url}`,
    "",
    "Could you let me know the next available showing time?",
    "",
    "Thank you"
  ]
    .filter(Boolean)
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

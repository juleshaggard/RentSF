import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RentSF",
  description: "Hourly San Francisco rental scraper and map."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

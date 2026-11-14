import type { Metadata, Viewport } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ayala: practice what to say to your toddler",
  description:
    "Parenting advice is easy to read. Practice what to say before the hardest five minutes of your day.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#F2F0E4" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <SiteHeader />
        <main className="mx-auto max-w-5xl px-5 pb-10">{children}</main>
        <footer className="mx-auto max-w-5xl px-5 pb-8 text-center text-xs text-muted">
          Practice tool. Not medical or psychological advice. Feedback is based on{" "}
          <a className="underline underline-offset-2" href="https://www.cdc.gov/parenting-toddlers/site.html" target="_blank" rel="noreferrer">
            CDC parenting guidance
          </a>
          . No account: your practice stays in this browser.
        </footer>
      </body>
    </html>
  );
}

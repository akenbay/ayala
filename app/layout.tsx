import type { Metadata, Viewport } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ayala: practice what to say to your toddler",
  description:
    "Parenting advice is easy to read. Practice what to say before the hardest five minutes of your day.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#FFFAF0" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&family=Fraunces:opsz,wght@9..144,600&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <SiteHeader />
        <main className="mx-auto max-w-5xl px-5 pb-10">{children}</main>
        <footer className="mx-auto max-w-5xl space-y-1 px-5 pb-8 text-center text-xs text-muted">
          <p>Ayala offers parenting practice, not medical or mental-health advice. Feedback is based on{" "}
          <a className="underline underline-offset-2" href="https://www.cdc.gov/parenting-toddlers/site.html" target="_blank" rel="noreferrer">
            CDC parenting guidance
          </a>
          ; it is our interpretation, not a CDC assessment.</p>
          <p>No account. Your practice history stays in this browser. What you type is sent to our server and our AI provider only to score it and write Sam&apos;s replies, and is not stored on our server.</p>
        </footer>
      </body>
    </html>
  );
}

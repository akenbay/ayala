import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ayala: practice what to say to your toddler",
  description:
    "Parenting advice is easy to read. Practice what to say before the hardest five minutes of your day.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#fbf8f3" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <header className="sticky top-0 z-20 border-b border-line bg-cream/90 backdrop-blur">
          <nav className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span aria-hidden className="grid h-7 w-7 place-items-center rounded-lg bg-calm text-sm text-white">C</span>
              Ayala
            </Link>
            <div className="flex items-center gap-1 text-sm">
              <Link href="/" className="rounded-lg px-3 py-2 text-muted hover:bg-white hover:text-ink">Practice</Link>
              <Link href="/progress" className="rounded-lg px-3 py-2 text-muted hover:bg-white hover:text-ink">Progress</Link>
              <Link href="/pricing" className="rounded-lg bg-sun-soft px-3 py-2 font-medium text-[#8a5a12] hover:bg-sun/40">Plus</Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-3xl px-4 pb-16 pt-6">{children}</main>
        <footer className="mx-auto max-w-3xl px-4 pb-10 text-center text-xs text-muted">
          Practice tool. Not medical or psychological advice. Feedback is based on{" "}
          <a className="underline" href="https://www.cdc.gov/parenting-toddlers/site.html" target="_blank" rel="noreferrer">
            CDC parenting guidance
          </a>
          . No account, no personal data: your practice stays in this browser.
        </footer>
      </body>
    </html>
  );
}

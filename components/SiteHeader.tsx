"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bars, Bolt } from "./icons";

/** The main pages. About is the home page and comes first. */
const PAGES = [
  { href: "/", label: "About" },
  { href: "/learn", label: "Learn" },
  { href: "/stories", label: "Stories" },
  { href: "/moment", label: "My moment", long: "Your own moment" },
] as const;

/** Sticky brand bar with the main pages. The practice flow has its own focused header. */
export function SiteHeader() {
  const path = usePathname() ?? "/";
  const current = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  if (path?.startsWith("/practice")) return null;

  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2 text-[21px] font-extrabold tracking-tight">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bears.svg" alt="" width={32} height={31} className="h-8 w-8" />
          Ayala
        </Link>

        <nav aria-label="Main pages" className="hidden items-center gap-1 md:flex">
          {PAGES.map((p) => (
            <PageLink key={p.href} href={p.href} label={"long" in p ? p.long : p.label} current={current(p.href)} />
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/help"
            aria-label="Help me now"
            className="flex h-10 items-center gap-1.5 rounded-full bg-orange px-3 text-[15px] font-bold text-ink sm:px-4"
          >
            <Bolt size={18} />
            <span className="hidden sm:inline">Help now</span>
          </Link>
          <Link href="/pricing" className="hidden h-10 items-center rounded-full px-4 text-[15px] font-semibold hover:bg-white sm:flex">
            Plus
          </Link>
          <Link
            href="/progress"
            aria-label="Your progress"
            className="flex h-10 items-center gap-2 rounded-full bg-white px-3 text-[15px] font-semibold sm:px-4"
          >
            <Bars size={20} />
            <span className="hidden sm:inline">Your progress</span>
          </Link>
        </div>
      </div>

      {/* Phones and tablets: the main pages as a tab row under the logo */}
      <nav aria-label="Main pages" className="mx-auto flex max-w-5xl gap-1 px-3 pb-2 md:hidden">
        {PAGES.map((p) => (
          <PageLink key={p.href} href={p.href} label={p.label} current={current(p.href)} wide />
        ))}
      </nav>
    </header>
  );
}

function PageLink({ href, label, current, wide }: { href: string; label: string; current: boolean; wide?: boolean }) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`flex h-10 items-center justify-center whitespace-nowrap rounded-full px-3 text-[15px] font-semibold transition-colors ${wide ? "flex-1 px-1" : "px-4"} ${
        current ? "bg-ink text-cream" : "text-ink hover:bg-white"
      }`}
    >
      {label}
    </Link>
  );
}

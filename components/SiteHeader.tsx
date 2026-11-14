"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bars, Bolt } from "./icons";

const PARTS = [
  { id: "about", label: "About" },
  { id: "learn", label: "Learn" },
  { id: "stories", label: "Stories" },
] as const;

type PartId = (typeof PARTS)[number]["id"];

/** Sticky brand bar with the three parts of the home page. The practice flow has its own focused header. */
export function SiteHeader() {
  const path = usePathname();
  const onHome = path === "/";
  const [active, setActive] = useState<PartId>("about");

  // On the home page, highlight the part the parent is reading.
  useEffect(() => {
    if (!onHome) return;
    const els = PARTS.map((p) => document.getElementById(p.id)).filter((e): e is HTMLElement => Boolean(e));
    if (els.length === 0) return;
    const onScroll = () => {
      const line = 160;
      let cur: PartId = "about";
      for (const el of els) if (el.getBoundingClientRect().top <= line) cur = el.id as PartId;
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) cur = els[els.length - 1].id as PartId;
      setActive(cur);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [onHome]);

  if (path?.startsWith("/practice")) return null;

  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2 text-[21px] font-extrabold tracking-tight">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bears.svg" alt="" width={32} height={31} className="h-8 w-8" />
          Ayala
        </Link>

        <nav aria-label="Home sections" className="hidden items-center gap-1 sm:flex">
          {PARTS.map((p) => (
            <PartLink key={p.id} id={p.id} label={p.label} current={onHome && active === p.id} />
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

      {/* Phones: the three parts as a tab row under the logo */}
      <nav aria-label="Home sections" className="mx-auto flex max-w-5xl gap-1 px-4 pb-2 sm:hidden">
        {PARTS.map((p) => (
          <PartLink key={p.id} id={p.id} label={p.label} current={onHome && active === p.id} wide />
        ))}
      </nav>
    </header>
  );
}

function PartLink({ id, label, current, wide }: { id: string; label: string; current: boolean; wide?: boolean }) {
  return (
    <Link
      href={`/#${id}`}
      aria-current={current ? "location" : undefined}
      className={`flex h-10 items-center justify-center rounded-full px-4 text-[15px] font-semibold transition-colors ${wide ? "flex-1" : ""} ${
        current ? "bg-ink text-cream" : "text-ink hover:bg-white"
      }`}
    >
      {label}
    </Link>
  );
}

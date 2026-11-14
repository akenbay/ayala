"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bars, Logo } from "./icons";

/** Slim brand bar. The practice flow has its own focused header, so it is hidden there. */
export function SiteHeader() {
  const path = usePathname();
  if (path?.startsWith("/practice")) return null;
  return (
    <header className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5 pt-2">
      <Link href="/" className="flex items-center gap-2 text-[22px] font-extrabold tracking-tight">
        <Logo />
        Ayala
      </Link>
      <nav className="flex items-center gap-2">
        <Link href="/pricing" className="hidden h-11 items-center rounded-full px-4 text-[15px] font-semibold hover:bg-white sm:flex">
          Plus
        </Link>
        <Link
          href="/progress"
          aria-label="Your progress"
          className="flex h-11 items-center gap-2 rounded-full bg-white px-3 text-[15px] font-semibold sm:px-4"
        >
          <Bars size={20} />
          <span className="hidden sm:inline">Your progress</span>
        </Link>
      </nav>
    </header>
  );
}

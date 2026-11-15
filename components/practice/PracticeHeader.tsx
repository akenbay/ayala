"use client";

import Link from "next/link";
import { type AttemptKind } from "@/lib/storage";
import { Sam, faceFor } from "@/components/Sam";
import { STATE_LABEL, type SamState } from "@/lib/toddler";
import { Back, Check } from "@/components/icons";
import { STATE_DOT, type Step } from "@/components/practice/shared";

export function PracticeHeader({
  title,
  step,
  kind,
  scene,
}: {
  title: string;
  step: Step;
  kind: AttemptKind;
  scene?: { text: string; state?: SamState; opener: boolean };
}) {
  const active =
    step === "chat" ? (kind === "first" ? 0 : kind === "retry" ? 1 : 2) : step === "score" ? 1 : step === "compare" || step === "paywall" ? 2 : 3;
  const labels = ["Try", "Improve", "New situation"];
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-cream px-4 pb-3.5 pt-3">
      <div className="mx-auto max-w-xl">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="Back to home" className="flex h-11 w-11 items-center justify-center rounded-full bg-white">
            <Back size={20} />
          </Link>
          <span className="truncate px-2 text-[17px] font-bold">{title}</span>
          <span className="w-11" />
        </div>
        <ol
          className="mt-3.5 grid grid-cols-3 gap-1.5"
          aria-label={active > 2 ? "All 3 steps done" : `Step ${active + 1} of 3, ${labels[active]}`}
        >
          {labels.map((l, i) => {
            const done = i < active;
            const now = i === active;
            return (
              <li key={l} className="flex flex-col gap-1.5">
                <span className={`h-1.5 rounded-full transition-colors duration-300 ${done ? "bg-ink" : now ? "bg-orange" : "bg-line"}`} />
                <span className={`flex items-center gap-1 text-[13px] ${now ? "font-extrabold" : done ? "font-semibold" : "font-medium text-muted"}`}>
                  {done ? <Check size={13} /> : `${i + 1}`} {l}
                </span>
              </li>
            );
          })}
        </ol>
        {scene && (
          <div className="mt-3 flex items-center gap-3 rounded-2xl bg-peach px-3 py-2.5">
            <Sam face={faceFor(scene.state, scene.opener)} size={44} />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold leading-snug">{scene.text}</p>
              {scene.state && (
                <p key={scene.state} className="anim-fade-down mt-0.5 flex items-center gap-1.5 text-[13px] font-semibold text-soft-ink">
                  <span aria-hidden className={`h-2 w-2 rounded-full ${STATE_DOT[scene.state]}`} />
                  Sam: {STATE_LABEL[scene.state].toLowerCase()}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

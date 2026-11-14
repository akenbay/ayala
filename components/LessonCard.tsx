"use client";

import { SCENARIOS } from "@/lib/scenarios";
import { lessonSource, type Lesson } from "@/lib/lessons";
import { Arrow, ChevronDown, Info } from "@/components/icons";
import { Sam } from "@/components/Sam";

/** A lesson that opens in place: three ideas, phrases to try, one thing to avoid, the CDC page, then practice. */
export function LessonCard({
  lesson: l,
  index,
  open,
  read = false,
  locked,
  onToggle,
  onPractice,
}: {
  lesson: Lesson;
  index: number;
  open: boolean;
  read?: boolean;
  locked: boolean;
  onToggle: () => void;
  onPractice: () => void;
}) {
  const src = lessonSource(l);
  return (
    <li
      id={`lesson-${l.id}`}
      className={`anim-rise scroll-mt-32 md:scroll-mt-20 overflow-hidden rounded-3xl transition-colors duration-200 ${open ? "shadow-soft bg-peach" : "bg-white"}`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3.5 p-4 text-left">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[17px] font-extrabold ${open ? "bg-white" : "bg-peach"}`}>
          {index + 1}
        </span>
        <span className="flex flex-1 flex-col gap-0.5">
          <span className="text-[17px] font-bold leading-snug">{l.title}</span>
          <span className="text-[14px] text-muted">
            {l.hook}
            {read && !open && <span className="ml-1.5 font-semibold text-good">· Read</span>}
          </span>
        </span>
        <ChevronDown size={20} className={`shrink-0 transition duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="anim-fade-down flex flex-col gap-4 px-4 pb-4">
          <ol className="flex flex-col gap-2.5">
            {l.points.map((p, i) => (
              <li key={i} className="anim-rise flex gap-3 text-[16px] leading-snug" style={{ animationDelay: `${60 + i * 70}ms` }}>
                <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-orange" />
                {p}
              </li>
            ))}
          </ol>

          <div className="rounded-2xl bg-white p-4">
            <span className="label-caps">Try saying</span>
            <ul className="mt-2 flex flex-col gap-2">
              {l.say.map((s) => (
                <li key={s} className="flex items-start gap-2.5">
                  <span className="shrink-0">
                    <Sam face="happy" size={26} />
                  </span>
                  <span className="text-[16px] italic leading-snug">&ldquo;{s}&rdquo;</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 border-t border-line pt-2.5 text-[14px] text-soft-ink">
              <b className="text-bad">Skip:</b> {l.avoid}
            </p>
          </div>

          <a href={src.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 self-start text-[14px] font-semibold underline underline-offset-[3px]">
            <Info size={15} /> Read more: {src.name}
          </a>

          <button type="button" onClick={onPractice} className="btn-primary h-14 text-lg">
            {locked ? "Unlock to practice" : `Practice it: ${SCENARIOS[l.practice].short.toLowerCase()}`} <Arrow size={20} />
          </button>
          <p className="-mt-2 text-center text-[13px] text-muted">About {l.minutes} minutes with Sam</p>
        </div>
      )}
    </li>
  );
}

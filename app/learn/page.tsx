"use client";

import { useEffect, useState } from "react";
import { LESSONS, LESSON_GROUPS } from "@/lib/lessons";
import { SCENARIOS } from "@/lib/scenarios";
import { useStore } from "@/lib/storage";
import { LessonCard } from "@/components/LessonCard";
import { markLessonRead, useStartPractice } from "@/components/useStartPractice";

/** Learn: short lessons from CDC guidance, each ending with the story that practices it. */
export default function LearnPage() {
  const store = useStore();
  const start = useStartPractice();
  const unlocked = store?.unlocked ?? false;
  const [open, setOpen] = useState<string | null>(null);

  // Your path links here with ?open=<lesson id> to open that lesson right away.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("open");
    if (!id || !LESSONS.some((l) => l.id === id)) return;
    (async () => {
      await Promise.resolve();
      setOpen(id);
      markLessonRead(id);
      requestAnimationFrame(() => document.getElementById(`lesson-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
    })();
  }, []);

  return (
    <div className="mx-auto max-w-3xl py-5">
      <h1 className="font-display text-[34px] leading-tight">Learn</h1>
      <p className="mt-1 text-[16px] text-muted">
        Ideas from the CDC&apos;s Essentials for Parenting. {LESSONS.length} short lessons, about 2 minutes each. Every one ends with a story to practice it.
      </p>
      {LESSON_GROUPS.map((g) => (
        <section key={g.id} aria-labelledby={`lg-${g.id}`} className="mt-7">
          <h2 id={`lg-${g.id}`} className="text-[20px] font-extrabold">
            {g.title}
          </h2>
          <p className="text-[14px] text-muted">{g.hint}</p>
          <ul className="mt-3 flex flex-col gap-3">
            {LESSONS.filter((l) => l.group === g.id).map((l) => (
              <LessonCard
                key={l.id}
                lesson={l}
                index={LESSONS.indexOf(l)}
                open={open === l.id}
                read={(store?.lessonsRead ?? []).includes(l.id)}
                locked={!SCENARIOS[l.practice].free && !unlocked}
                onToggle={() => {
                  if (open !== l.id) markLessonRead(l.id);
                  setOpen((v) => (v === l.id ? null : l.id));
                }}
                onPractice={() => start(l.practice, null, l.id)}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

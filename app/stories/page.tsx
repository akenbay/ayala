"use client";

import Link from "next/link";
import { useState } from "react";
import { SCENARIO_LIST, STORY_GROUPS } from "@/lib/scenarios";
import { ownMomentLocked, update, useStore, type Age } from "@/lib/storage";
import { Arrow, ScenarioIcon } from "@/components/icons";
import { useStartPractice } from "@/components/useStartPractice";

/** Stories with Sam: 15 everyday moments, grouped, plus the parent's own moment at the top. */
export default function StoriesPage() {
  const store = useStore();
  const start = useStartPractice();
  const [editing, setEditing] = useState(false);
  const age: Age = store?.childAge ?? 3;
  const context = store?.context ?? "";
  const unlocked = store?.unlocked ?? false;
  const momentLocked = store ? ownMomentLocked(store) : false;

  return (
    <div className="mx-auto max-w-3xl py-5">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="font-display text-[34px] leading-tight">Stories with Sam</h1>
        <span className="shrink-0 text-[14px] text-muted">
          Age {age},{" "}
          <button type="button" onClick={() => setEditing((v) => !v)} aria-expanded={editing} className="font-semibold text-ink underline underline-offset-2">
            {editing ? "done" : "change"}
          </button>
        </span>
      </div>
      <p className="mt-1 text-[16px] text-muted">
        Pick a hard moment. Sam, a pretend toddler, reacts to what you say, and you get feedback on your own words.
      </p>

      {editing && (
        <div className="anim-fade-down mt-3 space-y-4 rounded-2xl bg-white p-4">
          <div className="flex gap-2" role="group" aria-label="Child's age">
            {([2, 3, 4] as Age[]).map((a) => (
              <button
                key={a}
                type="button"
                className="chip"
                aria-pressed={age === a}
                onClick={() =>
                  update((s) => {
                    s.childAge = a;
                  })
                }
              >
                {a} years
              </button>
            ))}
          </div>
          <div>
            <label htmlFor="ctx" className="text-[15px] font-semibold">
              Anything Sam should know? <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id="ctx"
              value={context}
              maxLength={120}
              onChange={(e) =>
                update((s) => {
                  s.context = e.target.value.slice(0, 120);
                })
              }
              placeholder="He's usually tired after daycare"
              className="mt-2 h-12 w-full rounded-xl border-[1.5px] border-field bg-cream px-3.5 text-base outline-none focus:border-ink"
            />
            <p className="mt-1.5 text-[13px] text-muted">Please don&apos;t enter your child&apos;s real name.</p>
          </div>
        </div>
      )}

      <Link
        href={momentLocked ? "/pricing?from=moment" : "/moment"}
        className="mt-5 flex items-center gap-4 rounded-3xl bg-peach p-5 shadow-soft transition active:scale-[0.99]"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white">
          <ScenarioIcon id="custom" size={26} />
        </span>
        <span className="flex flex-1 flex-col">
          <span className="text-[19px] font-extrabold leading-tight">Practice your own moment</span>
          <span className="text-[14px] text-soft-ink">Not on the list? Describe what really happens and Sam plays it.</span>
        </span>
        {momentLocked ? <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-bold text-cream">Plus</span> : <Arrow size={20} />}
      </Link>

      {STORY_GROUPS.map((g) => {
        const stories = SCENARIO_LIST.filter((s) => s.group === g.id);
        if (!stories.length) return null;
        return (
          <section key={g.id} aria-labelledby={`g-${g.id}`} className="mt-8">
            <h2 id={`g-${g.id}`} className="text-[20px] font-extrabold">
              {g.title}
            </h2>
            <p className="text-[14px] text-muted">{g.hint}</p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {stories.map((s) => {
                const plus = !s.free && !unlocked;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => start(s.id)}
                    className="flex min-h-[132px] flex-col items-start gap-2 rounded-2xl bg-white p-4 text-left transition duration-150 hover:shadow-[0_0_0_2px_#30251F] active:scale-[0.98]"
                  >
                    <span className="flex w-full items-start justify-between">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-peach">
                        <ScenarioIcon id={s.id} size={24} />
                      </span>
                      {plus ? (
                        <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-bold text-cream">Plus</span>
                      ) : (
                        <span className="rounded-full bg-good-soft px-2 py-0.5 text-[11px] font-bold text-good">Free</span>
                      )}
                    </span>
                    <span className="mt-auto text-[17px] font-bold leading-tight">{s.short}</span>
                    <span className="text-[13px] text-muted">About {s.minutes} min</span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

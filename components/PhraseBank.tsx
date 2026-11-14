"use client";

import Link from "next/link";
import { useState } from "react";
import type { ScenarioId } from "@/lib/scenarios";
import {
  FREE_PHRASES,
  clock,
  addPhrase,
  canSavePhrase,
  markPhraseHome,
  phraseToCheck,
  removePhrase,
  update,
  useStore,
  type Phrase,
} from "@/lib/storage";
import { Bookmark, Check } from "./icons";

/** "Save this phrase": keeps the parent's improved words for Help me now and the phrase bank. */
export function SavePhrase({ text, scenarioId, situation, score }: { text: string; scenarioId: ScenarioId; situation: string; score?: number }) {
  const store = useStore();
  const [full, setFull] = useState(false);
  const saved = (store?.phrases ?? []).some((p) => p.text.trim().toLowerCase() === text.trim().toLowerCase());
  if (!store || !text.trim()) return null;

  function save() {
    let ok = true;
    update((s) => {
      ok = addPhrase(s, { text, scenarioId, situation, score });
    });
    setFull(!ok);
  }

  if (saved)
    return (
      <p className="flex items-center gap-1.5 text-[15px] font-semibold text-good">
        <Check size={16} /> Saved to your phrases. It shows first in Help me now.
      </p>
    );
  if (full || !canSavePhrase(store))
    return (
      <p className="text-[14px] text-soft-ink">
        Your free phrase bank holds {FREE_PHRASES} phrases.{" "}
        <Link href="/pricing?from=phrases" className="font-semibold text-ink underline underline-offset-2">
          Keep them all with Plus
        </Link>
        , or remove one in Your progress.
      </p>
    );
  return (
    <button type="button" onClick={save} className="btn-ghost flex items-center justify-center gap-2 self-start">
      <Bookmark size={18} /> Save this phrase
    </button>
  );
}

const HOME_LABEL: Record<NonNullable<Phrase["home"]>, string> = { worked: "Worked at home", not_yet: "Not tried yet", didnt_work: "Didn't work" };

/** "Did you try it at home?": asked about a saved phrase on a later visit. Real-life feedback, never required. */
export function HomeCheck() {
  const store = useStore();
  const [answered, setAnswered] = useState<NonNullable<Phrase["home"]> | null>(null);
  // The store is null during prerender, so the clock is only read in the browser.
  const p = store ? phraseToCheck(store.phrases, clock().getTime()) : null;
  if (answered)
    return (
      <p className="rounded-2xl bg-good-soft px-4 py-3 text-[15px] font-semibold text-good">
        {answered === "worked"
          ? "That's real progress. Keep using it."
          : answered === "not_yet"
            ? "No rush. We'll ask again another day."
            : "Thanks for telling us. Try practicing that moment again with your own words."}
      </p>
    );
  if (!p) return null;

  function pick(v: NonNullable<Phrase["home"]>) {
    update((s) => markPhraseHome(s, p!.id, v));
    setAnswered(v);
  }

  return (
    <section aria-label="Did you try it at home?" className="flex flex-col gap-2.5 rounded-2xl bg-white p-4 shadow-soft">
      <span className="label-caps text-amber-text">Did you try it at home?</span>
      <p className="text-[17px] font-semibold leading-snug">&ldquo;{p.text}&rdquo;</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-orange" onClick={() => pick("worked")}>
          It worked
        </button>
        <button type="button" className="btn-ghost" onClick={() => pick("not_yet")}>
          Not yet
        </button>
        <button type="button" className="btn-ghost" onClick={() => pick("didnt_work")}>
          It didn&apos;t
        </button>
      </div>
    </section>
  );
}

/** The phrase bank on Your progress. */
export function PhraseList() {
  const store = useStore();
  const phrases = store?.phrases ?? [];
  return (
    <section aria-labelledby="phrases-h" className="flex flex-col gap-3 rounded-2xl bg-white p-[18px]">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="phrases-h" className="text-[19px] font-extrabold">
          My phrases
        </h2>
        {!store?.unlocked && (
          <span className="text-[13px] text-muted">
            {phrases.length} of {FREE_PHRASES} free
          </span>
        )}
      </div>
      {phrases.length === 0 ? (
        <p className="text-[15px] text-muted">After a retry, tap Save this phrase. Your saved words show first when you need help in the moment.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {phrases.map((p) => (
            <li key={p.id} className="rounded-xl bg-cream px-4 py-3">
              <p className="text-[16px] font-semibold leading-snug">&ldquo;{p.text}&rdquo;</p>
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[13px] text-muted">
                <span>
                  {p.situation}
                  {typeof p.score === "number" ? ` · ${p.score}` : ""}
                  {p.home ? ` · ${HOME_LABEL[p.home]}` : ""}
                </span>
                <button
                  type="button"
                  className="min-h-9 font-semibold text-ink underline underline-offset-2"
                  onClick={() => update((s) => removePhrase(s, p.id))}
                  aria-label={`Remove phrase: ${p.text}`}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Link href="/help" className="text-[15px] font-semibold underline underline-offset-[3px]">
        Open Help me now
      </Link>
    </section>
  );
}

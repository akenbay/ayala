"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SCENARIOS, type ScenarioId } from "@/lib/scenarios";
import { DIMENSION_LABELS, type Dimension } from "@/lib/rubric/types";
import { FOCUS_TIPS, buildPlan, update, useStore, type Age, type Profile } from "@/lib/storage";
import { Arrow, Back, Check } from "@/components/icons";

type Option<T extends string | number> = { value: T; label: string };
type Step =
  | { key: "role"; q: string; options: Option<NonNullable<Profile["role"]>>[] }
  | { key: "age"; q: string; options: Option<Age>[] }
  | { key: "sex"; q: string; options: Option<NonNullable<Profile["sex"]>>[] }
  | { key: "temperament"; q: string; options: Option<NonNullable<Profile["temperament"]>>[] }
  | { key: "hardest"; q: string; multi: true; options: Option<string>[] }
  | { key: "usual"; q: string; options: Option<NonNullable<Profile["usual"]>>[] }
  | { key: "when"; q: string; options: Option<NonNullable<Profile["when"]>>[] };

const STEPS: Step[] = [
  { key: "role", q: "Who are you?", options: [{ value: "mom", label: "Mom" }, { value: "dad", label: "Dad" }, { value: "other", label: "Another caregiver" }] },
  { key: "age", q: "How old is the child you find hardest right now?", options: [{ value: 2, label: "2 years" }, { value: 3, label: "3 years" }, { value: 4, label: "4 years" }] },
  { key: "sex", q: "Your child is a…", options: [{ value: "boy", label: "Boy" }, { value: "girl", label: "Girl" }, { value: "unsaid", label: "Prefer not to say" }] },
  {
    key: "temperament",
    q: "What is your child like?",
    options: [
      { value: "calm", label: "Calm and quiet" },
      { value: "active", label: "Active, always moving" },
      { value: "fiery", label: "Big emotions, hot-tempered" },
      { value: "sensitive", label: "Sensitive, cries easily" },
    ],
  },
  {
    key: "hardest",
    q: "Which moments are hardest?",
    multi: true,
    options: [
      { value: "leaving", label: "Leaving places" },
      { value: "bedtime", label: "Bedtime" },
      { value: "hitting", label: "Hitting or biting" },
      { value: "screens", label: "Turning off screens" },
      { value: "public", label: "Tantrums in public" },
      { value: "other", label: "Something else" },
    ],
  },
  {
    key: "usual",
    q: "In that moment, what do you usually do?",
    options: [
      { value: "yell", label: "I raise my voice" },
      { value: "give_in", label: "I give in" },
      { value: "threaten", label: "I threaten a punishment" },
      { value: "freeze", label: "I freeze, I don't know what to say" },
      { value: "calm", label: "I stay calm, but it doesn't work" },
    ],
  },
  {
    key: "when",
    q: "When does it happen most?",
    options: [
      { value: "morning", label: "Morning rush" },
      { value: "after_daycare", label: "After daycare" },
      { value: "dinner", label: "Dinner time" },
      { value: "bedtime", label: "Bedtime" },
      { value: "public", label: "Out in public" },
    ],
  },
];

/** What the parent usually does predicts the skill to work on first, until real practice shows otherwise. */
const FOCUS: Record<NonNullable<Profile["usual"]>, { dim: Dimension; title: string }> = {
  yell: { dim: "calm_respectful", title: "A calm voice, even in the storm" },
  give_in: { dim: "boundaries", title: "Limits without giving in" },
  threaten: { dim: "calm_respectful", title: "Limits without threats" },
  freeze: { dim: "clear_direction", title: "Knowing exactly what to say" },
  calm: { dim: "emotional_response", title: "Name the feeling first" },
};


const WHEN_PHRASE: Record<NonNullable<Profile["when"]>, string> = {
  morning: "before the morning rush",
  after_daycare: "before daycare pickup",
  dinner: "before dinner",
  bedtime: "before bedtime",
  public: "before you head out",
};

const TEMPER_WORD: Record<NonNullable<Profile["temperament"]>, string> = {
  calm: "quiet",
  active: "busy",
  fiery: "big-feelings",
  sensitive: "sensitive",
};

function firstScenario(hardest: string[], unlocked: boolean): ScenarioId | "custom_form" {
  for (const h of hardest) {
    if (h === "leaving") return "leaving_playground";
    if (h === "bedtime" || h === "screens") return "bedtime_refusal";
    if (h === "hitting") return unlocked ? "hitting_sibling" : "leaving_playground";
    if (h === "public" || h === "other") return "custom_form";
  }
  return "leaving_playground";
}

/** A 60 second start: seven taps that shape Sam, the plan and the reminder. No email, no account. */
export default function StartPage() {
  const router = useRouter();
  const store = useStore();
  const [i, setI] = useState(0);
  const [a, setA] = useState<Partial<Profile> & { age?: Age }>({});
  const [multi, setMulti] = useState<string[]>([]);
  const done = i >= STEPS.length;
  const step = STEPS[Math.min(i, STEPS.length - 1)];

  function pick(value: string | number) {
    setA((x) => ({ ...x, [step.key]: value }));
    setI((n) => n + 1);
  }

  function finish() {
    const usual = a.usual ?? "freeze";
    const focus = FOCUS[usual].dim;
    const unlocked = store?.unlocked ?? false;
    const first = firstScenario(multi, unlocked);
    const profile: Profile = { role: a.role, sex: a.sex, temperament: a.temperament, hardest: multi, usual, when: a.when, focus };
    update((s) => {
      s.profile = profile;
      if (a.age) s.childAge = a.age;
      if (!s.attempts.length) s.plan = buildPlan([], focus);
      if (first !== "custom_form") {
        s.current = first;
        s.currentPlanDay = null;
      }
    });
    router.push(first === "custom_form" ? "/moment" : "/practice");
  }

  if (done) {
    const usual = a.usual ?? "freeze";
    const f = FOCUS[usual];
    const who = a.sex === "boy" ? "boy" : a.sex === "girl" ? "girl" : "child";
    const kind = a.temperament ? `${TEMPER_WORD[a.temperament]} ` : "";
    const first = firstScenario(multi, store?.unlocked ?? false);
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 py-6">
        <p className="rounded-2xl bg-peach px-4 py-3 text-[15px] leading-snug">
          <b>You&apos;re not alone.</b> In a study of 1,490 preschoolers, 83.7% had tantrums at least sometimes.{" "}
          <a className="underline underline-offset-2" href="https://pubmed.ncbi.nlm.nih.gov/22928674/" target="_blank" rel="noreferrer">
            Wakschlag et al., 2012
          </a>
        </p>
        <span className="label-caps">Your plan</span>
        <h1 className="text-[30px] font-extrabold leading-tight tracking-tight">
          Calm words for a {kind}
          {a.age ?? 3} year old {who}
        </h1>
        <section className="flex flex-col gap-2 rounded-[20px] bg-orange p-5">
          <span className="text-sm font-extrabold uppercase tracking-[0.04em]">Your first focus</span>
          <h2 className="text-[24px] font-extrabold leading-tight">{f.title}</h2>
          <p className="text-[17px] leading-snug">{FOCUS_TIPS[f.dim]}</p>
          <p className="text-sm">
            Skill: {DIMENSION_LABELS[f.dim]}. We picked it from what you usually do; your real practice will update it.
          </p>
        </section>
        <ul className="flex flex-col gap-2 rounded-2xl bg-white p-5 text-base">
          <li className="flex gap-2">
            <Check size={16} className="mt-1 shrink-0" /> Sam will act like your child: {kind || "a "}
            {who}, age {a.age ?? 3}.
          </li>
          <li className="flex gap-2">
            <Check size={16} className="mt-1 shrink-0" /> First practice:{" "}
            {first === "custom_form" ? "your own moment, in your words" : SCENARIOS[first].short.toLowerCase()}.
          </li>
          {a.when && (
            <li className="flex gap-2">
              <Check size={16} className="mt-1 shrink-0" /> A daily 2 minute reminder {WHEN_PHRASE[a.when]}, if you want one.
            </li>
          )}
          <li className="flex gap-2">
            <Check size={16} className="mt-1 shrink-0" /> Based on CDC&apos;s Essentials for Parenting Toddlers and Preschoolers.
          </li>
        </ul>
        <button type="button" className="btn-primary h-14 text-lg" onClick={finish}>
          Start my first practice <Arrow size={20} />
        </button>
        <p className="text-center text-[13px] text-muted">Free. No account, no email. Your answers stay in this browser.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 py-4">
      <div className="flex items-center gap-3">
        {i === 0 ? (
          <Link href="/" aria-label="Back to home" className="flex h-11 w-11 items-center justify-center rounded-full bg-white">
            <Back size={20} />
          </Link>
        ) : (
          <button type="button" aria-label="Previous question" onClick={() => setI((n) => n - 1)} className="flex h-11 w-11 items-center justify-center rounded-full bg-white">
            <Back size={20} />
          </button>
        )}
        <div className="flex-1">
          <div className="h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={i + 1}>
            <div className="h-full rounded-full bg-orange transition-all" style={{ width: `${((i + 1) / STEPS.length) * 100}%` }} />
          </div>
          <p className="mt-1 text-[13px] text-muted">
            {i + 1} of {STEPS.length}
          </p>
        </div>
      </div>

      <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">{step.q}</h1>
      {"multi" in step && <p className="-mt-3 text-[15px] text-muted">Pick all that apply.</p>}

      <div className="flex flex-col gap-2.5">
        {step.options.map((o) => {
          const isMulti = "multi" in step;
          const on = isMulti ? multi.includes(String(o.value)) : a[step.key as keyof typeof a] === o.value;
          return (
            <button
              key={String(o.value)}
              type="button"
              aria-pressed={on}
              onClick={() =>
                isMulti ? setMulti((m) => (m.includes(String(o.value)) ? m.filter((x) => x !== o.value) : [...m, String(o.value)])) : pick(o.value)
              }
              className={`flex min-h-14 items-center justify-between rounded-2xl px-5 text-left text-[17px] font-semibold transition ${
                on ? "bg-ink text-cream" : "bg-white hover:shadow-[0_0_0_2px_#000]"
              }`}
            >
              {o.label}
              {on && <Check size={18} />}
            </button>
          );
        })}
      </div>

      {"multi" in step && (
        <button type="button" className="btn-primary h-14 text-lg" disabled={!multi.length} onClick={() => setI((n) => n + 1)}>
          Continue <Arrow size={20} />
        </button>
      )}
    </div>
  );
}

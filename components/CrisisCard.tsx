import Link from "next/link";
import { helpFor, type Crisis } from "@/lib/safety";

const TITLE: Record<Crisis["kind"], string> = {
  self_harm: "Let's pause the practice. You matter.",
  overwhelmed: "Let's pause the practice. This sounds really hard.",
  harm_to_child: "Let's pause the practice and get you support.",
  unsafe_home: "Let's pause the practice. Your safety comes first.",
};

const BODY: Record<Crisis["kind"], string> = {
  self_harm: "What you wrote sounds like more than a practice moment. Trained counselors are there right now, for free.",
  overwhelmed: "Parenting a toddler can be exhausting, and you don't have to carry it alone. A counselor can listen right now, for free.",
  harm_to_child:
    "Feeling close to hurting a child is a signal to get support, not a reason for shame. These lines help parents in that exact moment.",
  unsafe_home: "If anyone at home hurts you or the kids, these lines can help you plan your next step.",
};

/** Shown instead of a score when the parent's words suggest a crisis. Ayala is a practice tool, not crisis care. */
export function CrisisCard({ kind }: { kind: Crisis["kind"] }) {
  return (
    <section role="alert" className="flex flex-col gap-3 rounded-2xl border-2 border-ink bg-white p-5">
      <h2 className="text-[22px] font-extrabold leading-tight">{TITLE[kind]}</h2>
      <p className="text-base leading-snug text-soft-ink">{BODY[kind]}</p>
      <ul className="flex flex-col gap-2">
        {helpFor(kind).map((h) => (
          <li key={h.name}>
            <a href={h.href} className="flex flex-col rounded-xl bg-cream px-4 py-3 hover:bg-peach">
              <span className="text-[15px] font-bold">{h.name}</span>
              <span className="text-lg font-extrabold">{h.number}</span>
              <span className="text-[13px] text-muted">{h.note}</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="text-[15px] font-semibold">If anyone is in danger right now, call 911.</p>
      <p className="text-[13px] text-muted">Ayala is a practice tool, not crisis care. Nothing you typed was saved as a score.</p>
      <Link href="/" className="btn-ghost self-start">
        Back to home
      </Link>
    </section>
  );
}

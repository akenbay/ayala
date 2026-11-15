"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { SCENARIOS, type ScenarioId } from "@/lib/scenarios";
import type { Scorecard } from "@/lib/rubric/types";
import { MAX_CHARS } from "@/lib/rubric/validate";
import { update, type Age } from "@/lib/storage";
import { Spinner, TypingDots } from "@/components/ui";
import type { Crisis } from "@/lib/safety";
import { CrisisCard } from "@/components/CrisisCard";
import { Sam, faceFor } from "@/components/Sam";
import { ENDING_STATES, MAX_PARENT_TURNS, type SamState } from "@/lib/toddler";
import { Mic, Arrow, ArrowUp } from "@/components/icons";
import { OUTCOME, type Msg } from "@/components/practice/shared";

export type SpeechResultEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
export type Recognizer = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export function recognizerCtor(): (new () => Recognizer) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognizer; webkitSpeechRecognition?: new () => Recognizer };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const noop = () => () => {};

/** Speak instead of type, where the browser supports it (Chrome, Safari). Text appears in the box to check before sending. */
export function useVoice(onText: (t: string) => void) {
  const supported = useSyncExternalStore(noop, () => Boolean(recognizerCtor()), () => false);
  const [listening, setListening] = useState(false);
  const rec = useRef<Recognizer | null>(null);
  useEffect(() => () => rec.current?.stop(), []);
  function toggle() {
    if (listening) {
      rec.current?.stop();
      return;
    }
    const Ctor = recognizerCtor();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = "en-US";
    r.interimResults = false;
    r.continuous = false;
    r.onresult = (e) => {
      const said = Array.from(e.results)
        .map((x) => x[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (said) onText(said);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    try {
      r.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }
  return { supported, listening, toggle };
}

export function SamBubble({ text, typing = false, state, opener = false }: { text?: string; typing?: boolean; state?: SamState; opener?: boolean }) {
  return (
    <div className="anim-bubble flex max-w-[86%] items-end gap-2">
      <span className="shrink-0">
        <Sam face={faceFor(state, opener)} size={34} />
      </span>
      <div className="flex flex-col gap-1">
        {!typing && <span className="pl-1 text-[13px] text-muted">Sam</span>}
        {typing ? (
          <div role="status" aria-label="Sam is typing" className="rounded-[18px] rounded-bl-md bg-peach px-[18px] py-4">
            <TypingDots />
          </div>
        ) : (
          <p className="rounded-[18px] rounded-bl-md bg-peach px-[15px] py-3 text-[17px] leading-snug">{text}</p>
        )}
      </div>
    </div>
  );
}

export function Chat(props: {
  scenarioId: ScenarioId;
  age: Age;
  context: string;
  transfer: boolean;
  situation: string;
  banner: { label: string; text: string } | null;
  msgs: Msg[];
  setMsgs: React.Dispatch<React.SetStateAction<Msg[]>>;
  idea: string | null;
  ideaLabel: string;
  onFinish: () => void;
  ownSituation?: string;
  waiting?: boolean; // Sam's first line is still loading
  child?: { sex?: "boy" | "girl" | "unsaid"; temperament?: "calm" | "active" | "fiery" | "sensitive" };
  initialText?: string;
}) {
  const { scenarioId, age, context, transfer, banner, msgs, setMsgs, idea, ideaLabel, onFinish, ownSituation, child, initialText, waiting = false } = props;
  const [text, setText] = useState(initialText ?? "");
  const [busy, setBusy] = useState<"" | "score" | "child">("");
  const [error, setError] = useState("");
  const [showIdea, setShowIdea] = useState(false);
  const [pending, setPending] = useState("");
  const [crisis, setCrisis] = useState<Crisis["kind"] | null>(null);
  const [ageOpen, setAgeOpen] = useState(false);
  const [quick, setQuick] = useState(false); // Sam is using prewritten lines because the AI did not answer
  const voice = useVoice((said) => setText((t) => (t ? `${t} ${said}` : said).slice(0, MAX_CHARS)));
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const wasBusy = useRef(false);
  const parentTurns = msgs.filter((m) => m.role === "parent" && !m.setup).length;
  const lastState = [...msgs].reverse().find((m) => m.role === "child" && m.state)?.state;
  const ended = !busy && parentTurns > 0 && ((lastState && ENDING_STATES.includes(lastState)) || parentTurns >= MAX_PARENT_TURNS);
  const outcome = OUTCOME[lastState ?? "resisting"];
  const canType = !ended && parentTurns < MAX_PARENT_TURNS;

  // Keep the newest message in view, including after the ending card appears in the footer.
  useEffect(() => {
    if (parentTurns === 0 && !busy) return; // on open, stay at the top so the situation and opening are visible
    const id = requestAnimationFrame(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }));
    return () => cancelAnimationFrame(id);
  }, [msgs.length, busy, ended, parentTurns]);



  // The reply box is disabled while Sam answers, which drops focus. Give it back so the parent can keep typing.
  useEffect(() => {
    if (wasBusy.current && !busy) inputRef.current?.focus({ preventScroll: true });
    wasBusy.current = busy !== "";
  }, [busy]);

  async function send() {
    const t = text.trim();
    if (!t || !canType || busy || waiting) return;
    setError("");
    setShowIdea(false);
    setPending(t);
    setBusy("score");
    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scenarioId, age, text: t, transfer, situation: ownSituation }),
      });
      const data = await res.json();
      if (data.crisis) {
        setCrisis(data.crisis as Crisis["kind"]);
        window.scrollTo({ top: 0 });
        setBusy("");
        setPending("");
        setText("");
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
        setBusy("");
        setPending("");
        return;
      }
      const next: Msg[] = [...msgs, { role: "parent", text: t, card: data as Scorecard }];
      setMsgs(next);
      setText("");
      setPending("");
      setBusy("child");
      const setupLine = next.find((m) => m.setup)?.text;
      const history = next.filter((m) => !m.setup).map((m) => ({ role: m.role === "child" ? "assistant" : "user", content: m.text }));
      // The parent's reply is already scored and shown, so Sam always answers: a failed request
      // gets a stand-in line instead of leaving the conversation stuck without a reply.
      let d: { reply: string; state: SamState; degraded?: boolean } = { reply: "Hmph.", state: "resisting", degraded: true };
      try {
        const r = await fetch("/api/toddler", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            scenarioId,
            age,
            transfer,
            context,
            history,
            situation: ownSituation,
            child,
            setup: setupLine,
            passed: Object.fromEntries((data as Scorecard).checks.map((c) => [c.id, c.passed])),
            total: (data as Scorecard).total,
          }),
        });
        if (r.ok) d = (await r.json()) as typeof d;
      } catch {}
      setQuick(Boolean(d.degraded));
      setMsgs((m) => [...m, { role: "child", text: d.reply, state: d.state }]);
    } catch {
      setError("Connection problem. Check your internet and try again.");
      setPending("");
    } finally {
      setBusy("");
    }
  }

  if (crisis)
    return (
      <div className="py-4">
        <CrisisCard kind={crisis} />
      </div>
    );

  return (
    <div className="flex min-h-[calc(100dvh-118px)] flex-col">
      <div className="flex flex-1 flex-col gap-3.5 py-4">
            {parentTurns === 0 && !ownSituation && (
              <p className="px-1 text-[13px] text-muted">
                Age {age},{" "}
                {ageOpen ? (
                  ([2, 3, 4] as Age[]).map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={n === age}
                      onClick={() => {
                        update((st) => {
                          st.childAge = n;
                        });
                        setAgeOpen(false);
                      }}
                      className={`mx-0.5 rounded-full px-2.5 py-1 text-[13px] font-bold ${n === age ? "bg-ink text-cream" : "bg-cream"}`}
                    >
                      {n}
                    </button>
                  ))
                ) : (
                  <button type="button" onClick={() => setAgeOpen(true)} className="font-semibold text-ink underline underline-offset-2">
                    change
                  </button>
                )}
              </p>
            )}

        {SCENARIOS[scenarioId].safetyFirst && !transfer && parentTurns === 0 && (
          <p className="-mt-1.5 px-1 text-[13px] text-muted">If anyone is unsafe, focus on safety before practicing what to say.</p>
        )}

        {banner && (
          <div className="rounded-2xl bg-peach px-4 py-3">
            <span className="label-caps text-ink">{banner.label}</span>
            <p className="mt-1 text-base font-semibold leading-snug">{banner.text}</p>
          </div>
        )}

        {msgs.map((m, i) =>
          m.role === "child" ? (
            <SamBubble key={i} text={m.text} state={m.state} opener={!m.state} typing={waiting && !m.state} />
          ) : m.setup ? (
            <div key={i} className="anim-bubble flex max-w-[86%] flex-col items-end gap-1 self-end">
              <span className="pr-1 text-[13px] text-muted">You, a moment ago</span>
              <p className="rounded-[18px] rounded-br-md border-[1.5px] border-dashed border-field bg-white px-[15px] py-3 text-[17px] leading-snug text-soft-ink">
                {m.text}
              </p>
            </div>
          ) : (
            <div key={i} className="anim-bubble flex max-w-[86%] flex-col items-end gap-1 self-end">
              <span className="pr-1 text-[13px] text-muted">You</span>
              <p className="rounded-[18px] rounded-br-md bg-ink px-[15px] py-3 text-[17px] leading-snug text-cream">{m.text}</p>
            </div>
          ),
        )}

        {busy === "score" && pending && (
          <>
            <div className="flex max-w-[86%] flex-col items-end gap-1 self-end opacity-70">
              <span className="pr-1 text-[13px] text-muted">You</span>
              <p className="rounded-[18px] rounded-br-md bg-ink px-[15px] py-3 text-[17px] leading-snug text-cream">{pending}</p>
            </div>
            <p role="status" className="flex items-center justify-end gap-2 text-sm text-muted">
              <Spinner /> Reading your words
            </p>
          </>
        )}

        {busy === "child" && (
          <>
            <SamBubble typing />
            <p className="-mt-2 ml-10 text-sm text-muted">Sam is thinking about it…</p>
          </>
        )}

        {showIdea && idea && (
          <div className="mt-auto flex flex-col gap-2.5 rounded-2xl border border-line bg-paper px-4 py-3.5">
            <span className="label-caps">{ideaLabel}</span>
            <p className="text-[17px] leading-relaxed">&ldquo;{idea}&rdquo;</p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-orange"
                onClick={() => {
                  setText(idea);
                  setShowIdea(false);
                }}
              >
                Use this
              </button>
              <button type="button" className="min-h-11 rounded-full px-3.5 text-[15px] font-semibold" onClick={() => setShowIdea(false)}>
                Hide
              </button>
            </div>
          </div>
        )}
      </div>

      <footer className="sticky bottom-0 -mx-4 border-t border-line bg-white px-4 pb-3 pt-2.5 sm:mx-0 sm:rounded-t-2xl sm:border-x">
        {ended && (
          <div role="status" className={`anim-rise mb-2.5 flex items-center gap-3 rounded-2xl px-4 py-3 ${outcome.tone}`}>
            <Sam face={faceFor(lastState)} size={44} />
            <div>
            <p className="text-[17px] font-extrabold">{outcome.title}</p>
            <p className="mt-0.5 text-[15px] leading-snug text-soft-ink">{outcome.text}</p>
            </div>
          </div>
        )}
        {ended && (
          <button type="button" className="btn-primary mb-1 h-14 w-full text-lg" onClick={onFinish}>
            See my score <Arrow size={20} />
          </button>
        )}
        {canType && (
          <>
            <div className="flex min-h-6 items-center justify-between">
              {idea && parentTurns === 0 && !showIdea && !waiting ? (
                <button type="button" onClick={() => setShowIdea(true)} className="h-8 text-[15px] font-semibold underline underline-offset-[3px]">
                  Need an idea?
                </button>
              ) : (
                parentTurns > 0 && !busy ? (
                  <button type="button" onClick={onFinish} className="h-8 text-[15px] font-semibold underline underline-offset-[3px]">
                    Stop here, see my score
                  </button>
                ) : (
                  <span />
                )
              )}
              {text.length < 320 && parentTurns > 0 && (
                <span className="text-[13px] text-muted">
                  Reply {parentTurns + 1} of {MAX_PARENT_TURNS}
                </span>
              )}
              {text.length >= 320 && (
                <span aria-live="polite" className={`text-[13px] font-semibold ${text.length >= 390 ? "text-ink" : "text-muted"}`}>
                  {text.length} / {MAX_CHARS}
                </span>
              )}
            </div>
            {error && <p className="mt-1 text-sm font-semibold text-bad">{error}</p>}
            <div className="mt-1.5 flex items-end gap-2.5">
              <label htmlFor="reply" className="sr-only">
                What would you say?
              </label>
              <textarea
                id="reply"
                ref={inputRef}
                rows={2}
                value={text}
                maxLength={MAX_CHARS}
                disabled={busy !== ""}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={busy === "child" ? "Wait for Sam…" : parentTurns === 0 ? "What would you say?" : "What do you say next?"}
                className="max-h-32 min-h-[52px] flex-1 resize-none rounded-2xl border-[1.5px] border-field bg-cream px-3.5 py-3 text-[17px] leading-snug outline-none placeholder:text-muted focus:border-ink disabled:border-line disabled:bg-peach-soft"
              />
              {voice.supported && (
                <button
                  type="button"
                  aria-label={voice.listening ? "Stop listening" : "Speak your reply"}
                  aria-pressed={voice.listening}
                  onClick={voice.toggle}
                  disabled={busy !== ""}
                  className={`flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition ${
                    voice.listening ? "animate-pulse border-red bg-bad-soft" : "border-field bg-white"
                  }`}
                >
                  <Mic size={22} />
                </button>
              )}
              <button
                type="button"
                aria-label="Send"
                onClick={send}
                disabled={!text.trim() || busy !== "" || waiting}
                className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-orange text-ink transition duration-150 hover:bg-orange-hover active:scale-95 disabled:bg-track disabled:text-muted"
              >
                {busy === "score" ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-ink border-t-transparent" /> : <ArrowUp size={22} />}
              </button>
            </div>
          </>
        )}
        <p className="mt-2 text-center text-xs text-muted">
          {parentTurns === 0 && !transfer ? "About 2 minutes. No account needed. " : ""}Sam is a pretend toddler. Real children respond differently.
          {quick && " Quick mode: Sam is using prewritten lines right now."}
        </p>
      </footer>
    </div>
  );
}

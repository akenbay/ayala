import type { SamState } from "@/lib/toddler";

/** Sam's face. One silhouette; only a few features change between expressions. */
export type SamFace = "calm" | "resisting" | "meltdown" | "happy";

export function faceFor(state?: SamState | null, opener = false): SamFace {
  if (!state) return opener ? "resisting" : "calm";
  if (state === "going_along" || state === "gave_in") return "happy";
  if (state === "meltdown") return "meltdown";
  return "resisting";
}

const INK = "#30251F";
const SKIN = "#FFDCAE";
const HAIR = "#8A5A1B";
const CHEEK = "#FFB89A";
const TEAR = "#8EC3E6";

/**
 * Simple SVG toddler with four expressions. The wrapper is keyed by face so each change
 * plays one gentle entrance: a 4° tilt when resisting, a small pop when happy, falling tears
 * when melting down. No shaking, no red. All motion stops with reduced motion.
 */
export function Sam({ face = "calm", size = 80, idle = false, label }: { face?: SamFace; size?: number; idle?: boolean; label?: string }) {
  const entrance = face === "resisting" ? "anim-tilt" : face === "happy" ? "anim-pop" : "";
  return (
    <span className={`inline-block ${idle ? "anim-bob" : ""}`} style={{ width: size, height: size }} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <svg key={face} viewBox="0 0 80 80" width={size} height={size} className={entrance}>
        {/* ears, face, hair */}
        <circle cx="14.5" cy="46" r="6" fill={SKIN} />
        <circle cx="65.5" cy="46" r="6" fill={SKIN} />
        <circle cx="40" cy="45" r="26" fill={SKIN} />
        <path d="M17 38c2-14 13-21 24-21 9 0 17 4 21 11-6-2-11-1-15 2 1-3 0-6-2-8-4 6-14 10-28 16z" fill={HAIR} />
        <circle cx="27" cy="53" r="4.2" fill={CHEEK} opacity={face === "happy" ? 0.95 : 0.6} />
        <circle cx="53" cy="53" r="4.2" fill={CHEEK} opacity={face === "happy" ? 0.95 : 0.6} />

        <g stroke={INK} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
          {face === "calm" && (
            <>
              <circle cx="31" cy="44" r="2.4" fill={INK} stroke="none" />
              <circle cx="49" cy="44" r="2.4" fill={INK} stroke="none" />
              <path d="M35 54.5q5 3.5 10 0" />
            </>
          )}
          {face === "resisting" && (
            <>
              <path d="M26 37.5l8 2.6" />
              <path d="M54 37.5l-8 2.6" />
              <circle cx="31" cy="45" r="2.4" fill={INK} stroke="none" />
              <circle cx="49" cy="45" r="2.4" fill={INK} stroke="none" />
              <path d="M35 57q5-2.6 10 0" />
            </>
          )}
          {face === "meltdown" && (
            <>
              <path d="M26 36.5l8-2.4" />
              <path d="M54 36.5l-8-2.4" />
              <path d="M27 41.5l6.5 2.8-6.5 2.8" />
              <path d="M53 41.5l-6.5 2.8 6.5 2.8" />
              <ellipse cx="40" cy="57" rx="5.6" ry="4.6" fill={INK} stroke="none" />
            </>
          )}
          {face === "happy" && (
            <>
              <path d="M27 45q4-4.5 8 0" />
              <path d="M45 45q4-4.5 8 0" />
              <path d="M32.5 52.5q7.5 8 15 0" />
            </>
          )}
        </g>
        {face === "meltdown" && (
          <>
            <path className="anim-tear" d="M29 50c0 2.2-1.4 3.6-2.6 3.6S23.8 52.2 23.8 50s2.6-5 2.6-5 2.6 2.8 2.6 5z" fill={TEAR} />
            <path className="anim-tear" style={{ animationDelay: "0.8s" }} d="M56.2 50c0 2.2-1.4 3.6-2.6 3.6S51 52.2 51 50s2.6-5 2.6-5 2.6 2.8 2.6 5z" fill={TEAR} />
          </>
        )}
      </svg>
    </span>
  );
}

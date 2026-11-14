import { COMMON_ENGLISH, NON_LATIN, SPANISH_STOPWORDS } from "./patterns";

export const MAX_CHARS = 400;

export type Validation = { ok: true; text: string } | { ok: false; error: string; code: string };

/** Checks that the input is a real English sentence of reasonable length. */
export function validateParentText(raw: unknown): Validation {
  if (typeof raw !== "string") return { ok: false, code: "empty", error: "Type what you would say to your child." };
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return { ok: false, code: "empty", error: "Type what you would say to your child." };
  if (text.length > MAX_CHARS) {
    return { ok: false, code: "too_long", error: `Keep it under ${MAX_CHARS} characters. Toddlers follow short sentences best.` };
  }
  if (NON_LATIN.test(text)) {
    return { ok: false, code: "language", error: "English only for now. Other languages are coming." };
  }
  const words = text.toLowerCase().match(/[a-z']+/g) ?? [];
  const known = words.filter((w) => COMMON_ENGLISH.has(w)).length;
  const spanish = (text.match(SPANISH_STOPWORDS) ?? []).length;
  if (words.length >= 2 && spanish >= 2 && known / words.length < 0.34) {
    return { ok: false, code: "language", error: "English only for now. Other languages are coming." };
  }
  if (words.length < 2) {
    return { ok: false, code: "too_short", error: "Write a full sentence, the way you'd really say it to your child." };
  }
  if (known === 0) {
    return { ok: false, code: "gibberish", error: "That doesn't look like a sentence. Try writing what you'd actually say." };
  }
  return { ok: true, text };
}

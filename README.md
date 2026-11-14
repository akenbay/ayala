# CalmRehearsal

**Practice what to say to your toddler before the hardest five minutes of your day.**

CalmRehearsal is a web app for working US parents of 2 to 4 year olds. Pick a hard moment (leaving the playground, bedtime, hitting a sibling), type what you would really say, and a practice toddler pushes back. The app scores **your own words** against a rubric based on CDC parenting guidance, quotes the exact words that helped or hurt, and lets you retry. Then you handle a new situation with no script, to show the skill transfers.

Built for Zimran Business Cup 2026 (Skills track).

**Live:** `https://YOUR-DEPLOYMENT.vercel.app` (replace after deploying)

---

## Try it in 60 seconds (for the jury)

1. Open the link. No sign up.
2. Leave "Leaving the playground" selected, pick an age, press **Start practicing**.
3. Read the example script (its score and tags are computed live by the same rubric), press **I'm ready to practice**.
4. Type anything you like, or press **Try a sample answer** (a labeled weak answer that runs through the real pipeline). Press **Say it**. The toddler replies. Reply once more or press **See my score**.
5. Read the scorecard: every point won or lost quotes your words. Press **Try again with what you learned**.
6. See the side by side comparison, then **Try a new situation on my own** (no script).
7. Open **Progress** for your history, weakest skill and 7 day plan.
8. Open **Plus**, press **Get Plus**, pay with Stripe test card **4242 4242 4242 4242**, any future date, any CVC. The locked scenario and plan days unlock.

Type the same sentence twice: you get the same score (temperature 0 where supported, plus a result cache keyed on scenario, age and text).

---

## How the score works

The score is computed **in code first**. A language model is used only for judgments code can't make, and it must quote the parent's words.

| Dimension (points) | Check | Method |
|---|---|---|
| Clear direction (25) | States the direction instead of asking ("Can you...?", "okay?") | Code |
| | One direction at a time | Code (counts imperative clauses) |
| | Specific action, not vague ("be good") | Code list, then model with quote |
| | Says what to do, not only what to stop | Code |
| Calm and respectful (20) | No yelling (capitals, repeated "!") | Code |
| | No insults, shaming or physical punishment | Code list, then model |
| | No empty or outsized threats | Code |
| Names the feeling (20) | Acknowledges the feeling or wish | Code patterns, then model with quote |
| Holds the limit (20) | States the limit clearly | Code patterns, then model with quote |
| | No bribe, no backing down | Code |
| | Any warning is calm and doable | Code, then model |
| Positive guidance (15) | Offers two acceptable choices | Code ("X or Y"), model confirms |
| | Alternative action or specific praise | Code patterns, then model with quote |

Rules enforced in `lib/rubric/score.ts`:

- **Code wins** whenever its result is certain (for example a vague phrase from the list, a question opener, capitals).
- A model verdict is **discarded** unless its quote is an exact substring of what the parent typed.
- Only the **parent's text** is scored. The toddler's replies never enter the scoring function.
- If nothing constructive was said, "nothing bad happened" checks earn half points, so empty or off-topic text can't score well.
- Prompt injection and off-topic input never reach the model and are capped at 10.
- **Hitting a sibling** is a safety-first scenario: the CDC puts the limit first, so naming the feeling is not scored there and the total is rescaled to 100.
- If the model call fails, the app retries once, then falls back to code checks only and shows "Quick mode".

CDC sources behind the checks:

- [Tips for Giving Directions](https://www.cdc.gov/parenting-toddlers/communication/giving-directions.html): be specific, state it rather than ask, say what to do instead, offer choices.
- [Steps for Giving Good Directions](https://www.cdc.gov/parenting-toddlers/directions/good-directions.html): avoid unclear directions like "be good"; two choices are best for young children.
- [Answers from Experts](https://www.cdc.gov/parents/essentials/toddlersandpreschoolers/directions/answersfromexperts.html): toddlers can't remember more than one thing at a time.
- [Essentials for Parenting Toddlers](https://www.cdc.gov/parenting-toddlers/site.html): communication, rules, consequences.

The test set in `tests/rubric.test.ts` covers the guide's cases: low, middle and high answers, each failing check, injection, gibberish, 400 characters, Spanish and Russian, the hitting rule, every curated script scoring 85+, repeatability, and that every quote is an exact substring.

---

## Stack

- Next.js 16 (App Router) with TypeScript, Tailwind CSS 4
- OpenAI ChatGPT model through the Chat Completions API, server side only (temperature 0 where the model supports it). Anthropic is an optional alternative
- Stripe Checkout in test mode
- Zod for input and model output validation
- Vitest for the rubric tests
- No database: progress lives in `localStorage` with an anonymous session id

```
app/
  page.tsx              landing and quiz
  practice/page.tsx     script, chat, scorecard, retry, compare, transfer
  progress/page.tsx     history, weakest skill, 7 day plan
  pricing/page.tsx      paywall (Stripe test mode)
  api/score             POST: scores one parent message
  api/toddler           POST: practice toddler reply
  api/checkout          POST: creates a Stripe test session; /verify confirms it
lib/
  scenarios.ts          scenarios, scripts, weights, transfer variants
  rubric/               types, patterns, code checks, model checks, scoring, validation, CDC sources
  toddler.ts            roleplay prompt and offline fallback replies
  storage.ts            localStorage store, plan builder
tests/rubric.test.ts    rubric test set
```

---

## Run locally

```bash
npm install
cp .env.example .env.local   # add your keys
npm run dev                  # http://localhost:3000
npm test                     # rubric tests
```

Environment variables (all optional; the app still works without them):

| Variable | Purpose |
|---|---|
| `OPENAI_API_KEY` | ChatGPT model for semantic checks and the toddler (default provider) |
| `LLM_MODEL` | Model name from your OpenAI dashboard (default `gpt-5.6-luna`) |
| `LLM_PROVIDER` / `ANTHROPIC_API_KEY` | Optional: set `LLM_PROVIDER=anthropic` to use Claude instead |
| `STRIPE_SECRET_KEY` | Stripe **test** secret key (`sk_test_...`). Without it, "Get Plus" unlocks in a labeled demo mode |

Keys live only in server environment variables. Nothing secret is committed.

## Deploy

1. Push to a public GitHub repo.
2. Import it in Vercel, add the environment variables, deploy.
3. Replace the live link at the top of this README.

---

## Limits

- Three scenarios, each with one transfer situation. English only for now.
- A practice tool, not medical or psychological advice. The practice toddler is fictional; real children respond differently. The score measures the parent's practice wording, not a child's future behavior.
- No personal data is collected. Please don't enter a child's real name.

## Beyond the 10 slides

- **Why code first:** the jury can read `lib/rubric/codeChecks.ts` and see that every point comes from a rule or a quote-verified model judgment.
- **Price:** $12.99/month, below Positive Parenting Solutions ($14.99/month) and Good Inside ($279/year), positioned as practice rather than content.
- **Growth path:** more moments (getting dressed, car seat, screen time), then older ages, then co-parent practice.

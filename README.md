# Ayala

**Practice what to say to your toddler before the hardest five minutes of your day.**

Ayala is a web app for working US parents of 2 to 4 year olds. Pick one of 15 hard moments (leaving the playground, bedtime, the car seat, daycare drop-off and more) or describe your own, type what you would really say, and a practice toddler pushes back. The app scores **your own words** against a rubric based on CDC parenting guidance, quotes the exact words that helped or hurt, and lets you retry. Then you handle a new situation with no script, to show the skill transfers.

Built for Zimran Business Cup 2026 (Skills track).

**Live:** https://ayala-p6tt.vercel.app

---

## Try it in 60 seconds (for the jury)

1. Open the link. No sign up. **About** is the home page; the header has **Learn**, **Stories** and **My moment**, plus **⚡ Help now** and **Your progress**.
2. Open **Stories** and tap **Leaving the playground** (free). The practice opens right away (age defaults to 3; change it at the top of Stories).
3. Type what you would really say, or tap **Need an idea?** for a labeled sample that runs through the real pipeline. Sam, the practice toddler, replies, and a line under each reply shows how Sam is doing: going along, still resisting, melting down, or got their way (the parent gave in). The practice ends when Sam goes along, melts down or gets their way, or after 3 replies. Sam's state is decided by code from your words, so it can never reward yelling or giving in; ChatGPT only writes Sam's line to fit it.
4. Read the score: one thing to keep, one to change (with its CDC page), and your own words improved and re-scored. **More about this reply** is open below it: how Sam heard you, every highlighted phrase, the five skills and all 13 checks with their CDC source.
5. Press **Try again with this tip**, then see your before and after.
6. Press **Try a new situation**: a new moment with no tips, to show the skill transfers.
7. Tap **⚡ Help now**: pick a moment for three lines to say, or type one ("she won't brush her teeth") and AI writes a script for it. Then open **My moment** → **Today I lost it**, type what happened and what you said, and practice a better way.
8. Open **Your progress** for the last 30 days, your saved phrases, the 7 day plan and an optional calendar reminder. **See a sample week (demo)** shows labeled demo data.
9. Open **Plus**, pick Yearly ($79, marked Best value) or Monthly ($12.99), press **Get Plus**, pay with Stripe test card **4242 4242 4242 4242**, any future date, any CVC. The locked scenario and plan days unlock.

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
- **Hitting a sibling** and **Running off** are safety-first scenarios: the CDC puts the limit first, so naming the feeling is not scored there and the total is rescaled to 100.
- If the model call fails, the app retries once, then falls back to code checks only and shows "Quick mode".

CDC sources behind the checks:

- [Tips for Giving Directions](https://www.cdc.gov/parenting-toddlers/communication/giving-directions.html): be specific, state it rather than ask, say what to do instead, offer choices.
- [Steps for Giving Good Directions](https://www.cdc.gov/parenting-toddlers/directions/good-directions.html): avoid unclear directions like "be good"; two choices are best for young children.
- [Answers from Experts](https://www.cdc.gov/parents/essentials/toddlersandpreschoolers/directions/answersfromexperts.html): toddlers can't remember more than one thing at a time.
- [Essentials for Parenting Toddlers](https://www.cdc.gov/parenting-toddlers/site.html): communication, rules, consequences.

The test set in `tests/rubric.test.ts` covers the guide's cases: low, middle and high answers, each failing check, injection, gibberish, 400 characters, Spanish and Russian, the hitting rule, every curated script scoring 85+, repeatability, and that every quote is an exact substring.

---

## The coach: feedback on your whole conversation

When you press **See my score**, `/api/coach` reads the whole practice: your replies, Sam's replies and states, and every check with its quote. It returns four things about your own words:

| Part | What it says | How it stays honest |
|---|---|---|
| What happened | Which of your words moved Sam, and how Sam reacted | Built from Sam's code-decided states |
| Keep | Your best phrase, quoted, and why it worked | Quote must be an exact substring of what you typed; never a phrase that also hurt |
| Change | The phrase that hurt most (or what was missing), and why | Same quote rule; whatever caused the ending (giving in, yelling) comes first |
| Your words, improved | Your lowest scoring reply, minimally edited; new words highlighted | Re-scored by the same checks and only shown if it scores higher |

ChatGPT writes these when a key is set; each part that fails a rule is replaced by the code version, and without a key the code coach builds all four (`lib/coach.ts`). The retry then shows your own Change note as the tip, and **Need an idea?** offers your improved sentence.

## Retention: before, during and after the hard moment

Parents don't need another daily obligation; they need help with the next hard moment. So Ayala is built to be useful on bad days, not to demand daily logins.

| When | Feature | Where |
|---|---|---|
| During | **Help me now**: one tap, three lines to say, no chat, no score. Eight ready moments (they work offline) plus "I yelled, how do I repair?". Or type any moment: AI writes a script for it, shown only if it passes the crisis check and has no yelling, shaming, threats or bribes; otherwise a ready script. Free for everyone | `/help`, `app/api/help`, `lib/helpNow.ts` |
| After | **Today I lost it** and **Your own moment**: practice what really happened. First one free, then Plus | `/moment` |
| Building up | **Phrase bank**: save your improved sentence after a practice. Saved words show first in Help me now. 3 free, unlimited with Plus | `components/PhraseBank.tsx` |
| Later visit | **Did you try it at home?** asked about a saved phrase 8+ hours later (It worked / Not yet / It didn't) | home, `/help`, `/progress` |
| Monthly | **Your last 30 days**: moments practiced, Help me now uses, phrases saved, worked at home, biggest skill change, renewal date | `/progress` |
| Billing | **Pause instead of cancel** (Stripe `pause_collection`, 30 days), Stripe portal to cancel or change card, **Restore Plus** by checkout email on a new device | `/pricing`, `app/api/subscription`, `app/api/restore` |

Every Help me now script is tested against the same code rubric (80+ except the calm-first meltdown script) and against the crisis check (`tests/helpNow.test.ts`). Restore by email is test mode only; before real payments it should send a one-time link instead of unlocking directly.

## Learn, then practice

**Learn** (`/learn`) has 11 short lessons (`lib/lessons.ts`) in three groups, each a plain-language summary of one CDC "Essentials for Parenting Toddlers and Preschoolers" topic, with its page linked:

- **The basics:** name the feeling first, give one clear direction, hold the limit calmly, safety first when it gets physical
- **Words that work:** offer two good choices, one step at a time, say what to do (not just "stop"), praise the exact thing
- **When it gets hard:** warnings you'll really follow, stay calm when they push, hard goodbyes

A lesson opens in place with three ideas, phrases to try, one thing to skip and the CDC link, then **Practice it** starts the matching story with the lesson shown as the focus. Tests check that each lesson practices a story that scores its skill and that its phrases have no yelling, shaming, threats or bribes.

**Stories** (`/stories`) has 15 moments with Sam (`lib/scenarios.ts`, `lib/moreScenarios.ts`), grouped as daily routines (bedtime, TV off, getting dressed, bath, teeth, dinner, clean up), out and about (playground, car seat, candy at the store), big feelings (sharing, daycare drop-off, your work call) and safety first (hitting, running off in a parking lot). Leaving the playground and bedtime are free. Each story has a new situation for the same skill, offline replies, and two curated scripts that score 85+.

## Funnel order (a hypothesis we test)

Ad link → the moment, with Sam's first line and the reply box (and a mic) already on screen, "About 2 minutes. No account needed." → or from home: the 7 question quiz, with a "you're not alone" break after question 3 and a "Setting up Sam" screen listing the answers Sam is built from → first practice → one change and your improved sentence → retry → the gain as the hero, plus "Could you actually say this to your child?" (Yes / Not quite, kept with the attempt as a usefulness signal) → paywall with your plan ("7 days on your weakest skill", day 1 done), yearly preselected, exact renewal terms, 14 day guarantee, no countdown timer → "Not now, continue free" goes on to the new situation; Progress is the second paywall.

Most funnel data comes from native apps and is observational, so this order is a hypothesis. Test plan: quiz then paywall vs. quiz then one free practice then paywall, measured by revenue per quiz starter.

## Start quiz, your own moment, and safety

- **Start quiz** (`/start`, 7 taps, about 60 seconds, no email): who you are, the child's age, boy or girl, temperament, hardest moments, what you usually do, and when it happens. Sam then talks like that child (a "big feelings" boy protests louder; a sensitive child sounds teary), what you usually do sets your first focus skill (gives in → holds the limit, yells → calm voice, freezes → clear direction), and the hardest time sets the default reminder.
- **Your own moment** (`/moment`, **My moment** in the header): describe your real situation and Sam plays it. The AI keeps the scene to the parent's own details (no invented places or reasons) and, if the parent reports what the child said, Sam opens with it in first person ("she said I embarrass her" → "You embarrass me!"). **Today I lost it** adds what you actually said, with narration like "I yelled:" removed; it is ready to send, with no made-up earlier line, so you see how Sam hears it, get coached, and practice a better way. Same checks, same coach.
- **Crisis safety** (`lib/safety.ts`): every message and situation is checked in code before anything else. Self-harm, fear of hurting a child, feeling unable to go on, or violence at home stops the practice and shows the 988 Suicide & Crisis Lifeline, the National Maternal Mental Health Hotline (1-833-TLC-MAMA), Childhelp (1-800-422-4453) or the National Domestic Violence Hotline, plus 911 for immediate danger. Nothing is scored. Practice sentences like "I won't let you hit" do not trigger it (tested).
- **CDC grounding**: the coach may only give advice from a short playbook of CDC rules (`lib/rubric/cdc.ts`), each tied to a page: Giving Directions, Steps for Giving Good Directions, How to Use Time-In, Tips for Using Consequences, Tips for Responding to Behavior. Each "Change" note links its page. "How Sam heard it" shows the child's view in one gentle sentence.

## Stack

- Next.js 16 (App Router) with TypeScript, Tailwind CSS 4
- OpenAI ChatGPT model through the Chat Completions API, server side only (temperature 0 where the model supports it). Anthropic is an optional alternative
- Stripe Checkout in test mode
- Zod for input and model output validation
- Vitest for the tests
- No database: progress lives in `localStorage` with an anonymous session id

```
app/
  page.tsx              About (home): what Ayala is, your path, links to every part
  learn/page.tsx        11 lessons in three groups
  stories/page.tsx      15 stories, grouped, plus your own moment
  moment/page.tsx       your own moment and Today I lost it
  help/page.tsx         Help me now
  start/page.tsx        60 second quiz
  practice/page.tsx     chat, score, retry, before and after, transfer
  progress/page.tsx     last 30 days, phrases, skills, 7 day plan, reminder
  pricing/page.tsx      paywall, manage Plus (pause, cancel), restore Plus
  api/score             POST: scores one parent message
  api/toddler           POST: practice toddler reply
  api/coach             POST: feedback on the whole conversation
  api/opener            POST: scene and Sam's first line for your own moment
  api/help              POST: AI-written Help me now script, checked before it is shown
  api/checkout          POST: creates a Stripe test session; /verify confirms it
  api/subscription      POST: pause, resume, Stripe portal
  api/restore           POST: restore Plus by checkout email (test mode)
lib/
  scenarios.ts          the first 3 stories and story groups; moreScenarios.ts has the other 12
  lessons.ts            lessons and lesson groups
  helpNow.ts            Help me now scripts, matching and checks for AI scripts
  rubric/               types, patterns, code checks, model checks, scoring, validation, CDC sources
  toddler.ts            roleplay prompts, own moment opening, offline fallback replies
  coach.ts              the coach and its code fallback
  safety.ts             crisis check
  storage.ts            localStorage store, plan, phrase bank, monthly recap
tests/                  rubric, coach, stories, lessons, Help me now, retention, storage (77 tests)
```

---

## Run locally

```bash
npm install --legacy-peer-deps   # vitest and @types/node have a peer version conflict
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

- 15 stories (2 free, 13 with Plus), each with one new situation for the same skill, plus the parent's own moment. English only for now.
- A practice tool, not medical or psychological advice. The practice toddler is fictional; real children respond differently. The score measures the parent's practice wording, not a child's future behavior.
- No personal data is collected. Please don't enter a child's real name.

## Beyond the 10 slides

- **Why code first:** the jury can read `lib/rubric/codeChecks.ts` and see that every point comes from a rule or a quote-verified model judgment.
- **Price:** $79/year (shown first, marked Best value, $6.58/month) or $12.99/month, with a 14 day money back guarantee. Below Good Inside ($279/year or $84 per 3 months) and Positive Parenting Solutions ($14.99/month), positioned as practice rather than content. The price is visible before any email or account.
- **Acquisition:** one link per pain point, so each ad lands in its own moment: `/practice?s=playground`, `/practice?s=bedtime` (free), and `hitting`, `tv`, `dressed`, `carseat`, `bath`, `teeth`, `dinner`, `store`, `sharing`, `cleanup`, `dropoff`, `work`, `running` (Plus). This follows the pain-specific landing, onboarding, paywall funnel used by Good Inside.
- **Growth path:** more moments by age, then older children (school age, then teens), then co-parent and caregiver practice with a shared phrase bank.

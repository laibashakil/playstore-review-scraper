# ADHD Task-Breakdown App — Review Data Analysis (v2)

Based on 48,756 scraped reviews across 29 apps. Note: 34,582 of those reviews (71%) come
from Finch (self-care pet game) and Habitica (gamified RPG habit tracker) — real apps, but
a different product category from a Goblin-Tools-style breakdown tool. They're used here
as *reference points*, not as the primary evidence base. The core evidence is the other
14,174 reviews across 27 direct-comparison apps — that's still a large, real sample, and
it's where the sharpest signal lives.

Source: `output/reviews.db`. Everything below is read from actual review text, not inferred.

---

## The headline insight

**This category has a live, ongoing natural experiment running inside it, and it already
answered your question.** RoutineFlow used to sell a lifetime/one-time-purchase option.
At some point they pulled it and went subscription-only. Users noticed immediately and are
still angry about it, unprompted, in reviews with no relation to each other:

> *"why did you remove the lifetime option? ... some of us just want to buy an app and then
> stick with that version for a long time, with the peace of mind..."*

> *"there used to be a lifetime option and there no longer is"*

> *"5 stars for the content and features. -3 stars for the yearly/monthly payment
> subscription... Subscriptions is not very ADHD friendly. I would rather see lifetime
> purchase option."*

> *"developer MIA and Lifetime purchase appears to have nullified. What gives? ...best app
> ever!" (2★, despite loving the app)*

That's not a hypothetical A/B test — it's a real product that ran both models on the same
user base and watched people grieve the switch. It's the single strongest piece of evidence
in this dataset, stronger than any aggregate percentage, and it goes straight at your core
bet: **one-time purchase isn't just "nicer," it's something this exact audience has fought
to keep when a company tried to take it away.**

---

## Pain points, ranked by how much they actually matter (not just how often they're typed)

### 1. Monetization dishonesty — the dominant, category-wide complaint
Within the 27 direct-comparison apps (14,174 reviews, 3,382 of them negative), **monetization
anger — subscriptions that are hard to cancel, trials that silently convert to charges, "free"
apps that paywall basic use — shows up in roughly 4 out of every 10 negative reviews.** It's
not one bad app dragging the average down: it's present at meaningful volume in essentially
every subscription-based competitor. Clarify is the worst offender by a wide margin (it
dominates the top-upvoted negative reviews across the *entire* dataset, Finch and Habitica
included), but Inflow, Numo, RoutineFlow, and neurolist all have real, specific, highly-upvoted
versions of the same story.

The specific manipulative patterns that recur across apps, not just once each:
- **Unskippable quiz/questionnaire before you can even see the app**, with price revealed only
  at the very end, often after a countdown timer or "one-time special discount" upsell
  ("Immediately after the initial quizzes, was offered a choice between $200/year or $50/month
  subscription, with a 15 minute timer on this 'offer'. The vilest kind of predatory
  monetisation" — Inflow).
- **Trial that auto-charges without a real warning**, and a cancel flow that's deliberately
  hard to find ("the treasure hunt was on to find the magic button via a convaluted maze on the
  website. I never did find it." — Clarify, 354👍).
- **"Free" app that locks core functionality on first real use**, not eventually — RoutineFlow
  paywalled a *second* routine, Structured paywalled notifications, neurolist locked the app
  after 4 tasks.
- **Removing functionality that existing users already had** (not just future features):
  neurolist removed brain-dump/AI-import from the plan people had already paid for; Inflow
  removed the live coaching sessions that were the thing people loved most; RoutineFlow removed
  the lifetime option itself (see above).

### 2. Reliability — reordering/drag-and-drop is broken almost everywhere
This surprised me. It's not a Goblin Tools quirk — **Goblin Tools, Structured, Brili, and
RoutineFlow all get hit, independently, for the same specific failure**: dragging a task to
reorder it either doesn't work, doesn't save, or silently reverts.
> *"Reordering tasks in the to do list is hit or miss — mostly miss... good luck being able to
> drag and drop to reorder items."* (Goblin Tools, 44👍)
> *"Structured doesn't give you an option to adjust the timing of the tasks after setting
> them (ex: by dragging it)"* (Structured, 82👍)

Nobody in this category has nailed reliable drag-and-drop. That's a genuine, unclaimed
differentiation opportunity through pure craft — not a feature idea, an execution gap.

### 3. Data loss — rare, but it's the fastest way to lose a convert for life
Low frequency, but every single instance is a 1★ review with real venom, and it recurs across
apps that are otherwise well-loved: Goblin Tools ("I check one box out of 20+ and boom, it's
all gone" — 25👍), Habitica ("What you do offline will be erased in the second you turn on
wifi... I lost a lot of progress. Definitely the worst bug/feature." — 195👍, on a 5★ review no
less), Finch ("I lost ALL of my items after using this app for over a year"), Structured, and
Clarify. This is a "never let this happen, ever" requirement, not a "nice to have it work most
of the time" one.

### 4. Time blindness — the single most-named specific ADHD symptom, and RoutineFlow owns it
Not "overwhelm" in general — literally the phrase **"time blindness"** appears constantly, by
name, specifically in praise of RoutineFlow's per-step timers and visible countdowns:
> *"Having timers on the tasks is really helpful. I can see an expected end time for the
> routine so it doesn't feel like it will last forever."*
> *"the countdowns help fight time blindness"*
> *"my Time Blindness is handled by the app's structure"*

This is a specific, concrete, buildable feature (visible time estimate + live countdown per
step, not just a static breakdown), and it's the thing RoutineFlow users credit most directly
for behavior change — not the breakdown itself, but seeing time pass.

### 5. Onboarding gates — actively repel the exact users being targeted
Every app that puts a long quiz/tutorial/questionnaire between download and first real use
gets punished for it, hard, with some of the highest thumbsUp counts of any complaint type in
the dataset (Clarify 196👍, 187👍, 162👍; Inflow 59👍, 39👍, 28👍; RoutineFlow 32👍; neurolist
28👍). The irony is repeatedly called out by name: *"For an app that targets people with ADHD,
they sure give you plenty of time to get distracted before you even try the main
functionality."*

---

## What's working — keep this

- **The breakdown mechanic itself is thoroughly validated.** "Overwhelmed," "task paralysis,"
  "don't know where to start," "executive dysfunction" appear organically and repeatedly in
  5★ reviews across Goblin Tools, Clarify, neurolist, RoutineFlow — people are describing
  themselves, not a hypothetical persona. This is not in question.
- **"Brain dump" as a named, loved, distinct feature** — not the same as breakdown. People want
  to dump messy, stream-of-consciousness thoughts *first*, unstructured, then have AI turn that
  into a list. Numo's version was criticized specifically for capping input length and behaving
  "more of a to do list" than a true dump. Whatever you build, the input box for this needs to
  accept a wall of unedited text with no artificial limit.
- **Positive-only reinforcement, explicitly praised where present.** RoutineFlow gets repeated
  5★ praise specifically for *not* punishing missed/skipped steps ("doesn't punish you for not
  doing everything on your list," "no gimmicks or reward systems to add pressure... no negative
  reinforcement for not completing or skipping tasks"). Contrast with Habitica, where the
  penalty mechanic (losing health/leveling down for missed dailies) is a recurring complaint
  source, not a delight source. **Reward completion; never penalize incompletion** is a design
  principle this category has already tested for you.
- **One-time / lifetime pricing, wherever it exists, gets called out by name as the reason
  someone chose the app** — not just tolerated, actively cited as the deciding factor (Goblin
  Tools, RoutineFlow's now-removed lifetime tier, several "I'd pay once but not monthly"
  comments on neurolist and RoutineFlow).
- **Being genuinely cross-platform from day one is an open lane.** Structured Daily Planner has
  an extensive, well-documented pattern of Android users getting a worse app than iOS users —
  no AI feature, no cross-device sync, no widgets, missing drag-and-drop — repeated across a
  dozen distinct reviews. Building in Expo/React Native with real platform parity from the
  start is a legitimate, evidenced differentiator against at least one major player.

---

## Feature list

### Must-build
1. **One-time purchase (or a free core + one-time unlock), full stop.** The RoutineFlow
   lifetime-removal backlash is your strongest single piece of evidence — this audience has
   already fought to keep this exact model.
2. **Bulletproof local persistence, tested against the specific failure modes seen here**:
   checking a box, closing the app mid-edit, an app update, going offline-then-online. Every
   one of those triggered real data loss somewhere in this dataset.
3. **A true brain-dump box**: unstructured, no character cap, AI parses it into a structured
   list — as a distinct first step before "breakdown," not folded into it.
4. **Editable AI output.** Multiple complaints across apps: AI breakdown that can't be edited,
   re-ordered, or corrected feels like "just a ChatGPT wrapper," not a tool.
5. **Reliable drag-and-drop reordering.** Sounds boring; is a real, unclaimed gap across the
   entire category.
6. **A visible per-task/per-step time estimate with a live countdown while it's in progress** —
   not just an estimate shown once. This is what RoutineFlow users specifically credit for
   behavior change around time blindness.
7. **Zero onboarding gate.** Let someone type a task and get a breakdown within seconds of
   opening the app, before any account/quiz/paywall.
8. **Reward-only feedback loop** (a satisfying checkmark/animation on completion) with **no
   punishment, streak-loss, or guilt messaging for skipped/incomplete items.**

### Should-build (v1.1–v2)
- Home-screen widget (near-universally requested across the category, not urgent for launch)
- Multiple/separate lists by category
- Adjustable font size / high-contrast mode (Goblin Tools was specifically dinged for lacking
  this despite serving a dyslexia-adjacent audience — cheap to build, genuinely underserved)
- Google Calendar two-way sync
- Recurring/repeating tasks
- Custom icon/emoji per task

### Do NOT build
- **Onboarding personality quizzes**, even short ones. Every app that gates first use behind
  one gets punished for it specifically and by name, regardless of how good the app is once
  you get through.
- **Punishment-based gamification** (health loss, streak resets, level decay). Directly
  contradicted by what this exact audience praises when absent.
- **Social/live-presence features** (live co-working, guild chat, community feed) — worth
  flagging honestly: Inflow's live co-working sessions are genuinely, strongly loved where they
  exist (274👍 on one review), so this isn't a "nobody wants this" case — it's excluded by your
  own stated constraints and by the mechanic not personally resonating with you, both of which
  are valid reasons to leave it out. Just know you're leaving a real, evidenced want on the
  table on purpose, not because the data says no.
- **A loud default sound/haptic profile.** Called out specifically on Clarify ("the sounds are
  atrocious... If this app was made for people with ADHD sound sensitivity is a thing").
  Sensory sensitivity co-occurs with ADHD often enough that this isn't a nitpick.
- **Removing or degrading anything a paying user already has**, ever, for any reason — the
  single fastest way to turn a 5★ review into a 1★ one in this data (neurolist, Inflow,
  RoutineFlow all did this and all got burned for it, specifically and by name).
- **Rebuilding Goblin Tools' full tool-belt** (Chef, Formalizer, Judge, etc.) in month one.
  Those are loved *bonuses* layered on an already-good core, not the validated wedge itself.
  Task breakdown + brain dump is the proven core; the rest is scope creep until you've shipped.

---

## Monetization

**One-time purchase, roughly $5–$8**, or a genuinely full-featured free core with a one-time
unlock for depth features (multi-list, widget, themes) — not a gate on the core mechanic
itself. This isn't a vibes-based recommendation:

- The RoutineFlow lifetime-removal backlash (above) is a real, unprompted, negative case study
  of taking this model *away* from people who already had it.
- Goblin Tools' one-time price is repeatedly cited by name as the reason people chose it over
  competitors charging "$10 or more a month... to do anything different than Goblin Tools."
- People in this exact dataset say, in their own words, why subscriptions specifically target
  them: *"I'm an adhd-er, guys! I forgot to cancel... I kinda hoped you'd remind me... but no,
  it's just a silent action"* — this isn't abstract; it's a specific vulnerability this audience
  names about itself, unprompted, across multiple apps.
- Avoid gating the core mechanic (that's exactly what got RoutineFlow and neurolist torched:
  "Misleading 'Free' App, Functionality Locked Immediately"). Charge for depth, not for access.

---

## Positioning

> **"RoutineFlow took away the lifetime option people paid for. Clarify hides the cancel button
> until they've charged you twice. We do what Goblin Tools does — one honest payment, forever —
> and we don't lose your list when you check a box."**

Every clause is a sourced, specific claim from this dataset, not a generic "better UX" pitch.

---

## Be careful about

- **Reordering/drag-and-drop is a trap for solo devs** — it looks trivial and every competitor
  in this category has visibly failed at it. Budget real time for this, don't treat it as an
  afternoon's work.
- **Don't let "no subscription" become "no revenue plan."** The data supports one-time
  purchase strongly, but you still need a sustainable price point for a solo dev — $3.49
  (Goblin Tools' price) may be too low to sustain you long-term; $5–8 one-time is still an easy
  yes for this audience based on what they already pay for competitors' worse experiences.
- **A light reward layer can misfire if it's not carefully positive-only.** Some users
  explicitly want *more* dopamine/reward feedback (a 2★ Yoodoo review literally says "no
  reward mechanism equals no dopamine... needs work"), while others explicitly want *zero*
  pressure. The synthesis that satisfies both, based on this data, is: reward completion
  generously, never penalize non-completion, and make any reward layer skippable/mutable for
  the people who find it distracting.
- **If you ever add tiers, never remove something a user already paid for** to push them to a
  higher tier — this specific move (not a hypothetical) tanked reviews on three separate apps
  in this dataset.
- **AI-ethics discomfort is real but small** (single-digit mentions: "uses an open ai model...
  not ethical," "terrible for the environment"). Don't design around it, but a quiet, honest
  answer if asked is enough — it's a values-based minority view, not a broad blocker.

---

## Methodology note

Core evidence base: 14,174 reviews across 27 apps directly comparable to a task-breakdown
tool (all apps except Finch and Habitica, which are much larger apps in an adjacent-but-
different category — self-care/gamified-RPG — kept as reference points, not primary
evidence). All quotes are verbatim from scraped review text; 👍 = thumbsUp count at scrape
time (Aug 14, 2026). Findings were built by reading actual top-upvoted reviews per theme
across apps, not solely by counting keyword matches — several early keyword-based counts
(e.g. "notification" mentions, generic "%category%" matches) turned out on inspection to be
mostly neutral or false-positive and were dropped rather than reported as complaint volume.

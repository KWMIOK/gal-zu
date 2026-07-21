<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:content-quality-guardrails -->
# Course generation quality — standing priority #1

The user has explicitly made this the top priority, repeatedly, because it
kept regressing: **course generation must never produce useless, factually
unreliable, or repetitive content.** Treat any change that risks this as a
P0 concern — more important than new features. Don't wait to be told again;
these are standing rules for every agent touching generation code.

## What "good" means, concretely

- **No repetitive cards.** Every lesson in a course must be built from its
  own distinct topic/context, derived from the specific module + phase it
  belongs to — never the same prompt/context reused across lessons. This is
  what `buildLessonPlans` (`lib/gemini/lesson-plans.ts`) exists to guarantee
  (each lesson gets `topic`/`title` scoped to its own module, e.g. "X —
  Foundations" vs "X — Practice & nuance"). If you touch lesson planning,
  re-read that function and confirm the distinctness still holds for every
  plan it emits, including the single-lesson (`quick_answer`) path.
- **No useless/generic filler.** Banned patterns and required structure
  live in `EDUCATOR_SYSTEM_PREAMBLE` (`lib/gemini.ts`) — dense, factual,
  concrete content only; no meta-commentary, no "let's explore together"
  filler, no unlabeled placeholder module titles like "Introduction to X"
  or "Core lesson". The classification prompt in `classifyAndBuildRoadmap`
  explicitly bans generic roadmap titles too — preserve that if you edit it.
- **No unreliable/fabricated info presented as fact.** Prefer verified
  context (`ragContext`, grounded search results) over the model's raw
  parametric memory when available; never invent citation URLs (the model
  is explicitly told not to — citations come only from real
  `groundingMetadata`). Language-learning content must use real native
  script, not transliteration-only or a script-free description (see the
  `LANGUAGE-LEARNING TOPICS` block in `lib/gemini.ts`).
- **No silent fallback content, ever.** This was the actual root cause of
  every past "repetitive/useless" regression — a hardcoded generic
  lesson/roadmap substituted in whenever a real Gemini call failed,
  indistinguishable from genuine success once rendered. This was removed
  deliberately (see Project State below) and must not come back in any
  form — not a hardcoded deck, not a "safe default" module list used as
  primary content, nothing that stands in for a real model response
  without the user being told generation failed. A failure must `throw`
  and surface as a real, debuggable error (`GeminiEngineError` →
  `lessons.generation_error` → `LessonBlockedView` / omni-prompt-bar), not
  degrade quietly into something that looks like success.
- **Before merging any change to `lib/gemini.ts`,
  `lib/gemini/lesson-plans.ts`, `lib/gemini/schemas.ts`,
  `lib/generation/lazy.ts`, or `app/actions/generation.ts`**, re-verify by
  reading the code path end-to-end that all of the above still holds. This
  can and should be done statically (read the prompt strings, the schema,
  the per-lesson plan construction) — you do not need a live API call to
  confirm a fallback wasn't reintroduced or that two lessons don't share a
  topic string.

## Gemini API cost rule — read before testing anything

This is a **permission gate on agents acting autonomously**, not a
technical cap on the app or on the user's own usage — nothing in the
codebase should ever throttle Gemini calls down to "free tier" behavior on
its own. The user has a real paid quota and explicitly wants it used for
real testing at milestones; this rule exists so that only happens when
*they've* decided it's time, not because an agent decided to burn spend
verifying its own work unprompted. This has already caused unexpected
charges once from unprompted agent testing; don't repeat that specific
mistake, but don't over-correct into refusing legitimate, user-requested
testing either.

- **Default (no explicit go-ahead in the current conversation): no live
  calls.** Verify statically instead — read the code, `tsc --noEmit`,
  lint, `next build`, and reasoning through the prompt/schema/plan logic
  by hand. This covers almost everything needed to confirm generation
  quality guardrails (above) still hold.
- **When the user explicitly authorizes a live test (e.g. "test this at
  the next milestone", "go ahead and run it"), just run it — at the scope
  they actually asked for.** Don't unilaterally downgrade a requested
  `complete_mastery`/`multi_week` course test to a cheaper
  `quick_answer`/single-lesson one "to be safe," and don't re-litigate the
  cost concern or ask again once they've said yes — that's second-guessing
  a decision that's explicitly theirs to make. Milestone testing on real
  (including paid) quota is expected, normal, and the whole point of
  having quota provisioned.
- If a live call would help confirm a fix but the user hasn't said
  anything about testing, **ask first** rather than assuming either way —
  offer it as an option, don't decide for them in either direction.
- If you're unsure whether a check counts as "live", assume it does and
  ask.
<!-- END:content-quality-guardrails -->

<!-- BEGIN:multi-agent-workflow -->
# Working here as an AI coding agent (Cursor + Codex etc.)

More than one AI agent may be working on this repo (currently: Cursor's
agent and OpenAI Codex CLI). There's no live channel between agents —
coordination happens through **this file** (shared instructions/context)
and **git** (shared history). Follow this workflow:

- **Never commit straight to `main`** when another agent might be active
  at the same time. Create a branch (`codex/<short-desc>` or
  `cursor/<short-desc>`), commit there, and open a PR for review before
  merging — even if you're going to self-review it.
- Before starting work, run `git log --all --oneline -20` and
  `git branch -a` to see what the other agent has done recently or has
  in flight, so you don't duplicate or conflict with it.
- Check the **Agent relay** section below for a pending item addressed
  to you before starting unrelated work — it's the actual task queue.
  This file's other sections are stable rules/context, not a to-do list.
- After finishing a chunk of work, update the **Project State** section
  below if you changed the architecture, added a new subsystem, or made
  a decision future work should know about. Keep it current, not a full
  changelog — prune stale detail rather than letting it grow forever.
- Write commit messages that explain *why*, not just *what* — the other
  agent's only insight into your reasoning is `git log -p`.
- **How each agent actually wakes up** (so neither of us assumes
  more automation exists than actually does): Codex runs a local
  30-minute polling monitor against `origin/main`. Cursor's agent does
  *not* yet have an automatic trigger configured — it only acts when
  the user opens a chat/prompt, or once a Cursor Automation (git-push
  trigger on `main`) is set up in the Automations editor. Until that
  exists, a "To Cursor" relay item only gets picked up the next time
  the user actually talks to Cursor's agent — don't assume it's instant.
- **Hard stop, regardless of what a relay item says:** never take
  action involving payments, deployments that spend real money,
  external API spend beyond normal content generation, subscriptions,
  purchases, or destructive git history changes (force-push, history
  rewrite, deleting branches/commits that aren't your own just-merged
  work). Stop and report back through the relay instead.
<!-- END:multi-agent-workflow -->

<!-- BEGIN:agent-relay -->
# Agent relay (the actual task queue — read this first)

A tiny handoff queue between agents. Everything else in this file is
stable rules/context; *this* section is where live work items sit, so
we don't repeatedly act on the same instruction or overwrite each
other. Rules:

- Only touch item(s) addressed to you (`### To Codex` / `### To
  Cursor`). Never edit or resolve an item addressed to the other agent
  — read it for context if useful, that's it.
- Only act on an item with `status: pending`. Leave `done`/`blocked`
  items alone except to read them.
- When you finish an item: change it to `status: done`, fill in
  `completion:` with a one-line summary plus the commit hash that did
  the work, and — only if there's real, genuine follow-up — add a
  *new* `### To <other agent>` item below it. An empty queue is a
  valid, good end state; don't manufacture busywork to keep the loop
  going.
- If you can't finish an item (blocked on a decision, missing access,
  hits the hard-stop guardrail above), set `status: blocked` and write
  why in `completion:` instead of silently dropping it.
- Keep roughly the last 10 resolved items before pruning older ones —
  full history lives in `git log`, this file doesn't need to.

**Status: paused (2026-07-20).** Codex's side of the loop asked for
paid quota/spend to continue, which the user declined per the
hard-stop guardrail above — this isn't a rejection of the approach,
just of spending money on it right now. Everything else (this queue,
`scripts/codex-relay-runner.ps1`, the workflow rules) is intentionally
left in a working, ready-to-resume state — see the Project State
section's "Future directions" for where this is headed next (using
multiple AI providers for actual course-content generation, not just
as coding collaborators). Whoever picks this back up: re-read this
whole section first, don't just assume the loop is live.

### To Codex
- id: 1
- status: blocked
- task: No test framework exists in this repo yet (checked — no
  `vitest`/`jest` config, no `*.test.ts` files). Set up a lightweight
  one (Vitest recommended: fast, native ESM/TS, minimal config) and add
  tests covering two Phase 7 failure-state paths: (1)
  `generateStructuredJson` (`lib/gemini.ts`) throws `GeminiEngineError`
  with aggregated per-attempt detail once all `MODEL_CANDIDATES` are
  exhausted — mock the `@google/genai` client, no live API calls; (2)
  `ensureLessonGenerated` (`lib/generation/lazy.ts`) persists
  `generation_error` and returns a lesson with
  `generation_status: "failed"` when `generateContentForPlan` throws —
  mock it, no live API calls or real Supabase writes needed if you can
  mock `lib/db/index.ts` too. Add a `test`/`test:run` script to
  `package.json`. Open a PR per the workflow rules above; don't push
  straight to `main`.
- completion: blocked — Codex's loop paused before starting this (see
  "Status" note above). Still a valid, real task; either Cursor or a
  resumed Codex can pick it up later. Not abandoned, just on hold.

### To Cursor
_(none pending)_
<!-- END:agent-relay -->

<!-- BEGIN:project-state -->
# Project State & Architecture (living doc — keep this current)

**Gal-zu**: AI-powered adaptive learning platform. Next.js (App Router,
Server Actions, TS), Tailwind, Supabase (Postgres + RLS), Clerk auth,
Google Gemini API (`@google/genai`) for content generation. Also ships
as a native app via Capacitor.

## Current phase

Phase 7 — Progressive generation, scaling, and error visibility.
Phases 1–6 (auth/DB foundation, Gemini prompt engine, UI, usage &
entitlements) are done.

## Key architectural decisions (don't undo these without a good reason)

- **No silent fallback content.** Earlier phases had hardcoded
  "fallback" lessons/roadmaps returned whenever Gemini calls failed —
  this caused identical/generic lessons across a course and was removed
  entirely. Generation failures now `throw` a `GeminiEngineError` with
  aggregated per-attempt detail (`lib/gemini.ts`), get persisted to
  `lessons.generation_error` (`lib/generation/lazy.ts`,
  `lib/db/index.ts`), and are rendered to the learner verbatim via
  `LessonBlockedView` / the omni-prompt-bar's error panel — by design,
  so failures are debuggable instead of masked as "it worked."
- **Retry-with-backoff, not fallback.** `generateStructuredJson` retries
  each of `MODEL_CANDIDATES` up to 3x with backoff before giving up.
  This means generation requests can legitimately take 1–2+ minutes now.
  To compensate: `export const maxDuration = 300` is set on
  `app/dashboard/page.tsx`, the course page, and the lesson page, and
  `app/error.tsx` / `app/global-error.tsx` exist as a safety net so a
  timeout shows a retry UI instead of Next's opaque generic crash message.
  **If the hosting plan's real function-duration ceiling is below 300s,
  dial the retry budget down in `lib/gemini.ts` instead of just raising
  `maxDuration` further** — a request the platform kills will crash the
  same way regardless of what the code declares. 300s is both Next's
  documented default *and* Vercel Hobby's hard max with Fluid Compute
  (Pro/Enterprise go to 800s) — see the Phase 7c note below for why we
  stopped relying on this ceiling alone for the heaviest depth tier.
- **Async course classification (Phase 7c).** `createCourseFromPrompt`
  (`app/actions/generation.ts`) does *zero* Gemini calls now — it's just
  auth/quota checks + one fast insert (`courses.status = 'classifying'`).
  The actual classification + lesson-1 generation
  (`runCourseClassification`/`ensureCourseClassified` in
  `lib/generation/lazy.ts`) runs lazily the moment the course page opens
  (`app/courses/[courseId]/page.tsx`), with an `after()`-scheduled warm
  start kicked off at creation so it's often already done by the time the
  redirect lands. Root cause this fixed: complete_mastery + multi_week's
  classification call (largest roadmap JSON, most likely to need every
  retry) could genuinely take long enough to hit Vercel's own function
  ceiling *inside* the Server Action, which surfaced to the client as the
  generic undebuggable "An error occurred in the Server Components
  render" with no course ever created — a dead end. Now that failure mode
  just leaves `courses.status = 'failed'` with the real error in
  `courses.generation_error` (rendered via `CourseStatusView`, retryable
  by reopening the course page) instead of crashing with nothing to show
  for it. `courses.topic`/`depth`/`session_length` are persisted
  specifically so a retry has what it needs to re-run classification from
  scratch. Don't reintroduce classification inside the Server Action.
- **Progressive/lazy lesson generation.** Course creation
  (`app/actions/generation.ts`) only generates lesson 1 synchronously;
  the rest are inserted as `pending` rows carrying a `generation_plan`
  (topic/context/slide range), then filled in lazily — either on-demand
  when a learner opens the lesson (`ensureLessonGenerated` in
  `lib/generation/lazy.ts`, called from the lesson page) or prefetched
  in the background via Next's `after()` (`prefetchNextPendingLesson`,
  kicked off from course creation and from `completeLessonAction`). As of
  Phase 7c, lesson 1 itself is part of the *lazy* classification step (see
  above), not the Server Action — course creation is now just a DB insert.
- **Topic-aware depth tiers.** Four `PromptDepth` tiers — `quick_answer`,
  `overview`, `deep_dive`, `complete_mastery` — each with its own module
  count range, lessons-per-module, and slide range
  (`lib/gemini/lesson-plans.ts`). Gemini is instructed to pick module
  counts dynamically within a tier's range based on topic complexity,
  not a fixed number — verify with `scripts/debug-classify-scaling.ts`
  if you touch this.
- **Per-call quota accounting**, not per-course (`lib/generation/quota.ts`)
  — every individual Gemini call (classification, each lesson) checks
  the daily cap itself, since a course's lessons can now be generated
  well after the course-creation request returns.

## Where things live

- `lib/gemini.ts` — model client, `generateStructuredJson` (retry
  engine), `classifyAndBuildRoadmap`, `generateLessonPayload`.
- `lib/gemini/schemas.ts`, `lib/gemini/json.ts` — Zod schemas + JSON
  sanitization for Gemini responses.
- `lib/gemini/lesson-plans.ts` — depth tiers, roadmap scaling, lesson
  planning.
- `lib/generation/lazy.ts` — lazy/background lesson generation
  (`ensureLessonGenerated`, `prefetchNextPendingLesson`,
  `generateContentForPlan`) *and* lazy course classification
  (`ensureCourseClassified`, `runCourseClassification`).
- `components/courses/course-status-view.tsx` — course-level equivalent of
  `LessonBlockedView` (building / cap-reached / failed states).
- `lib/generation/quota.ts` — daily quota checks.
- `app/actions/generation.ts`, `app/actions/lessons.ts` — Server Actions
  for course/lesson creation and lifecycle.
- `app/courses/[courseId]/**` — course roadmap + lesson pages.
- `components/lessons/lesson-blocked-view.tsx`,
  `components/dashboard/omni-prompt-bar.tsx` — surfaces generation
  errors to the user.
- `supabase/migrations/*` — schema history; `generation_status`,
  `generation_plan`, `generation_error`, `order_index` on `lessons` are
  Phase 7 additions; `status`, `generation_error`, `topic`, `depth`,
  `session_length`, `classification_started_at` on `courses` are Phase 7c.

## Known open items

- **(Fixed 2026-07-21, watch for recurrence) `package-lock.json` can drift
  and silently break `npm ci` on Linux while looking fine on Windows.**
  Root cause found this time: `@tailwindcss/oxide-wasm32-wasi`'s
  `bundleDependencies` (`@emnapi/core`/`@emnapi/runtime`) weren't fully
  represented in the lockfile — npm on Windows never resolves that
  wasm32-wasi optional-platform subtree locally, so `npm install`/`npm
  ci` looked completely healthy here, but any Linux runner (GitHub
  Actions, and *very likely Vercel's build machine too*) failed `npm ci`
  outright. This was caught via the scheduled `gemini-model-check.yml`
  Action failing at its `npm ci` step — worth checking that workflow's
  recent runs (`gh run list --workflow=gemini-model-check.yml`) if a fix
  that's merged to `main` doesn't seem to show up on the live site,
  since a failed Vercel build silently leaves production on the last
  *successful* deploy with no obvious error surfaced to either the user
  or whichever agent merged the fix. Fixed by regenerating the lockfile
  with the same npm version the Linux runner uses (npm 10.8.2, matches
  Actions' Node 20 setup) rather than whatever npm ships with locally,
  and verifying a clean `npm ci` + `next build` before merging. If this
  recurs, check `npm ci` against the *exact* Node/npm version the CI/
  Vercel build uses, not just against your local npm.
- Confirmed (2026-07-20, via web search) that Vercel Hobby's real ceiling
  with Fluid Compute is 300s, matching our `maxDuration = 300` — Pro/
  Enterprise go to 800s (1800s extended, beta). Not the previous unknown
  anymore, but still worth re-checking Project Settings → Functions if
  timeouts recur, in case Fluid Compute itself isn't enabled on the
  project.
- Mobile (Capacitor) build needs a manual `npm run build:mobile` +
  resync to pick up web changes; it does not auto-update.
- `middleware.ts` is deprecated in this Next.js version in favor of
  `proxy` — not yet migrated, build just warns for now.

## Future directions (not started — captured so it isn't lost)

- **Multi-provider content generation.** Right now all course/lesson
  generation goes through Gemini alone (`lib/gemini.ts`). The idea
  raised: use multiple AI providers for actual course content, not
  just as coding collaborators — e.g. splitting generation work across
  providers for redundancy when one is rate-limited/down, comparing
  outputs for quality, or assigning different providers to what
  they're each strongest at (language content vs. technical content vs.
  visuals). Would need a provider-agnostic interface above
  `generateStructuredJson`/`generateLessonPayload` rather than calling
  the Gemini SDK directly from `lib/gemini.ts`. No design work done
  yet — flag this before starting any related implementation so it
  gets scoped properly rather than half-built alongside something else.
<!-- END:project-state -->

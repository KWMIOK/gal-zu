<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

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
- After finishing a chunk of work, update the **Project State** section
  below if you changed the architecture, added a new subsystem, or made
  a decision future work should know about. Keep it current, not a full
  changelog — prune stale detail rather than letting it grow forever.
- Write commit messages that explain *why*, not just *what* — the other
  agent's only insight into your reasoning is `git log -p`.
<!-- END:multi-agent-workflow -->

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
  `app/dashboard/page.tsx` and the lesson page, and `app/error.tsx` /
  `app/global-error.tsx` exist as a safety net so a timeout shows a
  retry UI instead of Next's opaque generic crash message. **If the
  hosting plan's real function-duration ceiling is below 300s, dial the
  retry budget down in `lib/gemini.ts` instead of just raising
  `maxDuration` further** — a request the platform kills will crash the
  same way regardless of what the code declares.
- **Progressive/lazy lesson generation.** Course creation
  (`app/actions/generation.ts`) only generates lesson 1 synchronously;
  the rest are inserted as `pending` rows carrying a `generation_plan`
  (topic/context/slide range), then filled in lazily — either on-demand
  when a learner opens the lesson (`ensureLessonGenerated` in
  `lib/generation/lazy.ts`, called from the lesson page) or prefetched
  in the background via Next's `after()` (`prefetchNextPendingLesson`,
  kicked off from course creation and from `completeLessonAction`).
  This keeps course creation bounded to "one classification + one
  lesson" latency regardless of course size.
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
  `generateContentForPlan`).
- `lib/generation/quota.ts` — daily quota checks.
- `app/actions/generation.ts`, `app/actions/lessons.ts` — Server Actions
  for course/lesson creation and lifecycle.
- `app/courses/[courseId]/**` — course roadmap + lesson pages.
- `components/lessons/lesson-blocked-view.tsx`,
  `components/dashboard/omni-prompt-bar.tsx` — surfaces generation
  errors to the user.
- `supabase/migrations/*` — schema history; `generation_status`,
  `generation_plan`, `generation_error`, `order_index` on `lessons` are
  Phase 7 additions.

## Known open items

- Haven't confirmed the actual Vercel plan's function-duration ceiling
  against the `maxDuration = 300` we've declared — check Project
  Settings → Functions if timeouts recur.
- Mobile (Capacitor) build needs a manual `npm run build:mobile` +
  resync to pick up web changes; it does not auto-update.
- `middleware.ts` is deprecated in this Next.js version in favor of
  `proxy` — not yet migrated, build just warns for now.
<!-- END:project-state -->

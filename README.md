# Gal-zu

**Gal-zu** is an AI-powered adaptive learning platform: a learner types anything they want to learn, picks how deep they want to go, and the app generates a personalized course roadmap plus interactive lessons — slideshows, quizzes, scripts, cheat sheets — tailored to their declared preferences and how they actually engage with the content.

Live app: **[gal-zu.vercel.app](https://gal-zu.vercel.app)** · Ships to web, iOS, and Android from one codebase.

> This README is written for anyone evaluating the project (recruiters, hiring managers, fellow engineers). For the full technical deep-dive — architecture, data flow, every invariant and gotcha — see **[`docs/DEVELOPERS.md`](docs/DEVELOPERS.md)**.

---

## What it does

1. Type a topic into the prompt bar (e.g. *"quantum entanglement"*, *"conversational Japanese"*, *"how transformers work"*) and pick a **depth**: quick answer, overview, deep dive, or complete mastery.
2. Gemini classifies the topic and builds a scoped course roadmap — modules and lessons sized to the depth chosen, never a fixed template.
3. Lessons generate **on demand**, the moment a learner opens them, as interactive slideshows, quizzes, walkthrough scripts, or cheat sheets — never the same content twice.
4. Signed-in learners can set learning styles, pace, accessibility needs, preferred language, and typography; every future lesson (and the whole app UI) adapts to that. Completing lessons and quizzes also quietly nudges a per-user "learning adaptation" profile — no extra AI cost, just smarter defaults over time.
5. Guests get real, unauthenticated access to free-tier depths; signing up and upgrading unlocks the deeper tiers.

## Why it's interesting (engineering highlights)

- **No fake success.** Early iterations silently substituted a generic hardcoded lesson whenever the AI call failed — which quietly produced repetitive, useless content that *looked* fine. That fallback path was torn out on purpose: generation failures now throw a structured error, get persisted, and are shown to the learner verbatim with a retry action. Debuggable failure beats invisible mediocrity.
- **Lazy, cost-aware generation.** Course creation does zero AI calls — it's an instant DB insert. Classification and the first lesson run the moment the course page opens; every later lesson generates only when a learner actually opens it. Nothing prefetches or regenerates in the background, because AI spend on a learner's behalf should always be a direct result of something they asked for, never a guess.
- **Retry engine with real observability.** Structured lesson/quiz JSON is validated against Zod schemas across multiple Gemini model candidates with backoff; a normalization layer smooths out the model's inconsistent field-naming before validation, and a Fisher–Yates shuffle removes the model's bias toward always putting the right quiz answer first.
- **Personalization that actually changes structure**, not just tone — declared accessibility needs, pace, and learning style change slide counts, lesson formats, and prompt content, not just a cosmetic label.
- **One codebase, three platforms.** The same Next.js app is the web product and the WebView content for the native iOS/Android shells (Capacitor), including a from-scratch native Google sign-in flow that bypasses the browser entirely (OS account sheet → server-verified ID token → Clerk session ticket).
- **Freemium done at the data layer.** Guests get a cookie-scoped identity and real (if capped) generation access via service-role DB writes — no fake "preview mode," just genuinely working free tiers with paid tiers gated server-side.

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Server Components, Server Actions) |
| UI | React 19, Tailwind CSS v4, Framer Motion, Radix UI, Lucide icons |
| Auth | Clerk (web) + a custom native Google sign-in bridge (mobile) |
| Database | Supabase (Postgres + Row-Level Security) |
| AI | Google Gemini (`@google/genai`), Zod-validated structured output |
| Content rendering | react-markdown, KaTeX (math), Lottie (motion) |
| Mobile | Capacitor 8 (iOS + Android), RevenueCat (in-app purchases) |
| Language | TypeScript end-to-end |

## Feature tour

- **Adaptive course generation** across four depth tiers (quick answer → overview → deep dive → complete mastery), each with its own module/lesson/slide scaling logic.
- **Multiple lesson formats**: guided slideshows (with embedded multiple-choice checks), standalone quizzes, narrated scripts, and condensed cheat sheets.
- **Accessibility-aware content**: dyslexia support, dyscalculia-aware formatting, max-legibility typography, and more — reflected in both generated content and the app's own UI (dynamic font stack via CSS variables).
- **Multi-language UI + content** — the interface and generated lessons follow a learner's preferred language, with proper RTL support for languages like Arabic.
- **Usage-driven personalization** — the app quietly learns from what a learner completes and how they perform on quizzes, with zero extra AI spend.
- **Guest-friendly freemium model** with server-enforced depth locking for paid tiers, backed by RevenueCat for subscriptions on mobile.
- **Native mobile shells** for iOS and Android with a real native Google sign-in flow (no browser hand-off).

## Getting started

```bash
npm install
# Configure .env.local — Clerk keys, Supabase URL/keys, GEMINI_API_KEY, etc.
npm run env:check
npm run dev
```

Apply the SQL files under `supabase/migrations/` to your Supabase project, in order, before first run.

Useful scripts:

```bash
npm run lint              # ESLint
npm run build              # Production build
npm run gemini:check       # Verify configured Gemini models are reachable
npm run debug:lesson       # Generate a single lesson outside the app, for prompt debugging
npm run debug:course       # Run a full course classification + generation, end to end
npm run build:mobile       # Build + sync the Capacitor iOS/Android shells
```

## Project structure

```
app/                  Next.js App Router — pages, layouts, Server Actions, API routes
components/           UI: dashboard, lessons, preferences, onboarding, layout, mobile
lib/
  gemini.ts           Gemini client + retry engine + prompt construction
  gemini/              Structured schemas, lesson planning, JSON normalization
  generation/          Lazy course/lesson generation, quota, personalization signals
  db/                  Supabase data access layer
  billing/             Plan tiers + depth access rules
  preferences/         Language/typography preference plumbing
  capacitor/           Native auth + platform bridge helpers
supabase/migrations/   Full schema history, applied in order
android/, ios/         Native Capacitor projects
docs/DEVELOPERS.md     Full architecture + invariants reference
```

## Documentation

- **[`docs/DEVELOPERS.md`](docs/DEVELOPERS.md)** — the complete developer reference: runtime architecture, auth flows, the generation pipeline end-to-end, personalization logic, quota/freemium rules, mobile build process, and every known invariant/pitfall.
- **[`AGENTS.md`](AGENTS.md)** — living project state and standing engineering rules (content-quality guardrails, AI-spend consent rules, architecture decisions), originally written to keep AI coding agents aligned but equally useful as a running architecture-decisions log.

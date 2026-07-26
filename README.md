# Gal-zu

AI-powered adaptive learning platform: prompt a topic → personalized course roadmap and interactive lessons (Gemini), with freemium guest access, Clerk auth, Supabase persistence, and Capacitor native shells.

## Developer documentation

**Full architecture, pipelines, and invariants:** [`docs/DEVELOPERS.md`](docs/DEVELOPERS.md)

Agent / multi-agent rules and living project state: [`AGENTS.md`](AGENTS.md)

## Quick start

```bash
npm install
# Configure .env.local (Clerk, Supabase, GEMINI_API_KEY, …)
npm run env:check
npm run dev
```

Apply SQL under `supabase/migrations/` to your Supabase project in chronological order.

## Stack (short)

Next.js 16 · React 19 · Clerk · Supabase · Google Gemini (`@google/genai`) · Capacitor 8 · Tailwind v4

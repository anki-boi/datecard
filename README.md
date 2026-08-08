# DateCard

> Your dating profile, unchained.
> No app. No algorithm. Just a QR code — and the right people find you.

A dating résumé with a hiring process. You build a profile, you get a link and a QR code.
Someone scans it, reads who you are, and **applies to connect**. You approve or decline.
Only then do they get your socials.

Open source (MIT). Zero signup forms — one-tap social login. One account, up to three
profiles: **Serious 💍 · Casual / Spicy 🔥 · Friendship 🤝** — each with its own link,
QR code, and inbox. Public pages never link profiles to each other.

## Stack

- **Frontend:** Vite + React (SPA, mobile-first, dark + gold)
- **Backend:** Supabase (Postgres + auth + storage + RLS) — free tier is enough
- **Routing:** `datecard.app/p/{cardId}` = the shareable/scannable public card

## Run it

```bash
npm install
npm run dev
```

Runs in **DEMO_MODE** (mock data, no setup) until you add Supabase credentials:

1. Create a free project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in the SQL editor (includes RPCs + RLS — public reads go through `get_public_profile`, socials can only be revealed via `reveal_socials`)
3. Enable the auth providers you want (Authentication → Providers): Google, Facebook, Instagram
4. Copy `.env.example` → `.env` and paste in `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
5. Optional: add `VITE_GEMINI_API_KEY` to unlock the AI-assisted card builder (client-side Gemini — proxy via edge function for production, see SPEC.md)
6. Restart `npm run dev` — the app now persists profiles and applications for real

## Deploy (free)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/anki-boi/datecard)

Or: push to GitHub → Import in Vercel → add the two env vars → done.
`vercel.json` handles SPA routing for `/p/:cardId` deep links.

## Data model

```
users          — one-tap social auth (Google / Facebook / Instagram), zero forms
profiles       — owner_id + type UNIQUE → max 3 per account; per-card socials/prompts/photo
applications   — per profile; pending → accepted/declined; socials revealed on accept
events         — scans/views (future premium analytics)
```

## Roadmap

- [x] **P0 — Scaffold:** Vite + React + Supabase, demo-mode fallback, `/p/:cardId`, RLS schema
- [x] **P1 — Behavior contract (see SPEC.md):** applicant status page `/a/:appId`, card pause/resume, per-card visibility (casual hides city), privacy defaults (noindex, report, socials RPC-only), AI card builder (6-question interview → Gemini compile)
- [ ] **P2 — Hardening:** photo upload (Supabase Storage), email notification on accept (SMTP/Resend + edge function), AI key proxy, applicant "my applications" list
- [ ] **P3 — Premium:** payments (Stripe), 3-profile unlock, analytics, extra templates, QR-as-key token activation
- [ ] **P4 — PH launch:** print-shop PDF export (A6/credit-card), Messenger-first share sheet, phone-wallpaper QR

## License

MIT — run it, fork it, self-host it. The software is unchained too.

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
2. Run `supabase/schema.sql` in the SQL editor
3. Enable the auth providers you want (Authentication → Providers): Google, Facebook, Instagram
4. Copy `.env.example` → `.env` and paste in `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
5. Restart `npm run dev` — the app now persists profiles and applications for real

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

- [ ] Photo upload (Supabase Storage)
- [ ] AI profile builder — guided interview → compiled prompts in your voice
- [ ] Print-ready PDF export (credit-card / A6, print-shop friendly)
- [ ] Premium: 3 profiles, extra templates, analytics
- [ ] QR-as-key token activation for printed cards

## License

MIT — run it, fork it, self-host it. The software is unchained too.

# DateCard — Product Spec (the contract)

> This document is the contract between intent and code. If a feature isn't here, it doesn't exist.
> If behavior contradicts this doc, the doc wins. Update the doc first, then the code.
> Status: v0.2 — after the applicant-side, card-states, visibility, privacy, and AI-builder decisions (Aug 8, 2026).

---

## 1. Vision

A dating profile you carry in your wallet. No app, no algorithm — a QR card that routes
real-world interest to a private channel. The card asks for you; you never have to.

**One sentence:** the only dating product where you never get rejected — interested people
apply, you approve, and only then does anyone see your socials.

## 2. Product principles

1. **Rejection-proof by construction** — the card holder never experiences a no. Uninterested people simply don't scan.
2. **The card is a key, not a container** — the printed object promises; the web page delivers. Cards never go stale (QR → URL → live profile).
3. **The profile is the product** — the reading experience and the building experience are the same problem: curation over listing. Tags say nothing; moments say everything.
4. **Intention clarity** — separate cards for separate selves. Public pages never cross-link.
5. **Identity depth scales with intention** — serious = real identity, casual = finsta energy, friendship = whatever. The platform never arbitrates; it just keeps the silos.
6. **Open source is the thesis** — "unchained" applies to the software too. MIT, self-hostable, free hosted instance. No moderation machinery: three-card segregation IS the moderation strategy.

## 3. Locked decisions

- One account (one-tap social: Google, Facebook, Instagram; Twitter/TikTok buttons decorative for now) → up to **3 profiles**, one per card type (`serious`, `casual`, `friendship`). Account is private; profiles are public, per-card.
- **Photos included** — one photo per profile (Supabase Storage). No-pictures bet is dead.
- **Apply model:** anyone reads the public card → applies (social login + optional note) → owner accepts/declines → socials revealed **only on accept**.
- **Socials live in the DB but are unreachable publicly** — RLS + RPCs: `get_public_profile()` returns everything except socials; `reveal_socials()` returns them only to the owner or an accepted applicant.
- **Premium (gated by flag, no payments yet):** 3 profiles, extra card templates, analytics, custom tagline, QR-as-key token activation.
- **Free tier:** 1 profile, Classic + Cream templates, core flow.

## 4. Data model (final)

```
users         — one-tap social auth, zero signup forms
profiles      — id, owner_id, type UNIQUE(owner_id,type), name, age, location, bio,
                interests[], hobbies[], looking_for, prompts[{prompt,answer}],
                socials{} (owner-only), photo_url, status (active|paused),
                settings{showLocation}, timestamps
applications  — id, profile_id, applicant_id (uuid, nullable), name, handle, platform,
                emoji, note, status (pending|accepted|declined), timestamps
events        — id, profile_id, kind (view|apply|accept|report), timestamps
```

**RLS summary:**
- `profiles`: owner-only direct access. Public reads go through `get_public_profile()` (security definer, socials excluded).
- `applications`: readable by profile owner **or** the applicant; insertable by anyone signed in; status update owner-only.
- `events`: anyone inserts, owner reads.

## 5. Behaviors

### 5.1 Owner flow
1. Landing → choose card type → one-tap social login (account auto-created) → build profile.
2. Build = basics (name, age, city, bio) + vibe (interests, hobbies, looking-for) + **prompts (up to 3, curated)** + per-card socials + **show-city toggle (casual card: always off)**.
3. Optional **AI-assisted card**: 6-question interview → AI compiles bio + looking-for + 3 prompts + interest suggestions in the user's voice → human edits → save. (Client-side Gemini for now; edge-function proxy later. No key → feature hidden with a notice.)
4. Dashboard: profile-type tabs, stats, QR + link, applications inbox (pending → accept/decline), **pause/resume per card**, preview, print.
5. Accept → applicant sees socials; owner sees them in Accepted tab.
6. Public pages are `noindex` — cards are never Googleable.

### 5.2 Applicant flow
1. Scans QR / opens link → public card page: type banner, photo, name, age, city (if allowed), bio, interests, hobbies, looking-for, prompts. **Report button** (fire-and-forget event) on every public card.
2. Apply → one-tap social login → optional note (+ finsta hint on casual cards) → application sent with a **status link**.
3. Status page `/a/{applicationId}`: pending → "waiting on their decision"; accepted → 🎉 **socials revealed** (copyable); declined → neutral copy.
4. **Paused cards:** banner "not taking applications right now", apply disabled.

### 5.3 Card states
- `active` — normal.
- `paused` — public page shows pause banner, apply disabled, owner can resume anytime. (No delete in v1 — untrack, don't destroy.)

### 5.4 Visibility rules (per card, data-driven)
| Field | Serious | Casual | Friendship |
|---|---|---|---|
| Photo | ✅ | ✅ | ✅ |
| City | toggle (default on) | **never** | toggle (default on) |
| Bio/prompts | full | full | full |
| Socials | reveal on accept | reveal on accept (finsta-friendly copy) | reveal on accept |

### 5.5 Events (analytics raw material)
`view` (public page load) · `apply` · `accept` · `report`. Owner dashboard aggregates later (premium).

## 6. Roadmap

- [x] **P0 — Scaffold:** Vite+React+Supabase, demo-mode fallback, `/p/:cardId`, RLS schema, open source repo. *(done Aug 8)*
- [x] **P1 — Behavior contract:** applicant status page, card states (pause), per-card visibility, privacy defaults (noindex, report, socials-inaccessible), AI builder v1 (client Gemini). *(this pass)*
- [ ] **P2 — Hardening:** photo upload (Storage), email notification on accept (needs SMTP/Resend + edge function), AI key proxied through edge function, applicant "my applications" list.
- [ ] **P3 — Premium:** payments (Stripe), 3-profile unlock, analytics dashboard, extra templates, QR-as-key token activation.
- [ ] **P4 — PH launch:** print-shop PDF export (A6/credit-card), Messenger-first share sheet, phone-wallpaper QR.

## 7. Non-goals (v1)

- No chat/messaging — the product ends at the handoff moment (product hands you the opener).
- No algorithm, no feed, no matching.
- No moderation machinery beyond report events + ToS line ("no commercial services").
- No iOS/Android apps — mobile web only.
- No email capture flows beyond what OAuth provides.

## 8. Open questions (parked)

1. Should accepted applicants be able to *request* new socials (profile edited after accept)? → v2.
2. Do we auto-generate the first-message opener on accept? → strong candidate for P2.
3. Email notifications require a backend send path — Resend via Supabase Edge Function is the default choice when we get there.

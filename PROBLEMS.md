# Problems this solves

## The short version

**There is no good way to show someone who you are when you meet them in public.**

Think about what actually happens. You meet someone at a café, a conference, a friend's
birthday. You have one good conversation and then one of you has to leave. The exchange
offer is always the same:

> "Find me on Instagram."

That's a bad instrument for the job, for four separate reasons:

| What's wrong with handing over a social handle | Why it matters |
|---|---|
| **It's an all-or-nothing broadcast.** | They don't get "the person you just met". They get the last three years — every post, every tagged photo, every opinion, everything a relative commented. There's no way to hand over *one side of yourself*. |
| **Not everyone wants to be on social media at all.** | Plenty of people have no public presence and aren't going to build one to be findable. Today that means they simply can't be reached this way. |
| **It's not a considered choice.** | Sending someone to an algorithmically-shaped feed is passive. You didn't decide what they see; you just opened a door. |
| **The alternatives route around the problem instead of through it.** | Dating apps solve discovery — they put you in front of strangers. But when you already met someone in person, an app is just re-introducing you across an algorithm that neither of you needs. |

## What DateCard does instead

**A dating résumé with a hiring process.** You build a profile, you get a link and a QR
code. Someone scans it, reads who you are, and **applies to connect**. You approve or
decline. Only then do they get your socials.

- **You choose who sees which side of you.** One account, up to **three profiles** —
  Serious 💍 · Casual / Spicy 🔥 · Friendship 🤝 — each with its own link, QR code and
  inbox. Public pages never link profiles to each other, so the three audiences stay
  separated by design.
- **It works in public, with no app.** A printed card or a phone screen. No install, no
  signup form — one-tap social login for the owner.
- **It bypasses the app entirely.** No algorithm between two people who already met.
  The scan *is* the introduction.
- **Giving someone a card is more professional than adding a stranger.** It's a
  deliberate, respectful offer that the other person can accept or decline without
  awkwardness — closer to exchanging a business card than following someone.

## Privacy is the feature, not a footnote

The whole value proposition collapses if scanning a card leaks your life. So:

- Socials are **never present in the public page payload** — they're only reachable
  through a `SECURITY DEFINER` RPC (`reveal_socials`) that checks for an **accepted**
  application first.
- Public profiles are `noindex`, and there's a report path.
- Per-card visibility: a casual card can hide your city while the serious one shows it.
- Every read and write is scoped by Row Level Security, so the database enforces the
  same rule the UI does.

## What it is not

- Not a discovery product. It doesn't show you strangers; it's for people you already
  met. That's the point — the hard part of dating isn't finding more people.
- Not a social network. There's no feed, no follower count and nothing to scroll.

## Status

Idea to shipped product, end to end: React + Vite + Supabase, demo mode that runs with no
credentials, MIT licensed, with a written behaviour contract in
[SPEC.md](SPEC.md) covering applicant status pages, card pause/resume, and the privacy
defaults above.

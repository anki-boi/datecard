import { useState, useRef, useEffect } from "react";
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import { supabase, DEMO_MODE } from "./lib/supabase";
import { getMyProfiles, upsertProfile, getProfileById, getApplications, addApplication, updateApplication, getApplicationById, getRevealedSocials, logEvent } from "./lib/db";
import { compileCard, aiAvailable, INTERVIEW } from "./lib/ai";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const PROFILE_TYPES = [
  { id: "serious",    label: "Serious",        icon: "💍", tagline: "Looking for something real",   color: "#c9a84c", desc: "Long-term relationship, intentional dating. The version of you that's ready." },
  { id: "casual",     label: "Casual / Spicy", icon: "🔥", tagline: "No strings, all vibes",        color: "#c0392b", desc: "Hookups, situationships, fun. Keep it separate from everything else.", sensitive: true },
  { id: "friendship", label: "Friendship",     icon: "🤝", tagline: "Just looking for good people", color: "#52b788", desc: "New city, new chapter, want to expand your circle." },
];

const PROMPTS_BY_TYPE = {
  serious: [
    "The way to my heart is...","I'm looking for someone who...","My love language is...",
    "A perfect Sunday looks like...","You'll know I like you when...","I want someone who will...",
    "My biggest green flag is...","I'm still learning how to...","Favourite thing about myself is...",
    "My friends would describe me as...","I'm convinced that...","Together we could...",
    "Change my mind about...","I'll cook you...","Don't go on a date with me if...",
    "The best trip I ever took...","I get way too excited about...","I'm weirdly passionate about...",
  ],
  casual: [
    "My idea of a good time is...","The vibe I'm going for is...","I keep things interesting by...",
    "Dealbreaker for me is...","I'm upfront about...","Best spontaneous thing I've done...",
    "Zero expectations but I do want...","My energy is best described as...",
    "I set the tone by...","Come as you are, just...",
  ],
  friendship: [
    "I'm looking for someone to...","My ideal hang is...","I get way too excited about...",
    "My friends would describe me as...","I'm weirdly passionate about...","A perfect Saturday looks like...",
    "I'm new here and need...","Best way to spend a Tuesday night...","I'm the friend who always...",
    "We'd get along if you also...","My love language (platonic) is...","Change my mind about...",
  ],
};

const SOCIAL_PLATFORMS = [
  { id: "instagram", label: "Instagram",  icon: "📸", placeholder: "@username" },
  { id: "twitter",   label: "X / Twitter",icon: "🐦", placeholder: "@username" },
  { id: "facebook",  label: "Facebook",   icon: "👤", placeholder: "Profile URL" },
  { id: "tiktok",    label: "TikTok",     icon: "🎵", placeholder: "@username" },
  { id: "linkedin",  label: "LinkedIn",   icon: "💼", placeholder: "Profile URL" },
];

const CARD_TEMPLATES = [
  { id: "classic", label: "Classic", premium: false, bg: "#0a0a0a",                                           text: "#e8d5a3", accent: "#c9a84c", border: "#2a2a2a" },
  { id: "cream",   label: "Cream",   premium: false, bg: "#f0ead8",                                           text: "#1a1410", accent: "#7a5c2a", border: "#c8b898" },
  { id: "noir",    label: "Noir",    premium: true,  bg: "linear-gradient(135deg,#0d0d0d 0%,#1a1208 100%)",   text: "#e8d5a3", accent: "#c9a84c", border: "#c9a84c" },
  { id: "minimal", label: "Minimal", premium: true,  bg: "#ffffff",                                           text: "#111111", accent: "#555555", border: "#dddddd" },
  { id: "bold",    label: "Bold",    premium: true,  bg: "#c9a84c",                                           text: "#0a0a0a", accent: "#0a0a0a", border: "transparent" },
  { id: "rose",    label: "Rose",    premium: true,  bg: "#1a0a08",                                           text: "#f5d0c8", accent: "#c0584a", border: "#5c1a14" },
];

const MOCK_APPS = {
  serious: [
    { id: "a1", name: "Jordan Lee",  platform: "instagram", handle: "@jordanlee", emoji: "🌿", appliedAt: "2 hours ago",  status: "pending",  note: "Your Sunday routine sounds exactly like mine." },
    { id: "a2", name: "Sam Rivera",  platform: "twitter",   handle: "@samrivera",  emoji: "🎸", appliedAt: "Yesterday",   status: "pending",  note: "" },
    { id: "a3", name: "Alex Kim",    platform: "facebook",  handle: "Alex Kim",    emoji: "📚", appliedAt: "2 days ago",  status: "accepted", note: "The farmers market mention sold me." },
  ],
  casual: [
    { id: "b1", name: "Riley Chen",  platform: "instagram", handle: "@rileyc",     emoji: "🌙", appliedAt: "1 hour ago",  status: "pending",  note: "" },
  ],
  friendship: [
    { id: "c1", name: "Morgan Tan",  platform: "tiktok",    handle: "@morgantan",  emoji: "🎯", appliedAt: "3 hours ago", status: "pending",  note: "Just moved here too, same energy." },
    { id: "c2", name: "Drew Patel",  platform: "twitter",   handle: "@drewp",      emoji: "🎮", appliedAt: "4 days ago",  status: "declined", note: "" },
  ],
};

function generateId() { return Math.random().toString(36).substr(2, 8).toUpperCase(); }

// ─── CSS ──────────────────────────────────────────────────────────────────────

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Mono:wght@300;400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --ink: #0a0a0a; --paper: #f5f0e8; --gold: #c9a84c; --gold-light: #e8d5a3;
    --red: #c0392b; --green: #52b788; --muted: #7a7060;
    --serif: 'Playfair Display', Georgia, serif; --mono: 'DM Mono', monospace;
  }
  body { background: var(--ink); color: var(--paper); font-family: var(--mono); min-height: 100vh; overflow-x: hidden; }

  /* NAV */
  .nav { display:flex; align-items:center; justify-content:space-between; padding:18px 32px; border-bottom:1px solid #1a1a1a; position:sticky; top:0; background:var(--ink); z-index:100; }
  .logo { font-family:var(--serif); font-size:22px; color:var(--gold-light); cursor:pointer; }
  .logo em { color:var(--gold); font-style:italic; }
  .nav-r { display:flex; gap:10px; align-items:center; }

  /* BUTTONS */
  .btn { font-family:var(--mono); font-size:12px; letter-spacing:.07em; padding:10px 20px; border:none; cursor:pointer; transition:all .15s; text-transform:uppercase; }
  .btn-p  { background:var(--gold); color:var(--ink); font-weight:500; }
  .btn-p:hover  { background:var(--gold-light); }
  .btn-o  { background:transparent; color:var(--gold-light); border:1px solid #333; }
  .btn-o:hover  { border-color:var(--gold); color:var(--gold); }
  .btn-g  { background:transparent; color:var(--muted); border:none; font-size:11px; padding:8px 12px; }
  .btn-g:hover  { color:var(--paper); }
  .btn-d  { background:transparent; color:var(--red); border:1px solid var(--red); }
  .btn-d:hover  { background:var(--red); color:#fff; }
  .btn-s  { background:#1b4332; color:#d8f3dc; border:1px solid #2d6a4f; }
  .btn-s:hover  { background:#2d6a4f; }
  .btn:disabled { opacity:.35; cursor:not-allowed; }
  .btn-lg { padding:14px 32px; font-size:13px; }
  .btn-sm { padding:7px 14px; font-size:11px; }

  /* LANDING */
  .landing { max-width:900px; margin:0 auto; padding:80px 32px; text-align:center; }
  .eyebrow { font-size:11px; letter-spacing:.2em; color:var(--gold); text-transform:uppercase; margin-bottom:24px; }
  .hero-t { font-family:var(--serif); font-size:clamp(46px,8vw,86px); line-height:1.0; margin-bottom:12px; }
  .hero-t em { color:var(--gold); font-style:italic; }
  .hero-s { font-size:14px; color:var(--muted); max-width:460px; margin:18px auto 44px; line-height:1.8; }
  .cta-row { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
  .divider { border:none; border-top:1px solid #1a1a1a; margin:60px 0; }
  .steps { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:1px; background:#1a1a1a; margin-top:28px; }
  .step { background:var(--ink); padding:26px 22px; text-align:left; }
  .step-n { font-size:10px; color:var(--gold); letter-spacing:.2em; margin-bottom:8px; }
  .step-t { font-family:var(--serif); font-size:17px; margin-bottom:6px; }
  .step-d { font-size:12px; color:var(--muted); line-height:1.7; }

  /* PAGE */
  .page { max-width:720px; margin:0 auto; padding:48px 32px; }
  .page-t { font-family:var(--serif); font-size:36px; margin-bottom:6px; }
  .page-s { font-size:12px; color:var(--muted); margin-bottom:36px; line-height:1.7; }
  .slabel { font-size:10px; letter-spacing:.2em; color:var(--gold); text-transform:uppercase; margin:34px 0 12px; }

  /* FIELDS */
  .field { margin-bottom:16px; }
  .field label { display:block; font-size:11px; color:var(--muted); letter-spacing:.1em; text-transform:uppercase; margin-bottom:6px; }
  .field input, .field textarea { width:100%; background:#0f0f0f; border:1px solid #222; color:var(--paper); font-family:var(--mono); font-size:14px; padding:11px 14px; outline:none; transition:border-color .15s; }
  .field input:focus, .field textarea:focus { border-color:var(--gold); }
  .field textarea { resize:vertical; min-height:80px; }

  /* TAG INPUT */
  .taginput { display:flex; flex-wrap:wrap; gap:8px; background:#0f0f0f; border:1px solid #222; padding:8px 10px; min-height:46px; cursor:text; transition:border-color .15s; }
  .taginput:focus-within { border-color:var(--gold); }
  .tag { background:#1a1a1a; border:1px solid #2a2a2a; color:var(--gold-light); padding:4px 10px; font-size:12px; display:flex; align-items:center; gap:6px; }
  .tag button { background:none; border:none; color:var(--muted); cursor:pointer; font-size:14px; line-height:1; padding:0; }
  .tag button:hover { color:var(--red); }
  .taginput input { background:transparent; border:none; color:var(--paper); font-family:var(--mono); font-size:13px; outline:none; padding:2px 0; min-width:100px; flex:1; }

  /* PROMPTS */
  .prompt-card { border:1px solid #1f1f1f; padding:18px; margin-bottom:10px; background:#0c0c0c; }
  .prompt-card.on { border-color:var(--gold); }
  .prompt-q { font-family:var(--serif); font-style:italic; font-size:15px; color:var(--gold-light); margin-bottom:10px; }
  .prompt-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:14px; }
  @media(max-width:540px){ .prompt-grid { grid-template-columns:1fr; } }
  .prompt-opt { background:#0f0f0f; border:1px solid #1f1f1f; color:var(--muted); font-family:var(--mono); font-size:11px; padding:9px 11px; cursor:pointer; text-align:left; transition:all .1s; font-style:italic; }
  .prompt-opt:hover { border-color:#333; color:var(--paper); }

  /* OAUTH */
  .oauth-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px; }
  @media(max-width:480px){ .oauth-grid { grid-template-columns:1fr; } }
  .oauth-btn { background:#0f0f0f; border:1px solid #222; color:var(--paper); font-family:var(--mono); font-size:12px; padding:12px 16px; cursor:pointer; display:flex; align-items:center; gap:10px; transition:border-color .15s; letter-spacing:.04em; }
  .oauth-btn:hover { border-color:var(--gold); }
  .oauth-btn.sel { border-color:var(--gold); background:#111; color:var(--gold-light); }

  /* TYPE PICKER */
  .type-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:32px; }
  @media(max-width:540px){ .type-grid { grid-template-columns:1fr; } }
  .type-card { border:2px solid #1f1f1f; padding:20px 16px; cursor:pointer; transition:all .15s; text-align:left; background:#0c0c0c; position:relative; }
  .type-card:hover:not(.locked) { border-color:#333; }
  .type-card.sel { border-color:var(--tc,var(--gold)); }
  .type-card.locked { opacity:.5; cursor:not-allowed; }
  .type-icon { font-size:28px; margin-bottom:10px; }
  .type-label { font-family:var(--serif); font-size:18px; margin-bottom:4px; }
  .type-tagline { font-size:11px; color:var(--muted); margin-bottom:8px; font-style:italic; }
  .type-desc { font-size:11px; color:var(--muted); line-height:1.6; }
  .type-badge { position:absolute; top:10px; right:10px; font-size:9px; letter-spacing:.12em; text-transform:uppercase; padding:3px 8px; border:1px solid var(--gold); color:var(--gold); }

  /* PROFILE TABS (dashboard) */
  .ptabs { display:flex; border-bottom:1px solid #1a1a1a; margin-bottom:30px; overflow-x:auto; }
  .ptab { font-family:var(--mono); font-size:11px; letter-spacing:.08em; text-transform:uppercase; padding:11px 18px; background:none; border:none; cursor:pointer; color:var(--muted); border-bottom:2px solid transparent; margin-bottom:-1px; white-space:nowrap; transition:all .15s; display:flex; align-items:center; gap:7px; }
  .ptab:hover:not(.on) { color:var(--paper); }
  .ptab.on { color:var(--paper); border-bottom-color:var(--tc,var(--gold)); }
  .ptab .dot { width:6px; height:6px; border-radius:50%; background:var(--tc,var(--gold)); }
  .add-ptab { border:1px dashed #222; margin:6px 4px; padding:6px 14px; font-size:10px; color:var(--muted); cursor:pointer; background:none; font-family:var(--mono); letter-spacing:.08em; text-transform:uppercase; transition:all .15s; align-self:center; }
  .add-ptab:hover { color:var(--gold); border-color:var(--gold); }

  /* PUBLIC PROFILE */
  .pview { max-width:620px; margin:0 auto; padding:48px 24px; }
  .type-banner { display:flex; align-items:center; gap:10px; padding:10px 16px; border:1px solid; margin-bottom:30px; font-size:12px; letter-spacing:.06em; }
  .profile-hdr { text-align:center; padding-bottom:34px; border-bottom:1px solid #1a1a1a; margin-bottom:34px; }
  .profile-name { font-family:var(--serif); font-size:42px; margin-bottom:4px; }
  .profile-meta { font-size:12px; color:var(--muted); letter-spacing:.1em; margin-bottom:16px; }
  .profile-bio { font-size:14px; line-height:1.8; max-width:460px; margin:0 auto; }
  .tags-row { display:flex; flex-wrap:wrap; gap:8px; margin-top:8px; }
  .ptag { background:#111; border:1px solid #1f1f1f; color:var(--gold-light); padding:5px 12px; font-size:11px; }
  .pcard { margin-bottom:22px; padding:20px; border:1px solid #1a1a1a; background:#080808; }
  .pcard-q { font-family:var(--serif); font-style:italic; font-size:15px; color:var(--gold); margin-bottom:8px; }
  .pcard-a { font-size:14px; line-height:1.7; }
  .lock-box { text-align:center; padding:36px 20px; border:1px dashed #222; margin:26px 0; }
  .lock-box h3 { font-family:var(--serif); font-size:21px; margin:10px 0 8px; }
  .lock-box p { font-size:12px; color:var(--muted); margin-bottom:20px; line-height:1.7; }

  /* DASHBOARD */
  .dash { max-width:900px; margin:0 auto; padding:40px 32px; }
  .dash-top { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:28px; flex-wrap:wrap; gap:14px; }
  .dash-title { font-family:var(--serif); font-size:32px; }
  .dash-sub { font-size:12px; color:var(--muted); margin-top:3px; }
  .stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); gap:1px; background:#1a1a1a; margin-bottom:32px; }
  .stat { background:var(--ink); padding:17px 20px; }
  .stat-n { font-family:var(--serif); font-size:32px; color:var(--gold); line-height:1; margin-bottom:3px; }
  .stat-l { font-size:10px; color:var(--muted); letter-spacing:.1em; text-transform:uppercase; }
  .qrbox { display:flex; gap:24px; align-items:flex-start; padding:26px; border:1px solid #1a1a1a; background:#080808; margin-bottom:32px; flex-wrap:wrap; }
  .qrinfo h3 { font-family:var(--serif); font-size:19px; margin-bottom:5px; }
  .qrinfo p { font-size:12px; color:var(--muted); margin-bottom:13px; line-height:1.6; }
  .qr-url { font-size:11px; color:var(--gold); background:#0f0f0f; border:1px solid #1f1f1f; padding:7px 11px; word-break:break-all; margin-bottom:10px; }
  .qr-acts { display:flex; gap:8px; flex-wrap:wrap; }
  .itabs { display:flex; border-bottom:1px solid #1a1a1a; margin-bottom:22px; }
  .itab { font-family:var(--mono); font-size:11px; letter-spacing:.08em; text-transform:uppercase; padding:10px 17px; background:none; border:none; color:var(--muted); cursor:pointer; border-bottom:2px solid transparent; margin-bottom:-1px; transition:all .15s; }
  .itab.on { color:var(--gold); border-bottom-color:var(--gold); }
  .itab:hover:not(.on) { color:var(--paper); }

  /* APPLICANT CARD */
  .acard { border:1px solid #1a1a1a; padding:16px 18px; display:flex; align-items:center; gap:13px; margin-bottom:7px; background:#080808; transition:border-color .15s; }
  .acard:hover { border-color:#2a2a2a; }
  .aav { width:42px; height:42px; background:#161616; border:1px solid #222; display:flex; align-items:center; justify-content:center; font-size:19px; flex-shrink:0; }
  .ainfo { flex:1; min-width:0; }
  .aname { font-family:var(--serif); font-size:17px; }
  .ameta { font-size:11px; color:var(--muted); margin-top:2px; }
  .anote { font-size:11px; color:var(--muted); font-style:italic; margin-top:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .aacts { display:flex; gap:7px; flex-shrink:0; }
  .spill { font-size:10px; letter-spacing:.1em; text-transform:uppercase; padding:4px 10px; border:1px solid; }
  .spill.pending  { color:var(--gold); border-color:var(--gold); }
  .spill.accepted { color:var(--green); border-color:var(--green); }
  .spill.declined { color:var(--red);  border-color:var(--red); }

  /* EMPTY */
  .empty { text-align:center; padding:52px 20px; border:1px dashed #1a1a1a; }
  .empty-i { font-size:34px; margin-bottom:12px; }
  .empty-t { font-family:var(--serif); font-size:20px; margin-bottom:5px; }
  .empty-d { font-size:12px; color:var(--muted); }

  /* MODAL */
  .overlay { position:fixed; inset:0; background:rgba(0,0,0,.88); display:flex; align-items:center; justify-content:center; z-index:200; padding:20px; }
  .modal { background:#0f0f0f; border:1px solid #222; width:100%; padding:34px; overflow-y:auto; max-height:90vh; }
  .modal-t { font-family:var(--serif); font-size:28px; margin-bottom:6px; }
  .modal-s { font-size:12px; color:var(--muted); margin-bottom:22px; line-height:1.7; }

  /* PRINT CARD */
  .tpl-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:22px; }
  @media(max-width:480px){ .tpl-grid { grid-template-columns:repeat(2,1fr); } }
  .tpl-btn { position:relative; border:2px solid #1f1f1f; background:none; padding:0; cursor:pointer; aspect-ratio:1.75; overflow:hidden; transition:border-color .15s; }
  .tpl-btn:hover:not(.locked) { border-color:#3a3a3a; }
  .tpl-btn.chosen { border-color:var(--gold); }
  .tpl-btn.locked { cursor:default; }
  .tpl-btn.locked .tpl-inner { filter:brightness(.45) saturate(.4); }
  .tpl-inner { width:100%; height:100%; display:flex; flex-direction:column; justify-content:space-between; padding:10px 12px; font-family:var(--mono); }
  .tpl-name { font-family:var(--serif); font-size:12px; }
  .tpl-url { font-size:7px; opacity:.4; letter-spacing:.03em; }
  .tpl-qr { width:17px; height:17px; opacity:.3; }
  .tpl-lock { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; }
  .tpl-lock-i { font-size:15px; }
  .tpl-lock-l { font-size:9px; letter-spacing:.12em; text-transform:uppercase; color:var(--gold); }
  .preview-area { border:1px solid #1a1a1a; background:#060606; padding:30px 20px; display:flex; flex-direction:column; align-items:center; margin-bottom:18px; }
  .biz-card { width:338px; height:192px; padding:17px 19px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 10px 48px rgba(0,0,0,.7); flex-shrink:0; }
  .bc-name { font-family:var(--serif); font-size:22px; line-height:1; }
  .bc-tl { font-family:var(--mono); font-size:9px; opacity:.52; margin-top:3px; letter-spacing:.05em; }
  .bc-ints { font-family:var(--mono); font-size:8px; opacity:.42; margin-top:7px; letter-spacing:.03em; }
  .bc-bot { display:flex; justify-content:space-between; align-items:flex-end; }
  .bc-url { font-family:var(--mono); font-size:8px; opacity:.48; }
  .bc-cta { font-family:var(--mono); font-size:9px; opacity:.62; }
  .prem-bar { background:#0f0f0a; border:1px solid #252010; border-left:2px solid var(--gold); padding:13px 17px; display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap; margin-bottom:18px; }
  .prem-bar p { font-size:12px; color:var(--muted); line-height:1.6; }
  .prem-bar strong { color:var(--gold-light); }
  .print-note { font-size:11px; color:var(--muted); text-align:center; margin-top:12px; line-height:1.7; }
  .print-acts { display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-top:18px; }

  /* MISC */
  .notice { background:#0f0f0f; border-left:2px solid var(--gold); padding:11px 16px; font-size:12px; color:var(--muted); margin-bottom:18px; line-height:1.6; }
  .success-banner { background:#0d2118; border:1px solid #2d6a4f; color:#a7e0bc; padding:13px 17px; font-size:13px; margin-bottom:20px; line-height:1.6; }
  .sep { height:1px; background:#1a1a1a; margin:28px 0; }
  .social-row { display:flex; align-items:center; gap:12px; margin-bottom:10px; }
  .social-row input { flex:1; background:#0f0f0f; border:1px solid #222; color:var(--paper); font-family:var(--mono); font-size:13px; padding:10px 14px; outline:none; }
  .social-row input:focus { border-color:var(--gold); }

  .fade-in { animation:fadeIn .25s ease; }
  @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }

  @media print {
    body * { visibility:hidden !important; }
    .biz-card, .biz-card * { visibility:visible !important; }
    .biz-card { position:fixed !important; top:50% !important; left:50% !important; transform:translate(-50%,-50%) !important; box-shadow:none !important; }
  }
`;

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────

function QRImg({ value, size = 140, bgColor = "0a0a0a", fgColor = "c9a84c" }) {
  return (
    <img
      src={`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&bgcolor=${bgColor}&color=${fgColor}&qzone=1`}
      alt="QR" width={size} height={size}
    />
  );
}

function TagInput({ tags, onChange, placeholder }) {
  const [val, setVal] = useState("");
  const ref = useRef();
  function add(v) { const t = v.trim().replace(/,/g, ""); if (t && !tags.includes(t)) onChange([...tags, t]); setVal(""); }
  return (
    <div className="taginput" onClick={() => ref.current?.focus()}>
      {tags.map(t => (
        <span key={t} className="tag">{t}<button onClick={() => onChange(tags.filter(x => x !== t))}>×</button></span>
      ))}
      <input ref={ref} value={val} onChange={e => setVal(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(val); }
          if (e.key === "Backspace" && !val && tags.length) onChange(tags.slice(0, -1));
        }}
        placeholder={tags.length === 0 ? placeholder : ""}
      />
    </div>
  );
}

function OAuthBtn({ platform, icon, label, selected, onSelect }) {
  return (
    <button className={`oauth-btn ${selected === platform ? "sel" : ""}`} onClick={() => onSelect(platform)}>
      <span style={{ fontSize: 18 }}>{icon}</span><span>Continue with {label}</span>
    </button>
  );
}

function PromptPicker({ selected, onChange, type }) {
  const [adding, setAdding] = useState(false);
  const pool = PROMPTS_BY_TYPE[type] || PROMPTS_BY_TYPE.serious;

  return (
    <div>
      {selected.map((item, i) => (
        <div key={i} className="prompt-card on">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div className="prompt-q">{item.prompt}</div>
            <button className="btn btn-g" onClick={() => onChange(selected.filter((_, j) => j !== i))} style={{ padding: "2px 6px", fontSize: 16 }}>×</button>
          </div>
          <textarea
            style={{ width: "100%", background: "#111", border: "1px solid #2a2a2a", color: "var(--paper)", fontFamily: "var(--mono)", fontSize: 13, padding: "10px 12px", resize: "vertical", outline: "none", minHeight: 68 }}
            placeholder="Your answer..."
            value={item.answer}
            onChange={e => { const n = [...selected]; n[i] = { ...n[i], answer: e.target.value }; onChange(n); }}
          />
        </div>
      ))}
      {selected.length < 3 && !adding && (
        <button className="btn btn-o btn-sm" onClick={() => setAdding(true)}>+ Add Prompt ({selected.length}/3)</button>
      )}
      {adding && (
        <div>
          <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10 }}>Pick a prompt</div>
          <div className="prompt-grid">
            {pool.filter(p => !selected.find(s => s.prompt === p)).map(p => (
              <button key={p} className="prompt-opt" onClick={() => { onChange([...selected, { prompt: p, answer: "" }]); setAdding(false); }}>{p}</button>
            ))}
          </div>
          <button className="btn btn-g btn-sm" onClick={() => setAdding(false)}>Cancel</button>
        </div>
      )}
    </div>
  );
}

// ─── AI CARD BUILDER (SPEC.md §5.1.3) ────────────────────────────────────────

function AIBuilder({ type, onCompile }) {
  const [answers, setAnswers] = useState(INTERVIEW.map((i) => ({ q: i.q, hint: i.hint, answer: "" })));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function go() {
    const filled = answers.filter((a) => a.answer.trim()).length;
    if (filled < 3) { setError("Answer at least 3 questions to give the AI something to work with."); return; }
    setBusy(true); setError("");
    try {
      const compiled = await compileCard(answers, type);
      onCompile(compiled);
      setError("✨ Done — review the edits below, then save.");
    } catch (e) {
      setError("AI compile failed: " + e.message);
    }
    setBusy(false);
  }

  return (
    <div>
      {answers.map((a, i) => (
        <div key={i} className="prompt-card">
          <div className="prompt-q">{a.q}</div>
          <textarea
            style={{ width: "100%", background: "#111", border: "1px solid #2a2a2a", color: "var(--paper)", fontFamily: "var(--mono)", fontSize: 13, padding: "10px 12px", resize: "vertical", outline: "none", minHeight: 56 }}
            placeholder={a.hint}
            value={a.answer}
            onChange={e => { const n = [...answers]; n[i] = { ...n[i], answer: e.target.value }; setAnswers(n); }}
          />
        </div>
      ))}
      <button className="btn btn-p" onClick={go} disabled={busy} style={{ marginTop: 6 }}>
        {busy ? "Compiling…" : "✨ Compile my card"}
      </button>
      {error && <div style={{ marginTop: 10, fontSize: 12, color: error.startsWith("✨") ? "var(--green)" : "var(--red)" }}>{error}</div>}
    </div>
  );
}

// ─── PRINT CARD MODAL ─────────────────────────────────────────────────────────

function TplMiniPreview({ tpl, name, url }) {
  const isGradient = tpl.bg.startsWith("linear");
  return (
    <div className="tpl-inner" style={{
      background: isGradient ? undefined : tpl.bg,
      backgroundImage: isGradient ? tpl.bg : undefined,
      color: tpl.text,
    }}>
      <div>
        <div className="tpl-name">{name || "Your Name"}</div>
        <div className="tpl-url">{url}</div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div className="tpl-url">Apply ↗</div>
        <div className="tpl-qr" style={{ background: tpl.accent }} />
      </div>
    </div>
  );
}

function BizCard({ profile, tpl }) {
  const url = `datecard.app/p/${profile?.id || "DEMO"}`;
  const name = profile?.name || "Alex Morgan";
  const age = profile?.age;
  const loc = profile?.location;
  const ints = (profile?.interests || ["Travel", "Film", "Coffee"]).slice(0, 4).join(" · ");
  const pt = PROFILE_TYPES.find(t => t.id === (profile?.type || "serious"));
  const qrBg = (tpl.id === "cream" || tpl.id === "minimal") ? "f5f0e8" : "0a0a0a";
  const isGradient = tpl.bg.startsWith("linear");

  return (
    <div className="biz-card" style={{
      background: isGradient ? undefined : tpl.bg,
      backgroundImage: isGradient ? tpl.bg : undefined,
      color: tpl.text,
      border: `1px solid ${tpl.border}`,
    }}>
      <div>
        <div className="bc-name">{name}</div>
        <div className="bc-tl">{[age, loc].filter(Boolean).join(" · ")}{pt ? `  ·  ${pt.icon} ${pt.label}` : ""}</div>
        <div className="bc-ints">{ints}</div>
      </div>
      <div className="bc-bot">
        <div>
          <div className="bc-url">https://{url}</div>
          <div className="bc-cta" style={{ color: tpl.accent }}>Scan to apply ↗</div>
        </div>
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=58x58&data=https://${url}&bgcolor=${qrBg}&color=${tpl.accent.replace("#", "")}&qzone=0`}
          alt="QR" width={50} height={50}
        />
      </div>
    </div>
  );
}

function PrintCardModal({ profile, onClose }) {
  const [chosen, setChosen] = useState("classic");
  const tpl = CARD_TEMPLATES.find(t => t.id === chosen) || CARD_TEMPLATES[0];
  const url = `datecard.app/p/${profile?.id || "DEMO"}`;

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal fade-in" style={{ maxWidth: 660 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div className="modal-t">Print Your Card</div>
            <div className="modal-s" style={{ marginBottom: 0 }}>Self-print a business card. Take it anywhere.</div>
          </div>
          <button className="btn btn-g" onClick={onClose} style={{ fontSize: 20, padding: "2px 8px" }}>×</button>
        </div>

        <div style={{ fontSize: 10, color: "var(--gold)", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 12 }}>Choose a design</div>

        <div className="tpl-grid">
          {CARD_TEMPLATES.map(t => (
            <button
              key={t.id}
              className={`tpl-btn ${chosen === t.id && !t.premium ? "chosen" : ""} ${t.premium ? "locked" : ""}`}
              onClick={() => !t.premium && setChosen(t.id)}
              title={t.premium ? "Premium — upgrade to unlock" : t.label}
            >
              <TplMiniPreview tpl={t} name={profile?.name} url={url} />
              {t.premium && (
                <div className="tpl-lock">
                  <div className="tpl-lock-i">✦</div>
                  <div className="tpl-lock-l">Premium</div>
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="prem-bar">
          <p><strong>4 more designs with Premium.</strong> Full-res export, Canva-ready files, custom tagline, Vistaprint-compatible sizing.</p>
          <button className="btn btn-p btn-sm">Upgrade</button>
        </div>

        <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12 }}>
          Preview — {tpl.label}
        </div>

        <div className="preview-area">
          <BizCard profile={profile} tpl={tpl} />
          <p className="print-note">
            Free tier: 2 clean, print-ready designs — Classic and Cream.<br />
            <span style={{ color: "var(--gold)" }}>Premium</span> unlocks 4 additional designs and export options.
          </p>
        </div>

        <div className="print-acts">
          <button className="btn btn-p" onClick={() => window.print()}>🖨 Print This Card</button>
          <button className="btn btn-g btn-sm" style={{ color: "var(--gold)" }}>✦ Upgrade for More Designs</button>
          <button className="btn btn-g btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── PAGES ────────────────────────────────────────────────────────────────────

function Landing({ onNav }) {
  return (
    <div className="landing fade-in">
      <div className="eyebrow">Introducing DateCard</div>
      <h1 className="hero-t">Your dating profile,<br /><em>unchained.</em></h1>
      <p className="hero-s">Build a shareable profile. Share a QR code. Let the right people come to you — no app required.</p>
      <div className="cta-row">
        <button className="btn btn-p btn-lg" onClick={() => onNav("choose-type")}>Create Your Card</button>
        <button className="btn btn-o btn-lg" onClick={() => onNav("view-demo")}>See a Demo</button>
      </div>
      <hr className="divider" />
      <div style={{ textAlign: "left" }}>
        <div className="eyebrow" style={{ marginBottom: 18 }}>How it works</div>
        <div className="steps">
          {[
            ["01", "Build", "Fill out your profile — prompts, interests, vibes. Create separate cards for different intentions."],
            ["02", "Share", "Get a unique link and QR code per card. Business card, shirt, wherever."],
            ["03", "They Apply", "Interested people log in with their socials and send you an application."],
            ["04", "You Decide", "Review their public profile. Accept and they get your social links."],
          ].map(([n, t, d]) => (
            <div key={n} className="step">
              <div className="step-n">{n}</div>
              <div className="step-t">{t}</div>
              <div className="step-d">{d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChooseType({ onNav, onChoose, existingTypes }) {
  const [sel, setSel] = useState(null);
  const atLimit = existingTypes.length >= 1; // free = 1 profile

  return (
    <div className="page fade-in">
      <div className="page-t">What kind of card?</div>
      <p className="page-s">Each card has its own link, QR code, and inbox. Keep your intentions separate.</p>

      {atLimit && (
        <div className="notice">Free tier = 1 card. <strong style={{ color: "var(--gold)" }}>Premium</strong> unlocks all 3 simultaneously.</div>
      )}

      <div className="type-grid">
        {PROFILE_TYPES.map(t => {
          const owned = existingTypes.includes(t.id);
          const locked = atLimit && !owned;
          return (
            <div
              key={t.id}
              className={`type-card ${sel === t.id ? "sel" : ""} ${locked ? "locked" : ""}`}
              style={{ "--tc": t.color }}
              onClick={() => !locked && setSel(t.id)}
            >
              {locked && <div className="type-badge">✦ Premium</div>}
              <div className="type-icon">{t.icon}</div>
              <div className="type-label" style={{ color: sel === t.id ? t.color : "var(--paper)" }}>{t.label}</div>
              <div className="type-tagline">{t.tagline}</div>
              <div className="type-desc">{t.desc}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <button className="btn btn-p" disabled={!sel} onClick={() => { onChoose(sel); onNav("create-profile"); }}>Continue →</button>
        <button className="btn btn-g" onClick={() => onNav(existingTypes.length ? "dashboard" : "home")}>Back</button>
      </div>
    </div>
  );
}

function CreateProfile({ onNav, onSave, profileType, existingUser }) {
  const [step, setStep] = useState(existingUser ? 1 : 0);
  const [auth, setAuth] = useState(existingUser || null);
  const pt = PROFILE_TYPES.find(t => t.id === profileType) || PROFILE_TYPES[0];

  const [form, setForm] = useState({
    name: "", age: "", location: "", bio: "",
    interests: [], hobbies: [], lookingFor: "",
    prompts: [],
    socials: { instagram: "", twitter: "", facebook: "", tiktok: "", linkedin: "" },
    settings: { showLocation: true },
    status: "active",
  });

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }
  function setSoc(k, v) { setForm(f => ({ ...f, socials: { ...f.socials, [k]: v } })); }
  function applyAI(c) {
    setForm(f => ({
      ...f,
      bio: c.bio || f.bio,
      lookingFor: c.lookingFor || f.lookingFor,
      prompts: Array.isArray(c.prompts) && c.prompts.length ? c.prompts.slice(0, 3) : f.prompts,
      interests: Array.isArray(c.interests) && c.interests.length ? [...new Set([...f.interests, ...c.interests])] : f.interests,
    }));
  }

  function save() {
    const id = generateId();
    onSave({ ...form, id, type: profileType, ownerId: auth, status: "active", createdAt: new Date().toISOString() }, auth);
    onNav("dashboard");
  }

  function handleOAuth(p) {
    setAuth(p);
    if (!DEMO_MODE) supabase.auth.signInWithOAuth({ provider: p, options: { redirectTo: window.location.origin } });
  }

  const TypeBadge = () => (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#111", border: `1px solid ${pt.color}44`, padding: "6px 14px", marginBottom: 22, fontSize: 12, color: pt.color }}>
      {pt.icon} {pt.label} Card
    </div>
  );

  if (step === 0) return (
    <div className="page fade-in">
      <TypeBadge />
      <div className="page-t">First, who are you?</div>
      <p className="page-s">Log in with a social account. We never store your password — just your public profile info.</p>
      <div className="oauth-grid">
        <OAuthBtn platform="instagram" icon="📸" label="Instagram"  selected={auth} onSelect={p => handleOAuth(p)} />
        <OAuthBtn platform="twitter"   icon="🐦" label="X / Twitter" selected={auth} onSelect={p => handleOAuth(p)} />
        <OAuthBtn platform="facebook"  icon="👤" label="Facebook"   selected={auth} onSelect={p => handleOAuth(p)} />
        <OAuthBtn platform="tiktok"    icon="🎵" label="TikTok"     selected={auth} onSelect={p => handleOAuth(p)} />
      </div>
      <div className="notice">Demo mode — no real OAuth is happening. Pick any to simulate login.</div>
      <button className="btn btn-p" disabled={!auth} onClick={() => setStep(1)}>Continue →</button>
      <button className="btn btn-g" onClick={() => onNav("choose-type")} style={{ marginLeft: 10 }}>Back</button>
    </div>
  );

  return (
    <div className="page fade-in">
      <TypeBadge />
      <div className="page-t">Build your card.</div>
      <p className="page-s">This is the <em style={{ color: pt.color }}>{pt.label.toLowerCase()}</em> version of you. Be honest about what you want.</p>

      <div className="slabel">The basics</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 1fr", gap: 12 }}>
        <div className="field"><label>Full Name</label><input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Your name" /></div>
        <div className="field"><label>Age</label><input type="number" value={form.age} onChange={e => set("age", e.target.value)} placeholder="28" /></div>
        <div className="field"><label>Location</label><input value={form.location} onChange={e => set("location", e.target.value)} placeholder="City" /></div>
      </div>
      {pt.id !== "casual" && (
        <div className="field" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input type="checkbox" id="showLoc" checked={form.settings.showLocation} onChange={e => set("settings", { ...form.settings, showLocation: e.target.checked })} style={{ width: 16, height: 16 }} />
          <label htmlFor="showLoc" style={{ margin: 0 }}>Show my city on my card</label>
        </div>
      )}
      <div className="field"><label>Bio</label>
        <textarea value={form.bio} onChange={e => set("bio", e.target.value)}
          placeholder={pt.id === "casual" ? "Set the tone. Be honest." : pt.id === "friendship" ? "Who you are, what you're into." : "A few lines. Make it real."} />
      </div>

      <div className="slabel">Your vibe</div>
      <div className="field"><label>Interests</label><TagInput tags={form.interests} onChange={v => set("interests", v)} placeholder="Travel, film, coffee..." /></div>
      <div className="field"><label>Hobbies</label><TagInput tags={form.hobbies} onChange={v => set("hobbies", v)} placeholder="Guitar, hiking, chess..." /></div>
      <div className="field"><label>Looking for</label>
        <input value={form.lookingFor} onChange={e => set("lookingFor", e.target.value)}
          placeholder={pt.id === "casual" ? "Good times, no drama" : pt.id === "friendship" ? "Friends to explore the city with" : "Something real, long-term"} />
      </div>

      <div className="slabel">Prompts (up to 3)</div>
      <PromptPicker selected={form.prompts} onChange={v => set("prompts", v)} type={profileType} />

      <div className="slabel">✨ AI-assisted card</div>
      {aiAvailable() ? (
        <AIBuilder type={profileType} onCompile={applyAI} />
      ) : (
        <div className="notice">AI mode is off — add <code style={{ color: "var(--gold)" }}>VITE_GEMINI_API_KEY</code> to <code style={{ color: "var(--gold)" }}>.env</code> to unlock the AI card writer.</div>
      )}

      <div className="slabel">Social links <span style={{ color: "var(--muted)", fontSize: 10, textTransform: "none", fontStyle: "italic" }}>— hidden until you accept someone</span></div>
      <div className="notice">Only revealed to people you explicitly accept. Never shown publicly.</div>
      {SOCIAL_PLATFORMS.map(p => (
        <div key={p.id} className="social-row">
          <span style={{ fontSize: 18, width: 28, textAlign: "center" }}>{p.icon}</span>
          <span style={{ fontSize: 12, color: "var(--muted)", width: 88, flexShrink: 0 }}>{p.label}</span>
          <input value={form.socials[p.id]} onChange={e => setSoc(p.id, e.target.value)} placeholder={p.placeholder} />
        </div>
      ))}

      <div className="sep" />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button className="btn btn-p btn-lg" disabled={!form.name} onClick={save}>Generate My Card →</button>
        <button className="btn btn-g" onClick={() => onNav("dashboard")}>Cancel</button>
      </div>
    </div>
  );
}

function PublicProfileView({ profile, currentUser, onNav, onApply }) {
  const [showApply, setShowApply] = useState(false);
  const [auth, setAuth] = useState(null);
  const [note, setNote] = useState("");
  const [applied, setApplied] = useState(false);
  const [appliedAppId, setAppliedAppId] = useState(null);
  const [reported, setReported] = useState(false);

  const p = profile || {
    name: "Alex Morgan", age: 28, location: "New York",
    bio: "Coffee-fuelled creative. Weekends: bookshops or hiking trails. Convinced a good playlist fixes most things.",
    interests: ["Travel", "Film", "Coffee", "Architecture", "Jazz"],
    hobbies: ["Photography", "Bouldering", "Cooking"],
    lookingFor: "Something real. Someone curious about the world.",
    prompts: [
      { prompt: "I get way too excited about...", answer: "Finding a perfect hole-in-the-wall restaurant nobody knows about. Hand-written menu, one person running everything." },
      { prompt: "A perfect Sunday looks like...", answer: "Farmers market, long brunch, obscure film at an independent cinema, then cooking whatever looked good at the market." },
      { prompt: "You'll know I like you when...", answer: "I send voice notes instead of texts. It means I trust you enough to sound like a real person." },
    ],
    type: "serious", id: "DEMO",
  };

  const pt = PROFILE_TYPES.find(t => t.id === p.type) || PROFILE_TYPES[0];
  const isOwn = currentUser && profile?.ownerId === currentUser;
  const canShowLoc = p.type !== "casual" && p.settings?.showLocation !== false;
  const isPaused = p.status === "paused";

  function handleOAuth(p) {
    setAuth(p);
    if (!DEMO_MODE) supabase.auth.signInWithOAuth({ provider: p, options: { redirectTo: window.location.origin } });
  }

  function report() {
    if (reported) return;
    setReported(true);
    if (!DEMO_MODE) logEvent(p.id, "report");
  }

  async function submit() {
    if (!auth) return;
    const app = { id: generateId(), name: "You (Demo)", platform: auth, handle: "@demo_user", emoji: "✨", appliedAt: "Just now", status: "pending", note };
    let applicantId = null;
    if (!DEMO_MODE) {
      const { data } = await supabase.auth.getUser();
      applicantId = data.user?.id || null;
    }
    if (onApply) onApply(p.id, { ...app, applicant_id: applicantId });
    setAppliedAppId(app.id);
    setApplied(true);
    setShowApply(false);
  }

  return (
    <div className="pview fade-in">
      {isOwn && (
        <div className="notice">Previewing your own card. <button className="btn btn-g btn-sm" onClick={() => onNav("dashboard")}>Go to Dashboard →</button></div>
      )}
      {applied && <div className="success-banner">✓ Application sent! <a href={"/a/" + appliedAppId} style={{ color: "var(--gold)" }}>Save this link to check your status →</a></div>}
      {isPaused && <div className="notice" style={{ borderLeftColor: "var(--muted)" }}>⏸ This card is paused — not taking new applications right now.</div>}

      <div className="type-banner" style={{ borderColor: `${pt.color}44`, color: pt.color, background: `${pt.color}0a` }}>
        {pt.icon} <span style={{ letterSpacing: "0.06em" }}>{pt.label} Card</span>
        <span style={{ color: "var(--muted)", fontSize: 11, marginLeft: 4 }}>· {pt.tagline}</span>
      </div>

      <div className="profile-hdr">
        <div className="profile-name">{p.name}</div>
        <div className="profile-meta">{[p.age, canShowLoc ? p.location : null].filter(Boolean).join(" · ")}</div>
        <p className="profile-bio">{p.bio}</p>
      </div>

      {p.interests?.length > 0 && <div style={{ marginBottom: 26 }}><div className="slabel" style={{ marginTop: 0 }}>Interests</div><div className="tags-row">{p.interests.map(t => <span key={t} className="ptag">{t}</span>)}</div></div>}
      {p.hobbies?.length > 0 && <div style={{ marginBottom: 26 }}><div className="slabel" style={{ marginTop: 0 }}>Hobbies</div><div className="tags-row">{p.hobbies.map(t => <span key={t} className="ptag">{t}</span>)}</div></div>}
      {p.lookingFor && <div style={{ marginBottom: 26 }}><div className="slabel" style={{ marginTop: 0 }}>Looking for</div><p style={{ fontSize: 14, fontStyle: "italic", lineHeight: 1.7 }}>"{p.lookingFor}"</p></div>}

      {p.prompts?.length > 0 && (
        <div style={{ marginBottom: 34 }}>
          <div className="slabel" style={{ marginTop: 0 }}>Prompts</div>
          {p.prompts.map((pr, i) => (
            <div key={i} className="pcard">
              <div className="pcard-q">{pr.prompt}</div>
              <div className="pcard-a">{pr.answer}</div>
            </div>
          ))}
        </div>
      )}

      <div className="lock-box">
        <div style={{ fontSize: 26 }}>🔒</div>
        <h3>Social links are private</h3>
        <p>Apply to connect. {p.name} will review your profile and decide whether to share their links with you.</p>
        {!isOwn && !applied && !isPaused && <button className="btn btn-p btn-lg" onClick={() => setShowApply(true)}>Apply to Connect</button>}
        {!isOwn && !applied && isPaused && <div style={{ color: "var(--muted)", fontSize: 13 }}>⏸ Not taking applications right now.</div>}
        {applied && <div style={{ color: "var(--gold)", fontSize: 13 }}>✓ Application sent — <a href={"/a/" + appliedAppId} style={{ color: "var(--gold)" }}>track it here</a></div>}
        {isOwn && <div style={{ color: "var(--muted)", fontSize: 12 }}>This is your own card.</div>}
      </div>

      {!isOwn && (
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button className="btn btn-g btn-sm" onClick={report}>{reported ? "Thanks — we'll take a look." : "Report this card"}</button>
        </div>
      )}

      {showApply && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setShowApply(false)}>
          <div className="modal fade-in" style={{ maxWidth: 460 }}>
            <div className="modal-t">Send an application</div>
            <p className="modal-s">Log in so {p.name} can see who you are before deciding.</p>
            <div className="oauth-grid">
              <OAuthBtn platform="instagram" icon="📸" label="Instagram"  selected={auth} onSelect={p => handleOAuth(p)} />
              <OAuthBtn platform="twitter"   icon="🐦" label="X / Twitter" selected={auth} onSelect={p => handleOAuth(p)} />
              <OAuthBtn platform="facebook"  icon="👤" label="Facebook"   selected={auth} onSelect={p => handleOAuth(p)} />
              <OAuthBtn platform="tiktok"    icon="🎵" label="TikTok"     selected={auth} onSelect={p => handleOAuth(p)} />
            </div>
            {pt.id === "casual" && <div className="notice">This card is best explored with a finsta 👀 — keep your main handle safe.</div>}
            <div className="field">
              <label>Optional note</label>
              <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Say something that'll make them want to accept..."
                style={{ width: "100%", background: "#111", border: "1px solid #2a2a2a", color: "var(--paper)", fontFamily: "var(--mono)", fontSize: 13, padding: "10px 12px", outline: "none", resize: "vertical", minHeight: 78 }} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-p" disabled={!auth} onClick={submit}>Submit</button>
              <button className="btn btn-g" onClick={() => setShowApply(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Dashboard({ profiles, applications, currentUser, onNav, onUpdateApp, onViewProfile }) {
  const [activeType, setActiveType] = useState(profiles[0]?.type || "serious");
  const [innerTab, setInnerTab] = useState("applications");
  const [showPrint, setShowPrint] = useState(false);

  const TYPE_COLORS = { serious: "#c9a84c", casual: "#c0392b", friendship: "#52b788" };
  const activeProfile = profiles.find(p => p.type === activeType) || profiles[0];
  const apps = applications[activeProfile?.id] || MOCK_APPS[activeType] || [];
  const pending  = apps.filter(a => a.status === "pending");
  const accepted = apps.filter(a => a.status === "accepted");
  const declined = apps.filter(a => a.status === "declined");
  const profileUrl = `datecard.app/p/${activeProfile?.id || "DEMO"}`;

  function togglePause() {
    if (!activeProfile) return;
    const next = { ...activeProfile, status: activeProfile.status === "paused" ? "active" : "paused" };
    onUpdateProfile(next);
  }

  function AppCard({ app }) {
    const icons = { instagram: "📸", twitter: "🐦", facebook: "👤", tiktok: "🎵" };
    return (
      <div className="acard">
        <div className="aav">{app.emoji}</div>
        <div className="ainfo">
          <div className="aname">{app.name}</div>
          <div className="ameta">{icons[app.platform] || "👤"} {app.handle} · {app.appliedAt}</div>
          {app.note && <div className="anote">"{app.note}"</div>}
        </div>
        <div className="aacts">
          {app.status === "pending" ? (
            <>
              <button className="btn btn-s btn-sm" onClick={() => onUpdateApp(activeProfile.id, app.id, "accepted")}>Accept</button>
              <button className="btn btn-d btn-sm" onClick={() => onUpdateApp(activeProfile.id, app.id, "declined")}>Decline</button>
            </>
          ) : (
            <span className={`spill ${app.status}`}>{app.status}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="dash fade-in">
      <div className="dash-top">
        <div>
          <div className="dash-title">Your Cards</div>
          <div className="dash-sub">Manage all your DateCard profiles</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-o btn-sm" onClick={togglePause}>{activeProfile?.status === "paused" ? "▶ Resume" : "⏸ Pause"}</button>
          <button className="btn btn-o btn-sm" onClick={() => onViewProfile(activeProfile)}>Preview</button>
          <button className="btn btn-g btn-sm" onClick={() => onNav("choose-type")}>+ New Card</button>
        </div>
      </div>

      {/* Profile type switcher */}
      <div className="ptabs">
        {profiles.map(p => {
          const pt = PROFILE_TYPES.find(t => t.id === p.type);
          return (
            <button key={p.id} className={`ptab ${activeType === p.type ? "on" : ""}`}
              style={{ "--tc": TYPE_COLORS[p.type] }}
              onClick={() => { setActiveType(p.type); setInnerTab("applications"); }}>
              <span className="dot" style={{ "--tc": TYPE_COLORS[p.type] }} />
              {pt?.icon} {pt?.label}{p.status === "paused" ? " ⏸" : ""}
            </button>
          );
        })}
        {profiles.length < 3 && (
          <button className="add-ptab" onClick={() => onNav("choose-type")}>
            + Add Card {profiles.length > 0 && <span style={{ color: "var(--gold)", marginLeft: 4 }}>✦ Premium</span>}
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="stats">
        <div className="stat"><div className="stat-n">{apps.length}</div><div className="stat-l">Applications</div></div>
        <div className="stat"><div className="stat-n">{pending.length}</div><div className="stat-l">Pending</div></div>
        <div className="stat"><div className="stat-n">{accepted.length}</div><div className="stat-l">Accepted</div></div>
        <div className="stat"><div className="stat-n" style={{ fontSize: 20, marginTop: 7 }}>👁 —</div><div className="stat-l">Views <span style={{ color: "var(--gold)" }}>✦</span></div></div>
      </div>

      {/* QR + share */}
      <div className="qrbox">
        <QRImg value={`https://${profileUrl}`} size={116} />
        <div className="qrinfo" style={{ flex: 1, minWidth: 0 }}>
          <h3>{PROFILE_TYPES.find(t => t.id === activeProfile?.type)?.icon} {PROFILE_TYPES.find(t => t.id === activeProfile?.type)?.label} Card</h3>
          <p>Share this link or QR code. Anyone who scans it sees your {PROFILE_TYPES.find(t => t.id === activeProfile?.type)?.label.toLowerCase()} profile and can apply.</p>
          <div className="qr-url">https://{profileUrl}</div>
          <div className="qr-acts">
            <button className="btn btn-o btn-sm" onClick={() => navigator.clipboard?.writeText(`https://${profileUrl}`)}>Copy Link</button>
            <button className="btn btn-g btn-sm" onClick={() => setShowPrint(true)}>🖨 Print Card</button>
            <button className="btn btn-g btn-sm" style={{ color: "var(--gold)" }}>✦ Download QR</button>
          </div>
        </div>
      </div>

      {/* Inner tabs */}
      <div className="itabs">
        <button className={`itab ${innerTab === "applications" ? "on" : ""}`} onClick={() => setInnerTab("applications")}>Applications ({apps.length})</button>
        <button className={`itab ${innerTab === "accepted" ? "on" : ""}`} onClick={() => setInnerTab("accepted")}>Accepted ({accepted.length})</button>
        <button className={`itab ${innerTab === "analytics" ? "on" : ""}`} onClick={() => setInnerTab("analytics")}>Analytics ✦</button>
      </div>

      {innerTab === "applications" && (
        <div>
          {pending.length === 0 && declined.length === 0 && (
            <div className="empty"><div className="empty-i">📭</div><div className="empty-t">No applications yet</div><div className="empty-d">Share your QR code or link to start.</div></div>
          )}
          {pending.map(a => <AppCard key={a.id} app={a} />)}
          {declined.length > 0 && (
            <>
              <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase", margin: "20px 0 9px" }}>Declined</div>
              {declined.map(a => <AppCard key={a.id} app={a} />)}
            </>
          )}
        </div>
      )}

      {innerTab === "accepted" && (
        <div>
          {accepted.length === 0 ? (
            <div className="empty"><div className="empty-i">🤝</div><div className="empty-t">No connections yet</div><div className="empty-d">Accept applications to see them here.</div></div>
          ) : (
            <>
              <div className="notice">These people now have access to your social links.</div>
              {accepted.map(a => (
                <div key={a.id} className="acard">
                  <div className="aav">{a.emoji}</div>
                  <div className="ainfo"><div className="aname">{a.name}</div><div className="ameta">{a.handle}</div></div>
                  <span className="spill accepted">Connected</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {innerTab === "analytics" && (
        <div className="empty">
          <div className="empty-i">📊</div>
          <div className="empty-t">Analytics is Premium</div>
          <div className="empty-d">Profile views, scan counts, conversion rates, who viewed without applying.</div>
          <button className="btn btn-p" style={{ marginTop: 20 }}>Upgrade to Premium</button>
        </div>
      )}

      {showPrint && <PrintCardModal profile={activeProfile} onClose={() => setShowPrint(false)} />}
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────

function App() {
  const [page, setPage]         = useState("home");
  const [currentUser, setUser]  = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [applications, setApps] = useState({});
  const [pendingType, setPType] = useState(null);
  const [viewTarget, setVT]     = useState(null);

  // Real auth session (no-op in DEMO_MODE)
  useEffect(() => {
    if (DEMO_MODE) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setUser({ id: data.session.user.id, provider: data.session.user.app_metadata?.provider || "email" });
    });
    const { data: authSub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session ? { id: session.user.id, provider: session.user.app_metadata?.provider || "email" } : null);
    });
    return () => authSub.subscription.unsubscribe();
  }, []);

  // Load real profiles + applications for the signed-in user
  useEffect(() => {
    if (DEMO_MODE || !currentUser) return;
    getMyProfiles(currentUser.id).then(ps => {
      setProfiles(ps);
      Promise.all(ps.map(p => getApplications(p.id))).then(all => {
        const map = {};
        ps.forEach((p, i) => { map[p.id] = all[i] || []; });
        setApps(map);
      });
    });
  }, [currentUser]);

  function saveProfile(p, user) {
    if (!currentUser) setUser(user);
    setProfiles(prev => [...prev.filter(x => x.type !== p.type), p]);
    setApps(prev => ({ ...prev, [p.id]: MOCK_APPS[p.type] || [] }));
    if (!DEMO_MODE && currentUser) upsertProfile({ ...p, owner_id: currentUser.id });
  }

  function updateApp(profileId, appId, status) {
    setApps(prev => ({ ...prev, [profileId]: (prev[profileId] || []).map(a => a.id === appId ? { ...a, status } : a) }));
    if (!DEMO_MODE) updateApplication(profileId, appId, status);
  }

  function addApp(profileId, app) {
    setApps(prev => ({ ...prev, [profileId]: [...(prev[profileId] || []), app] }));
    if (!DEMO_MODE) addApplication(profileId, app);
  }

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <nav className="nav">
          <div className="logo" onClick={() => setPage("home")}>Date<em>Card</em></div>
          <div className="nav-r">
            {profiles.length > 0 ? (
              <>
                <button className="btn btn-g" onClick={() => setPage("dashboard")}>Dashboard</button>
                <button className="btn btn-p btn-sm" onClick={() => { setVT(null); setPage("view-demo"); }}>Preview</button>
              </>
            ) : (
              <>
                <button className="btn btn-g" onClick={() => { setVT(null); setPage("view-demo"); }}>Demo</button>
                <button className="btn btn-p btn-sm" onClick={() => setPage("choose-type")}>Get Started</button>
              </>
            )}
          </div>
        </nav>

        {page === "home" && <Landing onNav={setPage} />}

        {page === "choose-type" && (
          <ChooseType onNav={setPage} onChoose={t => setPType(t)} existingTypes={profiles.map(p => p.type)} />
        )}

        {page === "create-profile" && (
          <CreateProfile onNav={setPage} onSave={saveProfile} profileType={pendingType} existingUser={currentUser} />
        )}

        {page === "view-demo" && (
          <PublicProfileView profile={viewTarget} currentUser={currentUser} onNav={setPage} onApply={addApp} />
        )}

        {page === "dashboard" && profiles.length > 0 && (
          <Dashboard
            profiles={profiles} applications={applications} currentUser={currentUser}
            onNav={setPage} onUpdateApp={updateApp}
            onUpdateProfile={p => {
              setProfiles(prev => prev.map(x => x.id === p.id ? p : x));
              if (!DEMO_MODE && currentUser) upsertProfile({ ...p, owner_id: currentUser.id });
            }}
            onViewProfile={p => { setVT(p); setPage("view-demo"); }}
          />
        )}

        {page === "dashboard" && profiles.length === 0 && (
          <div className="page fade-in">
            <div className="page-t">No cards yet</div>
            <p className="page-s">Create your first DateCard to get started.</p>
            <button className="btn btn-p" onClick={() => setPage("choose-type")}>Create Your Card</button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── PUBLIC CARD PAGE (/p/:cardId) ───────────────────────────────────────────

function useNoindex() {
  useEffect(() => {
    const m = document.createElement("meta");
    m.name = "robots";
    m.content = "noindex";
    document.head.appendChild(m);
    return () => m.remove();
  }, []);
}

function PublicCardPage() {
  const { cardId } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useNoindex();

  useEffect(() => {
    let alive = true;
    (async () => {
      const p = DEMO_MODE ? null : await getProfileById(cardId);
      if (alive) { setProfile(p); setLoading(false); }
      if (!DEMO_MODE && p) logEvent(cardId, "view");
    })();
    return () => { alive = false; };
  }, [cardId]);

  if (loading) return (
    <div className="page" style={{ textAlign: "center", paddingTop: 80, color: "var(--muted)", fontSize: 13 }}>Loading card…</div>
  );

  if (!profile && !DEMO_MODE) return (
    <div className="page" style={{ textAlign: "center", paddingTop: 80 }}>
      <div style={{ fontSize: 34, marginBottom: 14 }}>🃏</div>
      <div className="page-t" style={{ fontSize: 26 }}>Card not found</div>
      <p className="page-s">Scan the card again — or ask the person for a fresh link.</p>
      <a href="/" className="btn btn-o" style={{ display: "inline-block", textDecoration: "none" }}>← Home</a>
    </div>
  );

  return (
    <PublicProfileView
      profile={profile}
      currentUser={null}
      onNav={() => {}}
      onApply={async (pid, app) => {
        if (DEMO_MODE) return;
        await addApplication(pid, app);
        logEvent(pid, "apply");
      }}
    />
  );
}

// ─── APPLICATION STATUS PAGE (/a/:appId) — the applicant's side ──────────────

function ApplicationStatusPage() {
  const { appId } = useParams();
  const [app, setApp] = useState(null);
  const [profile, setProfile] = useState(null);
  const [socials, setSocials] = useState(null);
  const [loading, setLoading] = useState(true);

  useNoindex();

  useEffect(() => {
    let alive = true;
    (async () => {
      if (DEMO_MODE) {
        if (alive) { setApp({ id: appId, status: "pending" }); setProfile(null); setLoading(false); }
        return;
      }
      const a = await getApplicationById(appId);
      if (!a) { if (alive) setLoading(false); return; }
      const p = await getProfileById(a.profile_id);
      const s = a.status === "accepted" ? await getRevealedSocials(a.profile_id) : null;
      if (alive) { setApp(a); setProfile(p); setSocials(s); setLoading(false); }
    })();
    return () => { alive = false; };
  }, [appId]);

  if (loading) return (
    <div className="page" style={{ textAlign: "center", paddingTop: 80, color: "var(--muted)", fontSize: 13 }}>Loading application…</div>
  );

  if (!app) return (
    <div className="page" style={{ textAlign: "center", paddingTop: 80 }}>
      <div style={{ fontSize: 34, marginBottom: 14 }}>📨</div>
      <div className="page-t" style={{ fontSize: 26 }}>Application not found</div>
      <p className="page-s">This link is private to you. Scan the card again to start a new application.</p>
      <a href="/" className="btn btn-o" style={{ display: "inline-block", textDecoration: "none" }}>← Home</a>
    </div>
  );

  const pt = PROFILE_TYPES.find(t => t.id === (profile?.type || "serious")) || PROFILE_TYPES[0];
  const socialList = socials ? Object.entries(socials).filter(([, v]) => v) : [];

  return (
    <div className="pview fade-in">
      <div className="type-banner" style={{ borderColor: `${pt.color}44`, color: pt.color, background: `${pt.color}0a` }}>
        {pt.icon} <span style={{ letterSpacing: "0.06em" }}>{pt.label} Card</span>
      </div>

      <div className="profile-hdr">
        <div className="profile-name">{profile?.name || "Alex Morgan"}</div>
        <div className="profile-meta">Application · <span className={`spill ${app.status}`} style={{ display: "inline-block", marginLeft: 6 }}>{app.status}</span></div>
        {app.status === "pending" && <p className="profile-bio" style={{ marginTop: 14 }}>⏳ Waiting on their decision. You'll get their socials here the moment they accept.</p>}
        {app.status === "declined" && <p className="profile-bio" style={{ marginTop: 14 }}>This application was declined. No hard feelings — the card is the door, not the verdict.</p>}
      </div>

      {app.status === "accepted" && (
        <div style={{ marginBottom: 30 }}>
          <div className="slabel" style={{ marginTop: 0 }}>You're in 🎉 — here are their socials</div>
          {socialList.length === 0 && <div className="notice">Their socials are on the way — check back in a moment.</div>}
          {socialList.map(([platform, handle]) => (
            <div key={platform} className="acard">
              <div className="aav">{SOCIAL_PLATFORMS.find(s => s.id === platform)?.icon || "🔗"}</div>
              <div className="ainfo">
                <div className="aname">{SOCIAL_PLATFORMS.find(s => s.id === platform)?.label || platform}</div>
                <div className="ameta">{handle}</div>
              </div>
              <button className="btn btn-o btn-sm" onClick={() => navigator.clipboard?.writeText(String(handle))}>Copy</button>
            </div>
          ))}
          <div className="notice" style={{ marginTop: 16 }}>Be cool, be kind, and don't share their links without asking. That's the deal.</div>
        </div>
      )}

      {app.status === "pending" && (
        <div className="lock-box" style={{ marginTop: 10 }}>
          <div style={{ fontSize: 26 }}>🔒</div>
          <h3>Socials unlock on accept</h3>
          <p>Bookmark this page. When they accept, their links appear right here.</p>
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 20 }}>
        <a href="/" className="btn btn-g" style={{ textDecoration: "none", display: "inline-block" }}>← Home</a>
      </div>
    </div>
  );
}

export default function Root() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/p/:cardId" element={<PublicCardPage />} />
        <Route path="/a/:appId" element={<ApplicationStatusPage />} />
        <Route path="*" element={<App />} />
      </Routes>
    </BrowserRouter>
  );
}

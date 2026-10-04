// The landing page's one orchestrated moment: a storyboard of how a DateCard
// gets used, played on a lamp-lit table. Built from real pieces — the actual
// BizCard and real, scannable QR codes — so what you watch is the product.

import { useEffect, useRef, useState } from "react";
import { SAMPLE_CARDS } from "../lib/samples.js";
import { templateOf, qrColors } from "../lib/constants.js";
import { cardUrl } from "../lib/util.js";
import { BizCard } from "./cards.jsx";
import { QR } from "./ui.jsx";
import "./hero-story.css";

const ALEX = SAMPLE_CARDS[0];
const NOTE = "Okay, which hole-in-the-wall place? I need names.";
const STAGE_W = 440;
const STAGE_H = 500;

const STEPS = [
  { ms: 2800, caption: "You meet someone. Instead of your Instagram, you hand them your card." },
  { ms: 1900, caption: "They scan the QR. There's no app to install." },
  { ms: 2600, caption: "They read the side of you that you chose to show." },
  { ms: 3300, caption: "If they like what they read, they apply with a note." },
  { ms: 2400, caption: "You see who they are and what they said. You decide." },
  { ms: 2900, caption: "Say yes, and only then do they get your socials." },
  { ms: 4600, caption: "Print it, set it as your lock screen, post it, or wear it at events." },
];

const CHAPTERS = [
  { label: "Hand it over", steps: [0] },
  { label: "They scan it", steps: [1, 2] },
  { label: "They apply", steps: [3] },
  { label: "You decide", steps: [4, 5] },
  { label: "Carry it anywhere", steps: [6] },
];

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

export default function HeroStory() {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(!reduced);
  const [visible, setVisible] = useState(true);
  const [k, setK] = useState(1);
  const [typed, setTyped] = useState(0);
  const wrap = useRef(null);

  // Scale the fixed-size stage to the column width.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setK(Math.min(1, e.contentRect.width / STAGE_W)));
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => { ro.disconnect(); io.disconnect(); };
  }, []);

  useEffect(() => { if (reduced) setPlaying(false); }, [reduced]);

  // Advance through the storyboard.
  useEffect(() => {
    if (!playing || !visible || document.hidden) return;
    const t = setTimeout(() => setStep((s) => (s + 1) % STEPS.length), STEPS[step].ms);
    return () => clearTimeout(t);
  }, [step, playing, visible]);

  // Type the note out during "They apply".
  useEffect(() => {
    if (step !== 3) { setTyped(step > 3 ? NOTE.length : 0); return; }
    if (reduced || !playing) { setTyped(NOTE.length); return; }
    setTyped(0);
    const t = setInterval(() => setTyped((n) => (n >= NOTE.length ? n : n + 1)), 42);
    return () => clearInterval(t);
  }, [step, reduced, playing]);

  const chapter = CHAPTERS.findIndex((c) => c.steps.includes(step));

  return (
    <figure className="hs" aria-label="How a DateCard gets used">
      <div className="hs-wrap" ref={wrap} style={{ height: STAGE_H * k }}>
        <div className="hs-stage" data-step={step} data-motion={reduced ? "off" : "on"} style={{ transform: `scale(${k})` }} aria-hidden="true">
          <div className="hs-lamp" />

          <div className="hs-obj hs-card"><BizCard profile={ALEX} tpl={templateOf("cream")} /></div>
          <div className="hs-label hs-label-card">In their wallet</div>

          <div className="hs-obj hs-phone">
            <div className="hs-whose">{step >= 4 && step < 6 ? "Your phone" : "Their phone"}</div>
            <div className="hs-screen">
              <ScanScreen on={step === 1} />
              <ProfileScreen on={step === 2} />
              <ApplyScreen on={step === 3} typed={typed} />
              <NotifyScreen on={step === 4} />
              <AcceptedScreen on={step === 5} />
              <LockScreen on={step === 6} />
            </div>
          </div>
          <div className="hs-label hs-label-phone">On your lock screen</div>

          <div className="hs-obj hs-story">
            <div className="hs-story-name">Alex</div>
            <div className="hs-story-sub">serious card</div>
            <div className="hs-qr-tile"><QR value={cardUrl(ALEX.id)} size={58} fg="#120e0c" bg="#f3ecdd" margin={1} alt="" /></div>
            <div className="hs-story-cta">Scan to apply</div>
          </div>
          <div className="hs-label hs-label-story">In your story</div>

          <div className="hs-obj hs-badge">
            <div className="hs-strap" />
            <div className="hs-badge-card">
              <div className="hs-badge-name">Alex Morgan</div>
              <div className="hs-badge-sub">Hi, I'm single</div>
              <QR value={cardUrl(ALEX.id)} size={54} {...qrColors(templateOf("cream"))} margin={1} alt="" />
            </div>
          </div>
          <div className="hs-label hs-label-badge">At events</div>

        </div>
      </div>

      <figcaption className="hs-caption" key={step}>{STEPS[step].caption}</figcaption>

      <div className="hs-controls">
        <ol className="hs-chapters">
          {CHAPTERS.map((c, i) => (
            <li key={c.label}>
              <button type="button" className={`hs-chapter ${i === chapter ? "on" : ""} ${i < chapter ? "done" : ""}`}
                aria-current={i === chapter ? "step" : undefined} onClick={() => setStep(c.steps[0])}>
                <span className="hs-bar"><span key={i === chapter ? step : "x"} style={i === chapter && playing ? { animationDuration: `${c.steps.reduce((a, s) => a + STEPS[s].ms, 0)}ms`, animationDelay: `-${c.steps.slice(0, c.steps.indexOf(step)).reduce((a, s) => a + STEPS[s].ms, 0)}ms` } : undefined} /></span>
                <span className="hs-chapter-l">{c.label}</span>
              </button>
            </li>
          ))}
        </ol>
        <button type="button" className="hs-play" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause the story" : "Play the story"}>
          {playing ? "❚❚" : "▶"}
        </button>
      </div>
    </figure>
  );
}

// ─── phone screens ───────────────────────────────────────────────────────────

const Screen = ({ on, className = "", children }) => <div className={`hs-scr ${className} ${on ? "on" : ""}`}>{children}</div>;

function ScanScreen({ on }) {
  return (
    <Screen on={on} className="hs-scan">
      <div className="hs-viewfinder">
        <div className="hs-mini-card"><span>Alex Morgan</span><i /></div>
        <b className="c1" /><b className="c2" /><b className="c3" /><b className="c4" />
        <div className="hs-sweep" />
      </div>
      <div className="hs-scan-hint">datecard.app/p/DEMO</div>
    </Screen>
  );
}

function ProfileScreen({ on }) {
  return (
    <Screen on={on} className="hs-profile">
      <div className="hs-pill">Serious card</div>
      <div className="hs-avatar">{ALEX.avatar}</div>
      <div className="hs-name">{ALEX.name}</div>
      <div className="hs-meta">28, New York</div>
      <p className="hs-bio">Weekends are bookshops or hiking trails, rarely both, never neither.</p>
      <div className="hs-prompt"><em>A perfect Sunday looks like…</em><span>Farmers market, long brunch, an obscure film.</span></div>
      <div className="hs-btn hs-btn-pulse">Apply to connect</div>
    </Screen>
  );
}

function ApplyScreen({ on, typed }) {
  const done = typed >= NOTE.length;
  return (
    <Screen on={on} className="hs-apply">
      <div className="hs-h">Apply to connect</div>
      <div className="hs-signed">Signed in with Google</div>
      <div className="hs-note">{NOTE.slice(0, typed)}<span className="hs-caret" /></div>
      <div className={`hs-btn ${done ? "hs-btn-sent" : ""}`}>{done ? "Sent" : "Send application"}</div>
      <div className="hs-small">Alex sees your name and note, then decides.</div>
    </Screen>
  );
}

function NotifyScreen({ on }) {
  return (
    <Screen on={on} className="hs-notify">
      <div className="hs-toast">New application on your serious card</div>
      <div className="hs-app">
        <div className="hs-app-av">🏃</div>
        <div><div className="hs-app-name">Kai Navarro</div><div className="hs-app-h">@kairuns, just now</div></div>
      </div>
      <div className="hs-app-note">“{NOTE}”</div>
      <div className="hs-row"><div className="hs-btn hs-accept">Accept</div><div className="hs-btn hs-ghost">Decline</div></div>
    </Screen>
  );
}

function AcceptedScreen({ on }) {
  return (
    <Screen on={on} className="hs-accepted">
      <div className="hs-lock"><span className="hs-shackle" /><span className="hs-body" /></div>
      <div className="hs-h">Kai can see your socials now</div>
      <div className="hs-chip">📸 @alexmorgan.film</div>
      <div className="hs-small">Everyone else still sees a locked card.</div>
    </Screen>
  );
}

function LockScreen({ on }) {
  return (
    <Screen on={on} className="hs-lockscreen">
      <div className="hs-time">9:41</div>
      <div className="hs-date">Saturday, October 4</div>
      <div className="hs-ls-name">Alex Morgan</div>
      <div className="hs-qr-tile"><QR value={cardUrl(ALEX.id)} size={72} fg="#120e0c" bg="#f3ecdd" margin={1} alt="" /></div>
      <div className="hs-ls-cta">Scan to apply</div>
    </Screen>
  );
}

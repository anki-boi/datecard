import { useRef } from "react";
import { Link } from "react-router-dom";
import { SAMPLE_CARDS } from "../lib/samples.js";
import { templateOf, typeOf } from "../lib/constants.js";
import { DEMO_MODE } from "../lib/api.js";
import { BizCard } from "../components/cards.jsx";
import { useApp } from "../state.jsx";

function TiltCard({ profile }) {
  const ref = useRef(null);
  function move(e) {
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    if (ref.current) ref.current.style.transform = `rotateY(${x * 22}deg) rotateX(${-y * 22}deg)`;
  }
  return (
    <div className="card3d" onMouseMove={move} onMouseLeave={() => ref.current && (ref.current.style.transform = "")}>
      <div className="card3d-inner" ref={ref}><BizCard profile={profile} tpl={templateOf("noir")} /></div>
    </div>
  );
}

export default function Landing() {
  const { profiles } = useApp();
  const alex = SAMPLE_CARDS[0];
  return (
    <div className="landing fade-in" style={{ maxWidth: 1000 }}>
      <div className="hero-grid">
        <div>
          <div className="eyebrow">DateCard · open source</div>
          <h1 className="hero-t">Your dating profile,<br /><em>unchained.</em></h1>
          <p className="hero-s">
            Met someone in real life? Don't hand over your whole Instagram. Hand them a card.
            They scan it, read the side of you that you chose, and <em style={{ color: "var(--gold-light)" }}>apply</em>. You say yes, and only then do they get your socials.
          </p>
          <div className="cta-row">
            {profiles.length
              ? <Link className="btn btn-p btn-lg" to="/dashboard" style={{ textDecoration: "none" }}>Open your dashboard</Link>
              : <Link className="btn btn-p btn-lg" to="/new" style={{ textDecoration: "none" }}>Create your card</Link>}
            <Link className="btn btn-o btn-lg" to="/p/DEMO" style={{ textDecoration: "none" }}>See a card</Link>
          </div>
        </div>
        <div>
          <TiltCard profile={alex} />
          <div className="scan-hint">↑ that QR is real — scan it with your phone</div>
        </div>
      </div>

      <div className="section">
        <div className="eyebrow" style={{ marginBottom: 18 }}>How it works</div>
        <div className="steps">
          {[
            ["01", "Build", "Prompts, interests, a photo. Or answer six questions and let the AI write a first draft in your voice."],
            ["02", "Carry it", "A printed card, your lock screen, a story. One QR per card — it never goes stale."],
            ["03", "They apply", "Whoever scans it reads your card and applies with a one-tap login and a note."],
            ["04", "You decide", "Accept and your socials unlock for them, with an opener ready to send. Decline and nothing happens. No awkwardness."],
          ].map(([n, t, d]) => (
            <div key={n} className="step"><div className="step-n">{n}</div><div className="step-t">{t}</div><div className="step-d">{d}</div></div>
          ))}
        </div>
      </div>

      <div className="section">
        <h2>Three cards. <em>Three sides of you.</em></h2>
        <p>One account holds up to three cards: Serious, Casual and Friendship. Each has its own link, QR code and inbox. Public pages never link them, so your serious card can't lead anyone to your casual one. Open a sample and apply — the demo owners answer in a few seconds.</p>
        <div className="samples">
          {SAMPLE_CARDS.map((c) => {
            const pt = typeOf(c.type);
            return (
              <Link key={c.id} to={`/p/${c.id}`} className="sample" style={{ "--tc": pt.color }}>
                <div className="sample-type">{pt.icon} {pt.label}</div>
                <div className="sample-name">{c.name}</div>
                <div className="sample-line">“{c.lookingFor}”</div>
                <div className="sample-go">Read the card & apply →</div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="section">
        <h2>Privacy is <em>the product.</em></h2>
        <p>If scanning your card leaked your life, the whole idea would fall apart. So the database itself enforces the rules, not just the UI.</p>
        <div className="pillars">
          {[
            ["🔒", "Socials stay locked", "They never appear in the public page's data. A database function hands them out only to you, or to someone you've accepted."],
            ["🧱", "No cross-linking", "Public cards don't reveal who owns them, so your three cards can't be tied together."],
            ["🙈", "Not on Google", "Every card is noindex. People find it by scanning it, not by searching your name."],
            ["🏙", "City on your terms", "Casual cards never show a city. The others have a toggle, enforced on the server."],
            ["📵", "No third parties", "QR codes and posters are drawn in your browser. Nobody else sees which cards exist."],
            ["🧾", "Open source, MIT", "Read every policy. Self-host it on a free tier. The software is unchained too."],
          ].map(([i, t, d]) => (
            <div key={t} className="pillar"><div className="pillar-i">{i}</div><div className="pillar-t">{t}</div><div className="pillar-d">{d}</div></div>
          ))}
        </div>
      </div>

      <div className="section" style={{ textAlign: "center" }}>
        <h2>Make one in two minutes.</h2>
        <p style={{ margin: "0 auto 26px" }}>{DEMO_MODE ? "This is the demo: everything is saved in your browser, so play as much as you like." : "One tap to sign in. No forms."}</p>
        <Link className="btn btn-p btn-lg" to="/new" style={{ textDecoration: "none" }}>Create your card</Link>
      </div>

      <div className="foot">
        <span>DateCard — no app, no algorithm, no feed.</span>
        <span><a href="https://github.com/anki-boi/datecard" target="_blank" rel="noreferrer">Source on GitHub</a> · MIT</span>
      </div>
    </div>
  );
}

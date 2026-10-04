import { Link } from "react-router-dom";
import { SAMPLE_CARDS } from "../lib/samples.js";
import { typeOf } from "../lib/constants.js";
import { DEMO_MODE } from "../lib/api.js";
import HeroStory from "../components/HeroStory.jsx";
import { useApp } from "../state.jsx";

export default function Landing() {
  const { profiles } = useApp();
  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-copy">
          <h1 className="hero-t">Hand them a card, not your whole Instagram.</h1>
          <p className="hero-s">
            When you meet someone, give them a DateCard. They scan it, read the side of you that you chose,
            and ask to connect. Your socials stay locked until you say yes.
          </p>
          <div className="cta-row">
            {profiles.length
              ? <Link className="btn btn-p btn-lg" to="/dashboard">Open your dashboard</Link>
              : <Link className="btn btn-p btn-lg" to="/new">Make your card</Link>}
            <Link className="btn btn-o btn-lg" to="/p/DEMO">Open a sample card</Link>
          </div>
          <p className="hero-note">Free and open source. Nobody needs to install an app.</p>
        </div>
        <HeroStory />
      </section>

      <section className="section">
        <h2>Three cards for three sides of you</h2>
        <p>
          One account holds a serious card, a casual card and a friendship card. Each has its own link, QR code and inbox,
          and nothing on a public card points to the others. Open one and apply — the sample owners answer in a few seconds.
        </p>
        <div className="samples">
          {SAMPLE_CARDS.map((c) => {
            const pt = typeOf(c.type);
            return (
              <Link key={c.id} to={`/p/${c.id}`} className="sample" style={{ "--tc": pt.color }}>
                <div className="sample-type">{pt.icon} {pt.label}</div>
                <div className="sample-name">{c.name}</div>
                <div className="sample-line">“{c.lookingFor}”</div>
                <div className="sample-go">Read {c.name.split(" ")[0]}'s card</div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="section">
        <h2>The database keeps your secrets, not just the page</h2>
        <p>If scanning a card leaked your life, the idea would fall apart. So the rules live in the database, where a clever visitor can't get around them.</p>
        <div className="pillars">
          {[
            ["🔒", "Socials stay locked", "They're never sent to the public page. Only you, and people you've accepted, can fetch them."],
            ["🧱", "Cards can't be linked", "A public card doesn't say who owns it, so your serious and casual cards can't be tied together."],
            ["🙈", "Not on Google", "Cards are hidden from search engines. People find yours by scanning it."],
            ["🧾", "Open source", "Read every rule yourself, or run your own copy on a free tier."],
          ].map(([i, t, d]) => (
            <div key={t} className="pillar"><div className="pillar-i" aria-hidden="true">{i}</div><div className="pillar-t">{t}</div><div className="pillar-d">{d}</div></div>
          ))}
        </div>
      </section>

      <section className="section closing">
        <h2>Make yours in about two minutes</h2>
        <p>{DEMO_MODE ? "This is the demo, so everything stays in your browser. Play as much as you like." : "Build it first. You only sign in when you publish."}</p>
        <Link className="btn btn-p btn-lg" to="/new">Make your card</Link>
      </section>

      <footer className="foot">
        <span>DateCard. No app, no algorithm, no feed.</span>
        <a href="https://github.com/anki-boi/datecard" target="_blank" rel="noreferrer">Source on GitHub (MIT)</a>
      </footer>
    </div>
  );
}

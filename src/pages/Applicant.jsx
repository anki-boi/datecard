// The applicant's side: the public card (/p/:cardId), the private status page
// (/a/:appId) and the list of everything you've applied to (/me).

import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import * as api from "../lib/api.js";
import { sampleCard } from "../lib/samples.js";
import { STRANGER, SAMPLE_ACCEPT_MS } from "../lib/demo.js";
import { typeOf, socialOf } from "../lib/constants.js";
import { timeAgo } from "../lib/util.js";
import { generateOpeners } from "../lib/openers.js";
import { aiAvailable, aiOpeners } from "../lib/ai.js";
import { saveDraft, loadDraft, clearDraft } from "../lib/drafts.js";
import { useApp } from "../state.jsx";
import { Modal, ModalHeader, AuthButtons, Loading, Empty, useCopy } from "../components/ui.jsx";
import { ProfileBody, Avatar } from "../components/cards.jsx";

export function useNoindex() {
  useEffect(() => {
    const m = document.createElement("meta");
    m.name = "robots";
    m.content = "noindex, nofollow";
    document.head.appendChild(m);
    return () => m.remove();
  }, []);
}

function useTitle(title) {
  useEffect(() => {
    const prev = document.title;
    if (title) document.title = title;
    return () => { document.title = prev; };
  }, [title]);
}

// ─── /p/:cardId ──────────────────────────────────────────────────────────────

export function PublicCardPage() {
  const { cardId } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, toast, demo } = useApp();
  const [profile, setProfile] = useState(undefined);
  const [asStranger, setAsStranger] = useState(false);
  const [applying, setApplying] = useState(params.get("apply") === "1");
  const [reported, setReported] = useState(false);
  const [existing, setExisting] = useState(null);
  const viewed = useRef(false);

  useNoindex();
  useTitle(profile ? `${profile.name} · DateCard` : null);

  useEffect(() => {
    let alive = true;
    (async () => {
      let p = await api.getPublicProfile(cardId).catch(() => null);
      // Live deployments still show the sample cards, read-only, so "See a card" always works.
      if (!p && !api.DEMO_MODE && sampleCard(cardId)) p = { ...sampleCard(cardId), socials: undefined, isMine: false, liveSample: true };
      if (!alive) return;
      setProfile(p);
      if (p && !p.isMine && !p.liveSample && !viewed.current) { viewed.current = true; api.logEvent(cardId, "view"); }
    })();
    return () => { alive = false; };
  }, [cardId, user?.id]);

  // Already applied? Then show the status link instead of the button.
  const demoApps = demo?.applications.length;
  useEffect(() => {
    api.getMyApplications().then((rows) => setExisting(rows.find((r) => r.app.profile_id === cardId)?.app || null)).catch(() => {});
  }, [cardId, user?.id, demoApps]);

  if (profile === undefined) return <Loading>Loading card…</Loading>;

  if (!profile) return (
    <div className="page" style={{ textAlign: "center", paddingTop: 80 }}>
      <div style={{ fontSize: 34, marginBottom: 14 }}>🃏</div>
      <div className="page-t" style={{ fontSize: 26 }}>Card not found</div>
      <p className="page-s">Scan the card again, or ask them for a fresh link.</p>
      <Link to="/" className="btn btn-o" style={{ display: "inline-block", textDecoration: "none" }}>← Home</Link>
    </div>
  );

  const isOwn = profile.isMine && !asStranger;
  const paused = profile.status === "paused";
  const first = profile.name?.split(" ")[0] || "They";

  function report() {
    if (reported) return;
    setReported(true);
    api.logEvent(profile.id, "report");
    toast("Thanks — reported. Nothing is shared with the card's owner.");
  }

  return (
    <div className="pview fade-in">
      {isOwn && (
        <div className="notice" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span>👋 This is your card, as strangers see it.</span>
          <span style={{ display: "flex", gap: 6 }}>
            {demo && <button className="btn btn-o btn-sm" onClick={() => setAsStranger(true)}>Try applying as a stranger</button>}
            <Link className="btn btn-g btn-sm" to={`/dashboard?card=${profile.type}`}>Dashboard →</Link>
          </span>
        </div>
      )}
      {profile.isMine && asStranger && (
        <div className="notice">🎭 Stranger mode: you're seeing (and applying to) your own card the way someone who scanned it would.</div>
      )}
      {profile.sample && demo && !isOwn && (
        <div className="notice">✨ Sample card. Apply and {first} answers in about {Math.round(SAMPLE_ACCEPT_MS / 1000)} seconds, so you can see what the applicant gets.</div>
      )}
      {profile.liveSample && <div className="notice">✨ This is a sample card, so it isn't taking applications. <Link to="/new">Make your own →</Link></div>}
      {paused && <div className="notice" style={{ borderLeftColor: "var(--muted)" }}>⏸ This card is paused — not taking new applications right now.</div>}

      <ProfileBody p={profile} />

      <div className="lock-box">
        <div style={{ fontSize: 26 }}>🔒</div>
        <h3>Socials are private</h3>
        <p>Apply to connect. {first} reads your note and decides whether to share their links. If it's a no, you'll just see "not this time" — no drama either way.</p>
        {existing ? (
          <Link className="btn btn-o btn-lg" to={`/a/${existing.id}`} style={{ textDecoration: "none", display: "inline-block" }}>
            {existing.status === "accepted" ? "🎉 You're in — see their socials" : "✓ Applied — check your status"}
          </Link>
        ) : isOwn ? (
          <div style={{ color: "var(--muted)", fontSize: 12 }}>This is your own card.</div>
        ) : paused || profile.liveSample ? (
          <div style={{ color: "var(--muted)", fontSize: 13 }}>Not taking applications right now.</div>
        ) : (
          <button className="btn btn-p btn-lg" onClick={() => setApplying(true)}>Apply to connect</button>
        )}
      </div>

      {!isOwn && !profile.liveSample && (
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button className="btn btn-g btn-sm" onClick={report}>{reported ? "Reported — thank you." : "Report this card"}</button>
        </div>
      )}
      <div style={{ textAlign: "center", marginTop: 8 }}>
        <Link to="/" className="btn btn-g btn-sm" style={{ textDecoration: "none" }}>What is DateCard?</Link>
      </div>

      {applying && (
        <ApplyModal profile={profile} onClose={() => { setApplying(false); if (params.get("apply")) setParams({}, { replace: true }); }}
          onSent={(app) => navigate(`/a/${app.id}`, { state: { justApplied: true } })} />
      )}
    </div>
  );
}

function ApplyModal({ profile, onClose, onSent }) {
  const { user, toast } = useApp();
  const draftKey = `apply.${profile.id}`;
  const [note, setNote] = useState(() => loadDraft(draftKey)?.note || "");
  const [provider, setProvider] = useState(null);
  const [busy, setBusy] = useState(false);
  const first = profile.name?.split(" ")[0] || "them";
  const signedIn = api.DEMO_MODE ? !!provider : !!user;

  useEffect(() => { saveDraft(draftKey, { note }); }, [note, draftKey]);

  async function pickProvider(p) {
    if (api.DEMO_MODE) { setProvider(p); return; }
    // Live: OAuth leaves the page. Come back to this card with the modal open and the note intact.
    const back = new URL(window.location.href);
    back.searchParams.set("apply", "1");
    window.history.replaceState(null, "", back);
    setBusy(true);
    try { await api.signIn(p); } catch (e) { toast(e.message, "bad"); setBusy(false); }
  }

  async function submit() {
    setBusy(true);
    try {
      const app = await api.submitApplication(profile.id, { note: note.trim(), provider: provider || user?.provider });
      clearDraft(draftKey);
      onSent(app);
    } catch (e) {
      toast(e.message, "bad");
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose} maxWidth={480} label="Apply to connect">
      <ModalHeader title="Apply to connect" sub={`${first} sees your name and note, then decides.`} onClose={onClose} />
      {!signedIn ? (
        <>
          <div className="side-label">Step 1 · who are you?</div>
          <AuthButtons busy={busy} onPick={pickProvider} />
          {api.DEMO_MODE && <div className="notice">Demo mode — pick any. No real sign-in happens.</div>}
        </>
      ) : (
        <div className="notice" style={{ borderLeftColor: "var(--green)" }}>
          ✓ Applying as <strong style={{ color: "var(--paper)" }}>{api.DEMO_MODE ? "you (demo)" : user.name || "you"}</strong>
        </div>
      )}
      {profile.type === "casual" && <div className="notice">🔥 Casual card. A second account is a good idea here — keep your main handle safe.</div>}
      <div className="field">
        <label htmlFor="apply-note">A note (optional, but it works)</label>
        <textarea id="apply-note" value={note} maxLength={280} onChange={(e) => setNote(e.target.value)}
          placeholder={profile.prompts?.[0] ? `Something about “${profile.prompts[0].prompt.replace("...", "…")}”?` : "Say something that'll make them want to accept…"} />
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button className="btn btn-p" disabled={!signedIn || busy} onClick={submit}>{busy && signedIn ? "Sending…" : "Send application"}</button>
        <button className="btn btn-g" onClick={onClose}>Cancel</button>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted)" }}>{note.length}/280</span>
      </div>
    </Modal>
  );
}

// ─── /a/:appId ───────────────────────────────────────────────────────────────

export function ApplicationStatusPage() {
  const { appId } = useParams();
  const location = useLocation();
  const { user, authReady, confetti, toast, demo } = useApp();
  const copy = useCopy();
  const [app, setApp] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [socials, setSocials] = useState(null);
  const [ai, setAi] = useState(null);
  const lastStatus = useRef(null);

  useNoindex();

  const demoTick = demo ? demo.applications.find((a) => a.id === appId)?.status : null;
  useEffect(() => {
    if (!authReady) return;
    let alive = true;
    async function load() {
      const a = await api.getApplication(appId).catch(() => null);
      if (!alive) return;
      if (!a) { setApp(null); return; }
      const [p, s] = await Promise.all([
        api.getPublicProfile(a.profile_id).catch(() => null),
        a.status === "accepted" ? api.revealSocials(a.profile_id, a.applicant_id).catch(() => null) : null,
      ]);
      if (!alive) return;
      if (lastStatus.current === "pending" && a.status === "accepted") confetti();
      lastStatus.current = a.status;
      setApp(a); setProfile(p); setSocials(s);
    }
    load();
    // Live: poll while pending. Demo: the store notifies us (demoTick).
    const t = !api.DEMO_MODE && setInterval(() => document.visibilityState === "visible" && lastStatus.current === "pending" && load(), 20000);
    return () => { alive = false; if (t) clearInterval(t); };
  }, [appId, authReady, user?.id, demoTick, confetti]);

  if (!authReady || app === undefined) return <Loading>Loading application…</Loading>;

  if (!app) return (
    <div className="page" style={{ textAlign: "center", paddingTop: 80 }}>
      <div style={{ fontSize: 34, marginBottom: 14 }}>📨</div>
      <div className="page-t" style={{ fontSize: 26 }}>Application not found</div>
      {!api.DEMO_MODE && !user ? (
        <>
          <p className="page-s">Status pages are private. Sign in with the account you applied with.</p>
          <div style={{ maxWidth: 460, margin: "0 auto" }}><AuthButtons onPick={(p) => api.signIn(p).catch((e) => toast(e.message, "bad"))} /></div>
        </>
      ) : (
        <p className="page-s">This link is private to whoever applied. Scan the card again to start a new application.</p>
      )}
      <Link to="/" className="btn btn-o" style={{ display: "inline-block", textDecoration: "none" }}>← Home</Link>
    </div>
  );

  const pt = typeOf(profile?.type);
  const first = profile?.name?.split(" ")[0] || "They";
  const socialList = socials ? Object.entries(socials).filter(([, v]) => v && String(v).trim()) : [];
  const openers = ai || (profile ? generateOpeners(profile, app.id) : []);
  const demoOwnCard = demo && app.applicant_id === STRANGER && !sampleCard(app.profile_id);

  return (
    <div className="pview fade-in">
      {location.state?.justApplied && app.status === "pending" && (
        <div className="success-banner">✓ Application sent. Bookmark this page — it's your private status link{api.DEMO_MODE ? "" : " (also listed under My applications)"}.</div>
      )}

      <div className="type-banner" style={{ borderColor: `${pt.color}44`, color: pt.color, background: `${pt.color}0a` }}>
        {pt.icon} <span style={{ letterSpacing: "0.06em" }}>{pt.label} Card</span>
        <span style={{ color: "var(--muted)", fontSize: 11, marginLeft: "auto" }}>applied {timeAgo(app.created_at)}</span>
      </div>

      <div className="profile-hdr">
        {profile && <Avatar profile={profile} size={84} />}
        <div className="profile-name">{profile?.name || "Their card"}</div>
        <div className="profile-meta">Your application · <span className={`spill ${app.status}`} style={{ display: "inline-block", marginLeft: 6 }}>{app.status}</span></div>
        {app.status === "pending" && (
          <>
            <p className="profile-bio" style={{ marginTop: 14 }}>⏳ {first} hasn't decided yet. Their socials show up right here the moment they accept.</p>
            <div className="waiting"><i /><i /><i /> <span style={{ marginLeft: 6 }}>{sampleCard(app.profile_id) && demo ? `${first} is reading your note…` : "waiting"}</span></div>
          </>
        )}
        {app.status === "declined" && <p className="profile-bio" style={{ marginTop: 14 }}>Not this time. No hard feelings — the card is a door, not a verdict.</p>}
      </div>

      {app.note && <div className="pcard" style={{ marginBottom: 26 }}><div className="pcard-q">Your note</div><div className="pcard-a">“{app.note}”</div></div>}

      {demoOwnCard && app.status === "pending" && (
        <div className="notice">🎭 You applied to your own card. Go to the <Link to="/dashboard">dashboard</Link>, accept yourself, then come back here.</div>
      )}

      {app.status === "accepted" && (
        <div className="reveal" style={{ marginBottom: 30 }}>
          <div className="slabel" style={{ marginTop: 0 }}>You're in 🎉 — here's where to find {first}</div>
          {socialList.length === 0 && <div className="notice">Their links are on the way — check back in a moment.</div>}
          {socialList.map(([platform, handle]) => {
            const s = socialOf(platform);
            const href = s?.link?.(String(handle));
            return (
              <div key={platform} className="acard">
                <div className="aav" aria-hidden="true">{s?.icon || "🔗"}</div>
                <div className="ainfo"><div className="aname">{s?.label || platform}</div><div className="ameta">{handle}</div></div>
                <div className="aacts">
                  {href && <a className="btn btn-p btn-sm" href={href} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>Open</a>}
                  <button className="btn btn-o btn-sm" onClick={() => copy(String(handle), `${s?.label || platform} copied`)}>Copy</button>
                </div>
              </div>
            );
          })}

          {openers.length > 0 && (
            <>
              <div className="slabel">Don't know what to say? Try one of these</div>
              {openers.map((o, i) => (
                <div key={i} className="opener">
                  <p>{o}</p>
                  <button className="btn btn-g btn-sm" onClick={() => copy(o, "Opener copied — go get 'em")}>Copy</button>
                </div>
              ))}
              {aiAvailable() && profile && (
                <button className="dice" style={{ marginTop: 4 }} onClick={() => aiOpeners(profile).then((x) => x.length && setAi(x)).catch((e) => toast(e.message, "bad"))}>✨ Write fresh ones with AI</button>
              )}
            </>
          )}
          <div className="notice" style={{ marginTop: 18 }}>Be cool, be kind, and don't share their links without asking. That's the deal.</div>
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 20, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        {profile && <Link to={`/p/${app.profile_id}`} className="btn btn-g btn-sm" style={{ textDecoration: "none" }}>View their card</Link>}
        <Link to="/me" className="btn btn-g btn-sm" style={{ textDecoration: "none" }}>My applications</Link>
      </div>
    </div>
  );
}

// ─── /me ─────────────────────────────────────────────────────────────────────

export function MyApplications() {
  const { user, authReady, toast, demo } = useApp();
  const [rows, setRows] = useState(null);
  const tick = demo ? demo.applications.map((a) => a.status).join() : "";
  useEffect(() => {
    if (!authReady) return;
    api.getMyApplications().then(setRows).catch(() => setRows([]));
  }, [authReady, user?.id, tick]);

  if (!authReady || rows === null) return <Loading />;

  return (
    <div className="page fade-in">
      <div className="page-t">My applications</div>
      <p className="page-s">Every card you've applied to, and where each one stands.</p>
      {!api.DEMO_MODE && !user ? (
        <>
          <div className="notice">Sign in with the account you applied with.</div>
          <AuthButtons onPick={(p) => api.signIn(p).catch((e) => toast(e.message, "bad"))} />
        </>
      ) : rows.length === 0 ? (
        <Empty icon="📮" title="Nothing yet">
          Scan someone's card and apply.{demo && <> Or try a sample: <Link to="/p/DEMO">Alex</Link>, <Link to="/p/DEMORAE">Rae</Link> or <Link to="/p/DEMOMIKO">Miko</Link>.</>}
        </Empty>
      ) : (
        rows.map(({ app, profile }) => (
          <Link key={app.id} to={`/a/${app.id}`} className="acard" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="aav" aria-hidden="true">{typeOf(profile?.type).icon}</div>
            <div className="ainfo">
              <div className="aname">{profile?.name || "A card"}</div>
              <div className="ameta">{typeOf(profile?.type).label} · applied {timeAgo(app.created_at)}</div>
            </div>
            <span className={`spill ${app.status}`}>{app.status}</span>
          </Link>
        ))
      )}
    </div>
  );
}


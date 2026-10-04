import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import * as api from "../lib/api.js";
import { simulateScan } from "../lib/demo.js";
import { typeOf, socialOf } from "../lib/constants.js";
import { cardUrl, prettyUrl, timeAgo } from "../lib/util.js";
import { useApp } from "../state.jsx";
import { QR, Empty, Loading, AuthButtons, useCopy } from "../components/ui.jsx";
import ShareKit from "../components/ShareKit.jsx";

export default function Dashboard() {
  const { user, authReady, profiles, profilesLoaded, refreshProfiles, toast, confetti, premium, setPremium, demo } = useApp();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const copy = useCopy();
  const active = profiles.find((p) => p.type === params.get("card")) || profiles[0];
  const [tab, setTab] = useState("inbox");
  const [apps, setApps] = useState(null);
  const [stats, setStats] = useState(null);
  const [fresh, setFresh] = useState(null);
  const [share, setShare] = useState(null);
  const [scanning, setScanning] = useState(false);

  // Applications + stats for the active card. Demo writes re-run this via the demo counter.
  const demoTick = demo ? demo.applications.length + demo.events.length + demo.applications.filter((a) => a.status !== "pending").length : 0;
  useEffect(() => {
    if (!active) return;
    let alive = true;
    Promise.all([api.getApplications(active.id), api.getEventStats(active.id).catch(() => null)]).then(([a, s]) => {
      if (alive) { setApps(a); setStats(s); }
    });
    return () => { alive = false; };
  }, [active?.id, demoTick]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live mode: refresh the inbox every 30s while the tab is visible.
  useEffect(() => {
    if (api.DEMO_MODE || !active) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") api.getApplications(active.id).then(setApps).catch(() => {});
    }, 30000);
    return () => clearInterval(t);
  }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!authReady || (user && !profilesLoaded)) return <Loading />;

  if (!user) {
    return (
      <div className="page fade-in">
        <div className="page-t">Sign in to see your cards</div>
        <p className="page-s">Your inbox, your QR codes and who you've accepted.</p>
        <AuthButtons onPick={(p) => api.signIn(p).catch((e) => toast(e.message, "bad"))} />
      </div>
    );
  }

  if (!profiles.length) {
    return (
      <div className="page fade-in">
        <div className="page-t">No cards yet</div>
        <p className="page-s">Make your first one — it takes about two minutes.</p>
        <Link className="btn btn-p" to="/new" style={{ textDecoration: "none" }}>Create your card</Link>
      </div>
    );
  }

  const pt = typeOf(active.type);
  const list = apps || [];
  const pending = list.filter((a) => a.status === "pending");
  const accepted = list.filter((a) => a.status === "accepted");
  const declined = list.filter((a) => a.status === "declined");
  const url = cardUrl(active.id);
  const paused = active.status === "paused";

  async function decide(app, status) {
    setApps((xs) => xs.map((a) => (a.id === app.id ? { ...a, status } : a)));
    try {
      await api.setApplicationStatus(app.id, status);
      if (status === "accepted") { confetti(); toast(`🎉 ${app.name.split(" ")[0]} can see your socials now.`, "good"); }
      else toast(`Declined. ${app.name.split(" ")[0]} just sees a polite "not this time".`);
    } catch (e) {
      toast(`Couldn't update: ${e.message}`, "bad");
      setApps((xs) => xs.map((a) => (a.id === app.id ? app : a)));
    }
  }

  async function togglePause() {
    try {
      await api.saveProfile({ ...active, status: paused ? "active" : "paused" });
      await refreshProfiles();
      toast(paused ? "▶ Card resumed — taking applications again." : "⏸ Card paused. The QR still works, but nobody can apply.");
    } catch (e) { toast(e.message, "bad"); }
  }

  async function scan() {
    setScanning(true);
    const app = await simulateScan(active.id);
    setScanning(false);
    if (!app) { toast(paused ? "👀 Someone scanned it — but the card is paused." : "👀 Someone scanned your card, read it… and walked away. Happens."); return; }
    setFresh(app.id);
    setTab("inbox");
    toast(`📬 ${app.name} scanned your card and applied!`, "good");
  }

  return (
    <div className="dash fade-in">
      <div className="dash-top">
        <div>
          <div className="dash-title">Your Cards</div>
          <div className="dash-sub">{pending.length ? `${pending.length} waiting on you` : "Inbox zero. Go hand out some cards."}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {demo && <button className="btn btn-s btn-sm sim-btn" disabled={scanning} onClick={scan}>Simulate a scan</button>}
          <button className="btn btn-o btn-sm" onClick={() => navigate(`/edit/${active.type}`)}>✎ Edit</button>
          <button className="btn btn-o btn-sm" onClick={togglePause}>{paused ? "▶ Resume" : "⏸ Pause"}</button>
          <Link className="btn btn-o btn-sm" to={`/p/${active.id}`} style={{ textDecoration: "none" }}>Preview</Link>
        </div>
      </div>

      <div className="ptabs" role="tablist" aria-label="Your cards">
        {profiles.map((p) => {
          const t = typeOf(p.type);
          return (
            <button key={p.id} role="tab" aria-selected={active.id === p.id} className={`ptab ${active.id === p.id ? "on" : ""}`} style={{ "--tc": t.color }}
              onClick={() => { setParams({ card: p.type }); setTab("inbox"); setApps(null); }}>
              <span className="dot" />{t.icon} {t.label}{p.status === "paused" ? " ⏸" : ""}
            </button>
          );
        })}
        {profiles.length < 3 && (
          <button className="add-ptab" onClick={() => navigate("/new")}>
            + Add card {!premium && <span style={{ color: "var(--gold)", marginLeft: 4 }}>✦ Premium</span>}
          </button>
        )}
      </div>

      {paused && <div className="notice" style={{ borderLeftColor: "var(--muted)" }}>⏸ This card is paused. The link still opens, but it says you're not taking applications. Resume any time.</div>}

      <div className="stats">
        <Stat n={stats ? stats.views : "—"} label="Views" premium={!premium} />
        <Stat n={list.length} label="Applications" />
        <Stat n={pending.length} label="Pending" />
        <Stat n={accepted.length} label="Connected" />
      </div>

      <div className="qrbox">
        <QR value={url} size={128} margin={2} />
        <div className="qrinfo" style={{ flex: 1, minWidth: 0 }}>
          <h3>{pt.icon} {pt.label} Card</h3>
          <p>Anyone who scans this sees your {pt.label.toLowerCase()} card and can apply. Your other cards stay invisible.</p>
          <div className="qr-url">{prettyUrl(url)}</div>
          <div className="qr-acts">
            <button className="btn btn-o btn-sm" onClick={() => copy(url, "Link copied")}>Copy link</button>
            <button className="btn btn-p btn-sm" onClick={() => setShare("print")}>🖨 Print</button>
            <button className="btn btn-o btn-sm" onClick={() => setShare("phone")}>📱 Lock screen</button>
            <button className="btn btn-o btn-sm" onClick={() => setShare("send")}>📨 Send</button>
          </div>
        </div>
      </div>

      <div className="itabs" role="tablist">
        <button role="tab" aria-selected={tab === "inbox"} className={`itab ${tab === "inbox" ? "on" : ""}`} onClick={() => setTab("inbox")}>Inbox ({pending.length})</button>
        <button role="tab" aria-selected={tab === "connected"} className={`itab ${tab === "connected" ? "on" : ""}`} onClick={() => setTab("connected")}>Connected ({accepted.length})</button>
        <button role="tab" aria-selected={tab === "analytics"} className={`itab ${tab === "analytics" ? "on" : ""}`} onClick={() => setTab("analytics")}>Analytics {!premium && "✦"}</button>
      </div>

      {apps === null && <div style={{ color: "var(--muted)", fontSize: 12, padding: 20 }}>Loading applications…</div>}

      {apps && tab === "inbox" && (
        <div>
          {pending.length === 0 && declined.length === 0 && (
            <Empty icon="📭" title="No applications yet">
              {demo ? <>Hit <strong style={{ color: "var(--green)" }}>Simulate a scan</strong> up top, or open your card as a stranger and apply to yourself.</> : "Share your QR code or link to start."}
            </Empty>
          )}
          {pending.map((a) => <AppCard key={a.id} app={a} fresh={a.id === fresh} onDecide={decide} />)}
          {declined.length > 0 && (
            <>
              <div className="side-label" style={{ margin: "22px 0 9px" }}>Declined</div>
              {declined.map((a) => <AppCard key={a.id} app={a} onDecide={decide} />)}
            </>
          )}
        </div>
      )}

      {apps && tab === "connected" && (
        accepted.length === 0
          ? <Empty icon="🤝" title="No connections yet">Accept an application and they'll show up here.</Empty>
          : (
            <>
              <div className="notice">These people can see your {pt.label.toLowerCase()} socials. Want to stop? Pause the card and update your links.</div>
              {accepted.map((a) => <AppCard key={a.id} app={a} onDecide={decide} />)}
            </>
          )
      )}

      {tab === "analytics" && (
        premium
          ? <Analytics stats={stats} />
          : (
            <Empty icon="📊" title="Analytics is Premium">
              Views per day, scan-to-apply conversion, and how many people looked without applying.
              <div style={{ marginTop: 18 }}>
                {demo
                  ? <button className="btn btn-p" onClick={() => setPremium(true)}>✦ Try Premium (demo)</button>
                  : <span style={{ color: "var(--gold)" }}>Coming soon. Self-hosting? Set VITE_UNLOCK_PREMIUM=true.</span>}
              </div>
            </Empty>
          )
      )}

      {share && <ShareKit profile={active} initialTab={share} onClose={() => setShare(null)} />}
    </div>
  );
}

function Stat({ n, label, premium }) {
  return (
    <div className="stat">
      <div className="stat-n">{premium ? "✦" : n}</div>
      <div className="stat-l">{label}{premium && <span style={{ color: "var(--gold)" }}> · premium</span>}</div>
    </div>
  );
}

function AppCard({ app, fresh, onDecide }) {
  const icon = socialOf(app.platform)?.icon || { google: "🌐" }[app.platform] || "👤";
  return (
    <div className={`acard ${fresh ? "new" : ""}`}>
      <div className="aav" aria-hidden="true">{app.emoji || "✨"}</div>
      <div className="ainfo">
        <div className="aname">{app.name}</div>
        <div className="ameta">{icon} {app.handle || app.platform} · {timeAgo(app.created_at || app.appliedAt)}</div>
        {app.note && <div className="anote">“{app.note}”</div>}
      </div>
      <div className="aacts">
        {app.status === "pending" ? (
          <>
            <button className="btn btn-s btn-sm" onClick={() => onDecide(app, "accepted")}>Accept</button>
            <button className="btn btn-d btn-sm" onClick={() => onDecide(app, "declined")}>Decline</button>
          </>
        ) : app.status === "declined" ? (
          <button className="btn btn-g btn-sm" title="Changed your mind?" onClick={() => onDecide(app, "accepted")}>
            <span className="spill declined">declined</span> ↺
          </button>
        ) : (
          <span className="spill accepted">Connected</span>
        )}
      </div>
    </div>
  );
}

function Analytics({ stats }) {
  if (!stats) return <Empty icon="📊" title="No data yet">Views show up as soon as someone opens your card.</Empty>;
  const max = Math.max(stats.views, 1);
  const rate = stats.views ? Math.round((stats.applies / stats.views) * 100) : 0;
  const top = Math.max(...stats.daily, 1);
  return (
    <div className="fade-in">
      <div className="side-label">Funnel · all time</div>
      <div className="funnel">
        {[["Viewed", stats.views], ["Applied", stats.applies], ["Accepted", stats.accepts]].map(([l, n]) => (
          <div key={l} className="funnel-row">
            <span>{l}</span>
            <div className="funnel-bar"><div style={{ width: `${(n / max) * 100}%` }} /></div>
            <span className="funnel-n">{n}</span>
          </div>
        ))}
      </div>
      <div className="notice"><strong style={{ color: "var(--gold-light)" }}>{rate}%</strong> of people who opened your card applied. {stats.views - stats.applies > 0 && `${stats.views - stats.applies} looked and walked away — that's the card doing the rejecting for you.`}{stats.reports > 0 && ` ${stats.reports} report(s).`}</div>
      <div className="side-label" style={{ marginTop: 24 }}>Views · last 14 days</div>
      <div className="bars" role="img" aria-label={`Views over the last 14 days: ${stats.daily.join(", ")}`}>
        {stats.daily.map((n, i) => <div key={i} style={{ height: `${(n / top) * 100}%` }} title={`${n} view${n === 1 ? "" : "s"}`} />)}
      </div>
      <div className="bars-l"><span>2 weeks ago</span><span>today</span></div>
    </div>
  );
}

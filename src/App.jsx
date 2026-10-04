import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link, NavLink, useLocation } from "react-router-dom";
import * as api from "./lib/api.js";
import { resetDemo } from "./lib/demo.js";
import { AppProvider, useApp } from "./state.jsx";
import Landing from "./pages/Landing.jsx";
import { ChooseType, CardEditor } from "./pages/CardEditor.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import { PublicCardPage, ApplicationStatusPage, MyApplications } from "./pages/Applicant.jsx";
import PrintSheet from "./pages/PrintSheet.jsx";

function DemoBar() {
  const { demo, premium, setPremium, toast } = useApp();
  if (!demo) return null;
  return (
    <div className="demo-bar no-print">
      <span>✦ Demo mode — everything is saved in this browser only</span>
      <span className="sep-dot">·</span>
      <label className="switch"><input type="checkbox" checked={premium} onChange={(e) => setPremium(e.target.checked)} />Premium</label>
      <span className="sep-dot">·</span>
      <button onClick={() => { if (confirm("Wipe all demo cards, applications and stats?")) { resetDemo(); toast("Demo reset. Fresh start."); } }}>Reset demo</button>
    </div>
  );
}

/** Pending applications across all of the owner's cards, for the nav badge. */
function usePendingCount() {
  const { profiles, demo } = useApp();
  const [n, setN] = useState(0);
  const tick = demo ? demo.applications.map((a) => a.status).join() : "";
  useEffect(() => {
    let alive = true;
    Promise.all(profiles.map((p) => api.getApplications(p.id).catch(() => [])))
      .then((all) => alive && setN(all.flat().filter((a) => a.status === "pending").length));
    return () => { alive = false; };
  }, [profiles, tick]);
  return n;
}

function Nav() {
  const { user, profiles, toast } = useApp();
  const pending = usePendingCount();
  return (
    <nav className="nav no-print">
      <Link to="/" className="logo" style={{ textDecoration: "none" }}>Date<em>Card</em></Link>
      <div className="nav-r">
        <NavLink to="/me" className="nav-link nav-hide-sm">Applied</NavLink>
        {profiles.length > 0 ? (
          <NavLink to="/dashboard" className="nav-link">Dashboard{pending > 0 && <span className="badge-count">{pending}</span>}</NavLink>
        ) : (
          <NavLink to="/p/DEMO" className="nav-link nav-hide-sm">Demo</NavLink>
        )}
        {profiles.length === 0 && <Link to="/new" className="btn btn-p btn-sm" style={{ textDecoration: "none" }}>Get started</Link>}
        {user && !api.DEMO_MODE && (
          <button className="btn btn-g btn-sm" onClick={() => api.signOut().then(() => toast("Signed out."))}>Sign out</button>
        )}
      </div>
    </nav>
  );
}

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function NotFound() {
  return (
    <div className="page" style={{ textAlign: "center", paddingTop: 80 }}>
      <div style={{ fontSize: 34, marginBottom: 14 }}>🧭</div>
      <div className="page-t" style={{ fontSize: 26 }}>Nothing here</div>
      <p className="page-s">That page doesn't exist. If you scanned a card, the link might be cut off.</p>
      <Link to="/" className="btn btn-o" style={{ display: "inline-block", textDecoration: "none" }}>← Home</Link>
    </div>
  );
}

export default function Root() {
  return (
    <BrowserRouter>
      <AppProvider>
        <ScrollTop />
        <DemoBar />
        <Nav />
        <main>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/new" element={<ChooseType />} />
            <Route path="/new/:type" element={<CardEditor mode="new" />} />
            <Route path="/edit/:type" element={<CardEditor mode="edit" />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/p/:cardId" element={<PublicCardPage />} />
            <Route path="/a/:appId" element={<ApplicationStatusPage />} />
            <Route path="/me" element={<MyApplications />} />
            <Route path="/print/:cardId" element={<PrintSheet />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </AppProvider>
    </BrowserRouter>
  );
}

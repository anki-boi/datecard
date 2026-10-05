// App-wide state: who's signed in, their cards, toasts and confetti.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import * as api from "./lib/api.js";
import { getState as demoState, setPremium as demoSetPremium } from "./lib/demo.js";

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [burst, setBurst] = useState(0);
  const [, force] = useState(0);
  const toastId = useRef(0);

  useEffect(() => {
    api.getUser().then((u) => { setUser(u); setAuthReady(true); });
    return api.onAuthChange((u) => setUser(u));
  }, []);

  const [profilesLoaded, setProfilesLoaded] = useState(false);
  const seq = useRef(0);
  // Reads the *current* user on every call (sign-in and publish can happen in the same tick,
  // so a closure's `user` may be stale) and drops responses that arrive out of order.
  const refreshProfiles = useCallback(async () => {
    const mine = ++seq.current;
    const u = await api.getUser();
    const ps = u ? await api.getMyProfiles(u.id) : [];
    if (mine !== seq.current) return ps;
    setProfiles(ps);
    setProfilesLoaded(u ? true : authReady);
    return ps;
  }, [user, authReady]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { refreshProfiles().catch((e) => console.warn(e)); }, [refreshProfiles]);

  // Demo writes (simulated scans, sample owners accepting) re-render everything.
  useEffect(() => api.subscribe(() => { force((n) => n + 1); refreshProfiles(); }), [refreshProfiles]);

  const toast = useCallback((text, kind = "") => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, text, kind }]); // newest three
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  const confetti = useCallback(() => setBurst((b) => b + 1), []);

  const value = {
    user, authReady, profiles, profilesLoaded, refreshProfiles, toast, confetti,
    premium: api.isPremium(),
    setPremium: (on) => { demoSetPremium(on); force((n) => n + 1); },
    demo: api.DEMO_MODE ? demoState() : null,
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className={`toast ${t.kind}`}>{t.text}</div>)}
      </div>
      {burst > 0 && <Confetti key={burst} />}
    </Ctx.Provider>
  );
}

const CONFETTI_COLORS = ["#c9a84c", "#e8d5a3", "#52b788", "#e0533f", "#f5f0e8", "#7a5c2a"];

function Confetti() {
  const [pieces] = useState(() => Array.from({ length: 90 }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    dur: 2.2 + Math.random() * 1.8,
    dx: `${(Math.random() - 0.5) * 240}px`,
    rot: `${(Math.random() - 0.5) * 1440}deg`,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    round: Math.random() < 0.3,
  })));
  const [done, setDone] = useState(false);
  useEffect(() => { const t = setTimeout(() => setDone(true), 4600); return () => clearTimeout(t); }, []);
  if (done) return null;
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <i key={i} style={{
          left: `${p.left}%`, background: p.color, borderRadius: p.round ? "50%" : 0,
          animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s`, "--dx": p.dx, "--rot": p.rot,
        }} />
      ))}
    </div>
  );
}

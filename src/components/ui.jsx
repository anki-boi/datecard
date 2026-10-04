import { useEffect, useRef, useState } from "react";
import { qrDataUrl } from "../lib/qr.js";
import { AUTH_PROVIDERS } from "../lib/constants.js";
import { useApp } from "../state.jsx";

/** QR code rendered locally (no third-party request). */
export function QR({ value, size = 140, fg = "#2a1f22", bg = "#e8dcc8", margin = 1, alt = "QR code" }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let alive = true;
    qrDataUrl(value, { size: size * 2, fg, bg, margin }).then((u) => alive && setSrc(u));
    return () => { alive = false; };
  }, [value, size, fg, bg, margin]);
  return src
    ? <img src={src} alt={alt} width={size} height={size} style={{ display: "block", imageRendering: "pixelated" }} />
    : <div style={{ width: size, height: size, background: bg }} aria-hidden="true" />;
}

/** Overlay modal: click-outside and Escape close it; focus moves in and back out. */
export function Modal({ onClose, maxWidth = 520, label, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    ref.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal fade-in" style={{ maxWidth }} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} ref={ref}>
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({ title, sub, onClose }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 12 }}>
      <div>
        <div className="modal-t">{title}</div>
        {sub && <div className="modal-s" style={{ marginBottom: 0 }}>{sub}</div>}
      </div>
      <button className="btn btn-g" onClick={onClose} style={{ fontSize: 20, padding: "2px 8px" }} aria-label="Close">×</button>
    </div>
  );
}

export function useCopy() {
  const { toast } = useApp();
  return async (text, what = "Copied") => {
    try {
      await navigator.clipboard.writeText(text);
      toast(`✓ ${what}`, "good");
    } catch {
      toast("Couldn't reach the clipboard — long-press to copy instead.", "bad");
    }
  };
}

export function TagInput({ tags, onChange, placeholder, label }) {
  const [val, setVal] = useState("");
  const ref = useRef();
  function add(v) {
    const t = v.trim().replace(/,/g, "");
    if (t && !tags.some((x) => x.toLowerCase() === t.toLowerCase())) onChange([...tags, t]);
    setVal("");
  }
  return (
    <div className="taginput" onClick={() => ref.current?.focus()}>
      {tags.map((t) => (
        <span key={t} className="tag">{t}<button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(tags.filter((x) => x !== t))}>×</button></span>
      ))}
      <input ref={ref} value={val} aria-label={label} onChange={(e) => setVal(e.target.value)}
        onBlur={() => val.trim() && add(val)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(val); }
          if (e.key === "Backspace" && !val && tags.length) onChange(tags.slice(0, -1));
        }}
        placeholder={tags.length === 0 ? placeholder : ""}
      />
    </div>
  );
}

/** One-tap sign-in buttons. In demo mode they sign in instantly. */
export function AuthButtons({ onPick, busy }) {
  return (
    <div className="oauth-grid">
      {AUTH_PROVIDERS.map((p) => (
        <button key={p.id} className="oauth-btn" disabled={busy} onClick={() => onPick(p.id)}>
          <span style={{ fontSize: 18 }}>{p.icon}</span><span>Continue with {p.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Empty({ icon, title, children }) {
  return (
    <div className="empty">
      <div className="empty-i">{icon}</div>
      <div className="empty-t">{title}</div>
      <div className="empty-d">{children}</div>
    </div>
  );
}

export function Loading({ children = "Loading…" }) {
  return <div className="page" style={{ textAlign: "center", paddingTop: 80, color: "var(--muted)", fontSize: 13 }}>{children}</div>;
}

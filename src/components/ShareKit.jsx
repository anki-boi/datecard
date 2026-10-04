// Everything you can do with a card once it exists: print it, put it on your
// lock screen, post it as a story, or send the link. (SPEC P4, early.)

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CARD_TEMPLATES, templateOf, qrColors } from "../lib/constants.js";
import { cardUrl, prettyUrl } from "../lib/util.js";
import { qrDataUrl, qrSvg, downloadDataUrl } from "../lib/qr.js";
import { renderPoster, POSTER_SIZES } from "../lib/poster.js";
import { useApp } from "../state.jsx";
import { Modal, ModalHeader, useCopy } from "./ui.jsx";
import { BizCard, TplMiniPreview } from "./cards.jsx";

const TABS = [["print", "🖨 Print"], ["phone", "📱 Phone"], ["send", "📨 Send"]];

export default function ShareKit({ profile, onClose, initialTab = "print" }) {
  const { premium, setPremium, demo } = useApp();
  const [tab, setTab] = useState(initialTab);
  const [tplId, setTplId] = useState("classic");
  const tpl = templateOf(tplId);
  const url = cardUrl(profile.id);
  const slug = (profile.name || "card").toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <Modal onClose={onClose} maxWidth={680} label="Share kit">
      <ModalHeader title="Share kit" sub="One card, every format. Pick a design, then take it anywhere." onClose={onClose} />

      <div className="side-label">Design</div>
      <div className="tpl-grid">
        {CARD_TEMPLATES.map((t) => {
          const locked = t.premium && !premium;
          return (
            <button key={t.id} className={`tpl-btn ${tplId === t.id ? "chosen" : ""} ${locked ? "locked" : ""}`}
              onClick={() => !locked && setTplId(t.id)} aria-label={`${t.label} design${locked ? " (premium)" : ""}`}
              title={locked ? "Premium — upgrade to unlock" : t.label}>
              <TplMiniPreview tpl={t} name={profile.name} />
              {locked && <div className="tpl-lock"><div className="tpl-lock-i">✦</div><div className="tpl-lock-l">Premium</div></div>}
            </button>
          );
        })}
      </div>
      {!premium && (
        <div className="prem-bar">
          <p><strong>4 more designs with Premium.</strong> Noir, Minimal, Bold and Rose — on the card, the lock screen and the story.</p>
          {demo
            ? <button className="btn btn-p btn-sm" onClick={() => setPremium(true)}>✦ Try Premium (demo)</button>
            : <button className="btn btn-p btn-sm" disabled title="Payments aren't live yet">Coming soon</button>}
        </div>
      )}

      <div className="itabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={`itab ${tab === id ? "on" : ""}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === "print" && (
        <>
          <div className="preview-area"><div className="biz-fit"><BizCard profile={profile} tpl={tpl} /></div>
            <p className="print-note">Standard 3.5 × 2 in. The print sheet fits ten on US Letter with cut guides.</p>
          </div>
          <div className="print-acts">
            <Link className="btn btn-p" to={`/print/${profile.id}?tpl=${tpl.id}`} target="_blank" style={{ textDecoration: "none" }}>Open print sheet (10-up) ↗</Link>
          </div>
        </>
      )}

      {tab === "phone" && <PosterTab profile={profile} url={url} tpl={tpl} slug={slug} />}

      {tab === "send" && <SendTab profile={profile} url={url} tpl={tpl} slug={slug} />}
    </Modal>
  );
}

function PosterTab({ profile, url, tpl, slug }) {
  const [kind, setKind] = useState("lockscreen");
  const [img, setImg] = useState(null);
  const { toast } = useApp();
  // Profile objects are re-created on every refresh; redraw only when the content changes.
  const key = JSON.stringify([profile, url, tpl.id, kind]);
  useEffect(() => {
    let alive = true;
    setImg(null);
    renderPoster(profile, url, tpl, kind).then((d) => alive && setImg(d)).catch((e) => toast(`Couldn't draw the poster: ${e.message}`, "bad"));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, toast]);

  return (
    <>
      <div className="poster-tabs">
        {Object.entries(POSTER_SIZES).map(([k, v]) => (
          <button key={k} className={`btn btn-sm ${kind === k ? "btn-p" : "btn-o"}`} onClick={() => setKind(k)}>{v.label}</button>
        ))}
      </div>
      <p className="modal-s">
        {kind === "lockscreen"
          ? "Set it as your lock screen. Meet someone → hand them your phone → they scan it. Your phone is the card."
          : "Post it to your story or close friends. The QR still works from a screenshot."}
      </p>
      {img ? <img className="poster-img" src={img} alt={`${POSTER_SIZES[kind].label} poster preview`} /> : <div className="poster-wait">Drawing…</div>}
      <div className="print-acts" style={{ justifyContent: "center" }}>
        <button className="btn btn-p" disabled={!img} onClick={() => downloadDataUrl(img, `datecard-${slug}-${POSTER_SIZES[kind].file}.png`)}>⬇ Download PNG</button>
      </div>
    </>
  );
}

function SendTab({ profile, url, tpl, slug }) {
  const copy = useCopy();
  const text = `${profile.name?.split(" ")[0] || "My"} DateCard — scan or tap to apply: ${url}`;
  const canShare = typeof navigator !== "undefined" && !!navigator.share;
  const { fg, bg } = qrColors(tpl);

  async function pngQR() { downloadDataUrl(await qrDataUrl(url, { size: 1200, fg, bg, margin: 2 }), `datecard-${slug}-qr.png`); }
  async function svgQR() {
    const svg = await qrSvg(url, { fg, bg, margin: 2 });
    downloadDataUrl(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, `datecard-${slug}-qr.svg`);
  }

  return (
    <>
      <div className="qr-url">{prettyUrl(url)}</div>
      <div className="qr-acts" style={{ marginBottom: 18 }}>
        {canShare && <button className="btn btn-p btn-sm" onClick={() => navigator.share({ title: "DateCard", text, url }).catch(() => {})}>Share…</button>}
        <button className="btn btn-o btn-sm" onClick={() => copy(url, "Link copied")}>Copy link</button>
        <a className="btn btn-o btn-sm" style={{ textDecoration: "none" }} href={`fb-messenger://share/?link=${encodeURIComponent(url)}`}>Messenger</a>
        <a className="btn btn-o btn-sm" style={{ textDecoration: "none" }} href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">WhatsApp</a>
      </div>
      <div className="side-label">QR code files</div>
      <div className="qr-acts">
        <button className="btn btn-o btn-sm" onClick={pngQR}>⬇ PNG (1200px)</button>
        <button className="btn btn-o btn-sm" onClick={svgQR}>⬇ SVG (print shops)</button>
      </div>
      <p className="print-note" style={{ textAlign: "left" }}>The QR points at your live card, so it never goes stale: edit the card and every printed copy updates.</p>
    </>
  );
}

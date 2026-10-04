import { typeOf, qrColors } from "../lib/constants.js";
import { canShowLocation, cardUrl, prettyUrl } from "../lib/util.js";
import { QR } from "./ui.jsx";

const bgStyle = (tpl) => (tpl.bg.startsWith("linear") ? { backgroundImage: tpl.bg } : { background: tpl.bg });

/** The printable 3.5 × 2 in business card. */
export function BizCard({ profile, tpl }) {
  const url = cardUrl(profile?.id || "DEMO");
  const pt = typeOf(profile?.type);
  const ints = (profile?.interests?.length ? profile.interests : ["Travel", "Film", "Coffee"]).slice(0, 4).join(" · ");
  const meta = [profile?.age, canShowLocation(profile) ? profile?.location : null].filter(Boolean).join(" · ");
  return (
    <div className="biz-card" style={{ ...bgStyle(tpl), color: tpl.text, border: `1px solid ${tpl.border}` }}>
      <div>
        <div className="bc-name">{profile?.name || "Your Name"}</div>
        <div className="bc-tl">{meta}{meta ? "  ·  " : ""}{pt.icon} {pt.label}</div>
        <div className="bc-ints">{ints}</div>
      </div>
      <div className="bc-bot">
        <div>
          <div className="bc-url">{prettyUrl(url)}</div>
          <div className="bc-cta" style={{ color: tpl.accent }}>Scan to apply ↗</div>
        </div>
        <QR value={url} size={50} {...qrColors(tpl)} margin={1} />
      </div>
    </div>
  );
}

export function TplMiniPreview({ tpl, name }) {
  return (
    <div className="tpl-inner" style={{ ...bgStyle(tpl), color: tpl.text }}>
      <div>
        <div className="tpl-name">{name || "Your Name"}</div>
        <div className="tpl-url">scan to apply</div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div className="tpl-url">Apply ↗</div>
        <div className="tpl-qr" style={{ background: tpl.accent }} />
      </div>
    </div>
  );
}

export function Avatar({ profile, size }) {
  const pt = typeOf(profile?.type);
  const style = { "--tc": pt.color, ...(size ? { width: size, height: size, fontSize: size * 0.42 } : {}) };
  if (profile?.photo_url) return <div className="avatar" role="img" aria-label={`${profile.name}'s photo`} style={{ ...style, backgroundImage: `url("${profile.photo_url}")` }} />;
  return <div className="avatar" aria-hidden="true" style={style}>{profile?.avatar || pt.icon}</div>;
}

/** Everything a stranger reads on a card. Used by the public page and the editor's live preview. */
export function ProfileBody({ p, compact = false }) {
  const pt = typeOf(p.type);
  const meta = [p.age, canShowLocation(p) ? p.location : null].filter(Boolean).join(" · ");
  return (
    <>
      <div className="type-banner" style={{ borderColor: `${pt.color}44`, color: pt.color, background: `${pt.color}0a`, marginBottom: compact ? 18 : 30 }}>
        {pt.icon} <span style={{ letterSpacing: "0.06em" }}>{pt.label} Card</span>
        {!compact && <span style={{ color: "var(--muted)", fontSize: 11, marginLeft: 4 }}>· {pt.tagline}</span>}
      </div>

      <div className="profile-hdr" style={compact ? { paddingBottom: 20, marginBottom: 20 } : undefined}>
        <Avatar profile={p} />
        <div className="profile-name">{p.name || "Your Name"}</div>
        {meta && <div className="profile-meta">{meta}</div>}
        {p.bio ? <p className="profile-bio">{p.bio}</p> : compact && <p className="profile-bio" style={{ color: "var(--muted)" }}>Your bio shows up here.</p>}
      </div>

      {p.interests?.length > 0 && <Tags label="Interests" items={p.interests} />}
      {p.hobbies?.length > 0 && <Tags label="Hobbies" items={p.hobbies} />}
      {p.lookingFor && (
        <div style={{ marginBottom: 26 }}>
          <div className="slabel" style={{ marginTop: 0 }}>Looking for</div>
          <p style={{ fontSize: 14, fontStyle: "italic", lineHeight: 1.7 }}>“{p.lookingFor}”</p>
        </div>
      )}
      {p.prompts?.some((x) => x.answer?.trim()) && (
        <div style={{ marginBottom: 34 }}>
          <div className="slabel" style={{ marginTop: 0 }}>Prompts</div>
          {p.prompts.filter((x) => x.answer?.trim()).map((pr, i) => (
            <div key={i} className="pcard">
              <div className="pcard-q">{pr.prompt}</div>
              <div className="pcard-a">{pr.answer}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function Tags({ label, items }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <div className="slabel" style={{ marginTop: 0 }}>{label}</div>
      <div className="tags-row">{items.map((t) => <span key={t} className="ptag">{t}</span>)}</div>
    </div>
  );
}

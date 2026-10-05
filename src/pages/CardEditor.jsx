import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import * as api from "../lib/api.js";
import { PROFILE_TYPES, PROMPTS_BY_TYPE, SOCIAL_PLATFORMS, EMPTY_SOCIALS, typeOf, templateOf } from "../lib/constants.js";
import { generateId, cardStrength, pick } from "../lib/util.js";
import { compileCard, aiAvailable, INTERVIEW } from "../lib/ai.js";
import { saveDraft, loadDraft, clearDraft } from "../lib/drafts.js";
import { shrinkPhoto } from "../lib/poster.js";
import { useApp } from "../state.jsx";
import { AuthButtons, TagInput, Loading, Modal, ModalHeader } from "../components/ui.jsx";
import { BizCard, ProfileBody } from "../components/cards.jsx";

// ─── choose a card type (/new) ───────────────────────────────────────────────

export function ChooseType() {
  const { profiles, premium, setPremium, demo } = useApp();
  const navigate = useNavigate();
  const [sel, setSel] = useState(null);
  const owned = profiles.map((p) => p.type);
  const atLimit = !premium && owned.length >= 1; // free tier = 1 card

  return (
    <div className="page fade-in">
      <div className="page-t">What kind of card?</div>
      <p className="page-s">Each card has its own link, QR code and inbox. Keep your intentions separate — nobody can tell two cards belong to the same person.</p>

      {atLimit && (
        <div className="notice" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span>Free tier = 1 card. <strong style={{ color: "var(--gold)" }}>Premium</strong> runs all three at once.</span>
          {demo && <button className="btn btn-p btn-sm" onClick={() => setPremium(true)}>✦ Try Premium (demo)</button>}
        </div>
      )}

      <div className="type-grid">
        {PROFILE_TYPES.map((t) => {
          const mine = owned.includes(t.id);
          const locked = atLimit && !mine;
          return (
            <button key={t.id} type="button" disabled={locked}
              className={`type-card ${sel === t.id ? "sel" : ""} ${locked ? "locked" : ""}`}
              style={{ "--tc": t.color }} onClick={() => setSel(t.id)} aria-pressed={sel === t.id}>
              {locked && <div className="type-badge">✦ Premium</div>}
              {mine && <div className="type-badge" style={{ borderColor: t.color, color: t.color }}>Yours</div>}
              <div className="type-icon">{t.icon}</div>
              <div className="type-label" style={{ color: sel === t.id ? t.color : "var(--paper)" }}>{t.label}</div>
              <div className="type-tagline">{t.tagline}</div>
              <div className="type-desc">{t.desc}</div>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <button className="btn btn-p" disabled={!sel} onClick={() => navigate(owned.includes(sel) ? `/edit/${sel}` : `/new/${sel}`)}>
          {owned.includes(sel) ? "Edit this card" : "Continue"}
        </button>
        <Link className="btn btn-g" to={owned.length ? "/dashboard" : "/"} style={{ textDecoration: "none" }}>Back</Link>
      </div>
    </div>
  );
}

// ─── build / edit a card (/new/:type, /edit/:type) ───────────────────────────

const blankForm = (type) => ({
  id: generateId(), type, name: "", age: "", location: "", bio: "", photo_url: null,
  interests: [], hobbies: [], lookingFor: "", prompts: [],
  socials: { ...EMPTY_SOCIALS }, settings: { showLocation: type !== "casual" }, status: "active",
});

export function CardEditor({ mode }) {
  const { type } = useParams();
  const { user, authReady, profiles, profilesLoaded, refreshProfiles, toast, confetti } = useApp();
  const navigate = useNavigate();
  const existing = profiles.find((p) => p.type === type);
  const pt = typeOf(type);
  const draftKey = `editor.${type}`;
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [askSignIn, setAskSignIn] = useState(false);
  const [params, setParams] = useSearchParams();
  const autoPublished = useRef(false);

  // Initial form: the saved card (edit) → a draft that survived an OAuth redirect → blank.
  useEffect(() => {
    if (form) return;
    if (mode === "edit" && !existing) {
      if (profilesLoaded) navigate(`/new/${type}`, { replace: true }); // nothing to edit yet
      return;
    }
    const base = existing ? { ...blankForm(type), ...existing, age: existing.age ?? "", socials: { ...EMPTY_SOCIALS, ...existing.socials } } : blankForm(type);
    const draft = loadDraft(draftKey);
    // A draft only applies to the card it was typed into (a new card has no saved id yet).
    const useDraft = draft && (existing ? draft.id === existing.id : !profiles.some((p) => p.id === draft.id));
    setForm({ ...base, ...(useDraft ? draft : {}), type });
  }, [existing, mode, type, form, draftKey, profilesLoaded, profiles, navigate]);

  useEffect(() => { if (form) saveDraft(draftKey, form); }, [form, draftKey]);

  // Back from an OAuth redirect that started at "Publish": finish publishing.
  useEffect(() => {
    if (params.get("publish") === "1" && user && form && !autoPublished.current) {
      autoPublished.current = true;
      setParams({}, { replace: true });
      save();
    }
  }); // eslint-disable-line react-hooks/exhaustive-deps

  if (!PROFILE_TYPES.some((t) => t.id === type)) return <Loading>Unknown card type.</Loading>;
  if (!authReady) return <Loading />;

  if (!form) return <Loading>{mode === "edit" ? "Loading your card…" : "Loading…"}</Loading>;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const ageBad = form.age !== "" && Number(form.age) < 18;
  const strength = cardStrength(form);

  // Build first, sign in only when publishing.
  function publish() {
    if (ageBad) { toast("DateCard is for adults, 18 and over.", "bad"); return; }
    if (!user) { setAskSignIn(true); return; }
    save();
  }

  async function signInToPublish(provider) {
    setSigningIn(true);
    try {
      if (api.DEMO_MODE) {
        await api.signIn(provider);
        setAskSignIn(false);
        setSigningIn(false);
        save();
        return;
      }
      // Live: OAuth leaves the page. The draft is already in sessionStorage; ?publish=1 finishes the job on return.
      const back = new URL(window.location.href);
      back.searchParams.set("publish", "1");
      window.history.replaceState(null, "", back);
      await api.signIn(provider);
    } catch (e) {
      toast(e.message, "bad");
      setSigningIn(false);
    }
  }

  async function save() {
    if (ageBad) { toast("DateCard is for adults, 18 and over.", "bad"); return; }
    setSaving(true);
    try {
      await api.saveProfile({ ...form, name: form.name.trim() });
      clearDraft(draftKey);
      await refreshProfiles();
      toast(mode === "edit" ? "Changes saved. Every printed copy now shows the new version." : "Published. Your card is live.", "good");
      if (mode !== "edit") confetti();
      navigate(`/dashboard?card=${type}${mode === "edit" ? "" : "&new=1"}`);
    } catch (e) {
      toast(`Couldn't save: ${e.message}`, "bad");
      setSaving(false);
    }
  }

  return (
    <div className="editor-grid fade-in">
      <div>
        <TypeBadge pt={pt} />
        <div className="page-t">{mode === "edit" ? "Edit your card." : "Build your card."}</div>
        <p className="page-s">This is the <em style={{ color: pt.color }}>{pt.label.toLowerCase()}</em> version of you. Be honest about what you want — specific beats impressive.</p>

        <div className="slabel">The basics</div>
        <PhotoPicker form={form} onChange={(url) => set("photo_url", url)} />
        <div className="basics">
          <div className="field"><label htmlFor="f-name">Name</label><input id="f-name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="First name is plenty" maxLength={60} /></div>
          <div className="field"><label htmlFor="f-age">Age</label><input id="f-age" type="number" min={18} max={120} value={form.age} onChange={(e) => set("age", e.target.value)} placeholder="28" style={ageBad ? { borderColor: "var(--red)" } : undefined} /></div>
          <div className="field"><label htmlFor="f-loc">City</label><input id="f-loc" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder={type === "casual" ? "Never shown on casual cards" : "City"} maxLength={60} /></div>
        </div>
        {ageBad && <div style={{ color: "var(--red)", fontSize: 12, marginTop: -8, marginBottom: 12 }}>DateCard is for adults — 18 and over.</div>}
        {type === "casual" ? (
          <div className="notice">🔥 Casual cards never show your city, whatever you type above. That's enforced on the server.</div>
        ) : (
          <label className="switch" style={{ marginBottom: 16 }}>
            <input type="checkbox" checked={form.settings.showLocation} onChange={(e) => set("settings", { ...form.settings, showLocation: e.target.checked })} />
            Show my city on this card
          </label>
        )}
        <div className="field"><label htmlFor="f-bio">Bio <span style={{ float: "right", textTransform: "none", letterSpacing: 0 }}>{form.bio.length}/400</span></label>
          <textarea id="f-bio" value={form.bio} maxLength={400} onChange={(e) => set("bio", e.target.value)}
            placeholder={type === "casual" ? "Set the tone. Be honest." : type === "friendship" ? "Who you are, what you're into." : "A few lines. Make it real."} />
        </div>

        <div className="slabel">Your vibe</div>
        <div className="field"><label>Interests</label><TagInput label="Interests" tags={form.interests} onChange={(v) => set("interests", v)} placeholder="Travel, film, coffee… (Enter to add)" /></div>
        <div className="field"><label>Hobbies</label><TagInput label="Hobbies" tags={form.hobbies} onChange={(v) => set("hobbies", v)} placeholder="Guitar, hiking, chess…" /></div>
        <div className="field"><label htmlFor="f-lf">Looking for</label>
          <input id="f-lf" value={form.lookingFor} maxLength={120} onChange={(e) => set("lookingFor", e.target.value)}
            placeholder={type === "casual" ? "Good times, no drama" : type === "friendship" ? "Friends to explore the city with" : "Something real, long-term"} />
        </div>

        <div className="slabel">Prompts (up to 3)</div>
        <PromptPicker selected={form.prompts} onChange={(v) => set("prompts", v)} type={type} />

        <div className="slabel">✨ AI-assisted card</div>
        {aiAvailable() ? (
          <AIBuilder type={type} onCompile={(c) => setForm((f) => ({
            ...f,
            bio: c.bio || f.bio,
            lookingFor: c.lookingFor || f.lookingFor,
            prompts: Array.isArray(c.prompts) && c.prompts.length ? c.prompts.slice(0, 3) : f.prompts,
            interests: Array.isArray(c.interests) ? [...new Set([...f.interests, ...c.interests])] : f.interests,
          }))} />
        ) : (
          <div className="notice">Answer six questions and Gemini drafts your bio and prompts in your voice. To turn it on, add <code>VITE_GEMINI_API_KEY</code> to <code>.env</code>.</div>
        )}

        <div className="slabel">Social links <span style={{ color: "var(--muted)", fontSize: 10, textTransform: "none", fontStyle: "italic", letterSpacing: 0 }}>— locked until you accept someone</span></div>
        <div className="notice">These are never in your public page. Only people you accept can see them.{type === "casual" && " A second account is a good idea here 👀"}</div>
        {SOCIAL_PLATFORMS.map((p) => (
          <div key={p.id} className="social-row">
            <span style={{ fontSize: 18, width: 28, textAlign: "center" }} aria-hidden="true">{p.icon}</span>
            <label htmlFor={`s-${p.id}`} style={{ fontSize: 12, color: "var(--muted)", width: 88, flexShrink: 0 }}>{p.label}</label>
            <input id={`s-${p.id}`} value={form.socials[p.id] || ""} onChange={(e) => set("socials", { ...form.socials, [p.id]: e.target.value })} placeholder={p.placeholder} />
          </div>
        ))}

        <div className="sep" />
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button className="btn btn-p btn-lg" disabled={!form.name.trim() || saving || ageBad} onClick={publish}>
            {saving ? (mode === "edit" ? "Saving…" : "Publishing…") : mode === "edit" ? "Save changes" : "Publish my card"}
          </button>
          <button className="btn btn-g" onClick={() => { clearDraft(draftKey); navigate(profiles.length ? "/dashboard" : "/"); }}>Cancel</button>
        </div>
      </div>

      <aside className="editor-side" aria-label="Live preview">
        <div className="side-label">Card strength: {strength.score}%</div>
        <div className="strength">
          <div className="strength-bar"><div style={{ width: `${strength.score}%` }} /></div>
          <div className="strength-t">{strength.next ? `Next: ${strength.next}` : "✓ This card is ready to hand out."}</div>
        </div>
        <div className="side-label" style={{ marginTop: 22 }}>What they'll see when they scan</div>
        <div className="mini-card"><ProfileBody p={form} compact /></div>
        <div className="side-label" style={{ marginTop: 22 }}>The printed card</div>
        <div className="biz-fit" style={{ zoom: 0.98 }}><BizCard profile={form} tpl={templateOf("classic")} /></div>
      </aside>

      {askSignIn && (
        <Modal onClose={() => !signingIn && setAskSignIn(false)} maxWidth={460} label="Sign in to publish">
          <ModalHeader title="Sign in to publish" sub="Your card is saved on this device. Sign in once so it has an owner and an inbox." onClose={() => setAskSignIn(false)} />
          <AuthButtons busy={signingIn} onPick={signInToPublish} />
          <p className="modal-s" style={{ marginBottom: 0 }}>We never see a password. Nothing from your account appears on your card unless you typed it in.{api.DEMO_MODE && " (Demo mode: pick any, no real sign-in happens.)"}</p>
        </Modal>
      )}
    </div>
  );
}

function TypeBadge({ pt }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#111", border: `1px solid ${pt.color}44`, padding: "6px 14px", marginBottom: 22, fontSize: 12, color: pt.color }}>
      {pt.icon} {pt.label} Card
    </div>
  );
}

function PhotoPicker({ form, onChange }) {
  const input = useRef(null);
  const { toast } = useApp();
  const [busy, setBusy] = useState(false);
  async function pickFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast("That's not an image.", "bad"); return; }
    setBusy(true);
    try {
      const blob = await shrinkPhoto(file);
      onChange(await api.uploadPhoto(form.id, blob));
    } catch (e) {
      toast(`Photo upload failed: ${e.message}`, "bad");
    }
    setBusy(false);
  }
  return (
    <div className="photo-row">
      <button type="button" className={`photo-pick ${form.photo_url ? "has" : ""}`} onClick={() => input.current?.click()}
        style={form.photo_url ? { backgroundImage: `url("${form.photo_url}")` } : undefined} aria-label={form.photo_url ? "Change photo" : "Add a photo"}>
        {busy ? "…" : form.photo_url ? "" : "+"}
      </button>
      <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
        <div style={{ color: "var(--paper)", marginBottom: 3 }}>One photo</div>
        A clear face beats a perfect shot. It's cropped square and shown round.
        {form.photo_url && <div><button type="button" className="btn btn-g btn-sm" style={{ padding: "4px 0" }} onClick={() => onChange(null)}>Remove photo</button></div>}
      </div>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ""; }} />
    </div>
  );
}

function PromptPicker({ selected, onChange, type }) {
  const [adding, setAdding] = useState(false);
  const pool = (PROMPTS_BY_TYPE[type] || PROMPTS_BY_TYPE.serious).filter((p) => !selected.find((s) => s.prompt === p));
  const add = (p) => { onChange([...selected, { prompt: p, answer: "" }]); setAdding(false); };

  return (
    <div>
      {selected.map((item, i) => (
        <div key={item.prompt} className="prompt-card on">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div className="prompt-q">{item.prompt}</div>
            <button className="btn btn-g" aria-label={`Remove prompt ${item.prompt}`} onClick={() => onChange(selected.filter((_, j) => j !== i))} style={{ padding: "2px 6px", fontSize: 16 }}>×</button>
          </div>
          <textarea className="answer" aria-label={item.prompt} maxLength={300}
            style={{ width: "100%", background: "#111", border: "1px solid #2a2a2a", color: "var(--paper)", fontFamily: "var(--mono)", fontSize: 13, padding: "10px 12px", resize: "vertical", outline: "none", minHeight: 68 }}
            placeholder="A moment beats an adjective. What actually happened?"
            value={item.answer}
            onChange={(e) => { const n = [...selected]; n[i] = { ...n[i], answer: e.target.value }; onChange(n); }}
          />
        </div>
      ))}
      {selected.length < 3 && !adding && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-o btn-sm" onClick={() => setAdding(true)}>+ Add prompt ({selected.length}/3)</button>
          <button className="dice" onClick={() => add(pick(pool))} title="Pick one at random">🎲 Surprise me</button>
        </div>
      )}
      {adding && (
        <div>
          <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10 }}>Pick a prompt</div>
          <div className="prompt-grid">
            {pool.map((p) => <button key={p} className="prompt-opt" onClick={() => add(p)}>{p}</button>)}
          </div>
          <button className="btn btn-g btn-sm" onClick={() => setAdding(false)}>Cancel</button>
        </div>
      )}
    </div>
  );
}

function AIBuilder({ type, onCompile }) {
  const [answers, setAnswers] = useState(INTERVIEW.map((i) => ({ q: i.q, hint: i.hint, answer: "" })));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function go() {
    if (answers.filter((a) => a.answer.trim()).length < 3) { setMsg({ bad: true, text: "Answer at least 3 questions to give the AI something to work with." }); return; }
    setBusy(true); setMsg(null);
    try {
      onCompile(await compileCard(answers, type));
      setMsg({ text: "✨ Done — your draft is in the fields above. Edit anything that doesn't sound like you." });
    } catch (e) {
      setMsg({ bad: true, text: `AI compile failed: ${e.message}` });
    }
    setBusy(false);
  }

  return (
    <div>
      {answers.map((a, i) => (
        <div key={i} className="prompt-card">
          <div className="prompt-q">{a.q}</div>
          <textarea aria-label={a.q}
            style={{ width: "100%", background: "#111", border: "1px solid #2a2a2a", color: "var(--paper)", fontFamily: "var(--mono)", fontSize: 13, padding: "10px 12px", resize: "vertical", outline: "none", minHeight: 56 }}
            placeholder={a.hint} value={a.answer}
            onChange={(e) => { const n = [...answers]; n[i] = { ...n[i], answer: e.target.value }; setAnswers(n); }}
          />
        </div>
      ))}
      <button className="btn btn-p" onClick={go} disabled={busy} style={{ marginTop: 6 }}>{busy ? "Writing…" : "✨ Draft my card"}</button>
      {msg && <div style={{ marginTop: 10, fontSize: 12, color: msg.bad ? "var(--red)" : "var(--green)" }}>{msg.text}</div>}
    </div>
  );
}

// /print/:cardId?tpl=classic — ten standard business cards on US Letter with
// cut guides. Print at 100% scale, cut, hand out.

import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import * as api from "../lib/api.js";
import { sampleCard } from "../lib/samples.js";
import { CARD_TEMPLATES, templateOf } from "../lib/constants.js";
import { useApp } from "../state.jsx";
import { BizCard } from "../components/cards.jsx";
import { Loading } from "../components/ui.jsx";
import { useNoindex } from "./Applicant.jsx";

export default function PrintSheet() {
  const { cardId } = useParams();
  const [params, setParams] = useSearchParams();
  const { premium } = useApp();
  const [profile, setProfile] = useState(undefined);
  const wanted = templateOf(params.get("tpl"));
  const tpl = wanted.premium && !premium ? templateOf("classic") : wanted;

  useNoindex();
  useEffect(() => {
    api.getPublicProfile(cardId).catch(() => null).then((p) => setProfile(p || sampleCard(cardId)));
  }, [cardId]);

  if (profile === undefined) return <Loading />;
  if (!profile) return <Loading>Card not found.</Loading>;

  return (
    <>
      <div className="sheet-tools no-print">
        <div className="page-t" style={{ fontSize: 28 }}>Print sheet</div>
        <p className="page-s" style={{ marginBottom: 16 }}>
          Ten 3.5 × 2 in cards on US Letter. Print at <strong style={{ color: "var(--gold-light)" }}>100% / actual size</strong>, turn on
          background graphics, then cut along the dashed lines. Heavy paper (200gsm+) feels like a real card.
        </p>
        <div className="qr-acts" style={{ alignItems: "center" }}>
          <button className="btn btn-p" onClick={() => window.print()}>🖨 Print</button>
          <select value={tpl.id} onChange={(e) => setParams({ tpl: e.target.value })} aria-label="Design"
            style={{ background: "#0f0f0f", color: "var(--paper)", border: "1px solid #333", padding: "9px 12px", fontFamily: "var(--mono)", fontSize: 12 }}>
            {CARD_TEMPLATES.filter((t) => premium || !t.premium).map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <Link className="btn btn-g" to="/dashboard" style={{ textDecoration: "none" }}>← Dashboard</Link>
        </div>
      </div>
      <div className="sheet-scroll">
        <div className="sheet">
          {Array.from({ length: 10 }, (_, i) => <BizCard key={i} profile={profile} tpl={tpl} />)}
        </div>
      </div>
    </>
  );
}

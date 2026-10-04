// Canvas posters: a lock-screen wallpaper (SPEC P4 "phone-wallpaper QR") and an
// Instagram/Messenger story image. Your phone becomes the card — hand it over,
// they scan the lock screen, done.

import { qrDataUrl } from "./qr.js";
import { typeOf, templateSolid, qrColors } from "./constants.js";
import { canShowLocation, prettyUrl } from "./util.js";

export const POSTER_SIZES = {
  lockscreen: { w: 1170, h: 2532, label: "Lock screen", file: "lockscreen" },
  story:      { w: 1080, h: 1920, label: "Story",       file: "story" },
};

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrap(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** Renders the poster and resolves to a PNG data URL. */
export async function renderPoster(profile, url, tpl, kind = "lockscreen") {
  const { w, h } = POSTER_SIZES[kind];
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  const u = w / 100; // 1% of width — everything is laid out in these units
  const pt = typeOf(profile.type);
  const solid = templateSolid(tpl);
  const light = ["#ffffff", "#f0ead8", "#c9a84c"].includes(solid.toLowerCase());

  try { await document.fonts?.load(`italic 600 ${9 * u}px "Bodoni Moda"`); await document.fonts?.load(`500 ${3 * u}px "Hanken Grotesk"`); await document.fonts?.load(`400 ${3 * u}px "DM Mono"`); } catch { /* fallback fonts */ }

  // Background: template colour, a soft glow in the card-type colour, fine grain.
  ctx.fillStyle = solid;
  ctx.fillRect(0, 0, w, h);
  const glow = ctx.createRadialGradient(w * 0.5, h * 0.62, 0, w * 0.5, h * 0.62, w * 0.9);
  glow.addColorStop(0, `${pt.color}33`);
  glow.addColorStop(1, `${pt.color}00`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = light ? "rgba(0,0,0,0.035)" : "rgba(255,255,255,0.025)";
  for (let i = 0; i < 2200; i++) ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);

  // Lock screens keep the top ~38% clear for the clock; stories start higher.
  let y = kind === "lockscreen" ? h * 0.40 : h * 0.16;
  ctx.textAlign = "center";

  if (profile.photo_url) {
    try {
      const img = await loadImage(profile.photo_url);
      const r = 11 * u;
      ctx.save();
      ctx.beginPath(); ctx.arc(w / 2, y, r, 0, Math.PI * 2); ctx.clip();
      const s = Math.max((2 * r) / img.width, (2 * r) / img.height);
      ctx.drawImage(img, w / 2 - (img.width * s) / 2, y - (img.height * s) / 2, img.width * s, img.height * s);
      ctx.restore();
      ctx.strokeStyle = tpl.accent; ctx.lineWidth = 0.5 * u;
      ctx.beginPath(); ctx.arc(w / 2, y, r, 0, Math.PI * 2); ctx.stroke();
      y += r + 9 * u;
    } catch { /* photo blocked by CORS — skip it */ }
  }

  ctx.fillStyle = tpl.text;
  ctx.font = `italic 600 ${9.5 * u}px "Bodoni Moda", Georgia, serif`;
  ctx.fillText(profile.name || "Your Name", w / 2, y);
  y += 5.5 * u;

  ctx.font = `500 ${2.9 * u}px "Hanken Grotesk", sans-serif`;
  ctx.globalAlpha = 0.7;
  const meta = [profile.age, canShowLocation(profile) ? profile.location : null].filter(Boolean).join(", ");
  ctx.fillText(`${meta ? meta + ", " : ""}${pt.label.toLowerCase()} card`, w / 2, y);
  ctx.globalAlpha = 1;
  y += 6 * u;

  if (profile.lookingFor) {
    ctx.font = `italic 400 ${3.6 * u}px "Bodoni Moda", Georgia, serif`;
    ctx.fillStyle = tpl.accent;
    for (const line of wrap(ctx, `“${profile.lookingFor}”`, w * 0.78).slice(0, 2)) { ctx.fillText(line, w / 2, y); y += 5 * u; }
    y += 2 * u;
  }

  // QR in a rounded panel.
  const qrSize = 46 * u;
  const pad = 4 * u;
  const px = (w - qrSize) / 2 - pad;
  const py = Math.max(y + 2 * u, kind === "lockscreen" ? h * 0.58 : y + 2 * u);
  const q = qrColors(tpl); // dark-on-light so every scanner reads it
  ctx.fillStyle = q.bg;
  ctx.strokeStyle = `${tpl.accent}88`;
  ctx.lineWidth = 0.35 * u;
  ctx.beginPath();
  ctx.roundRect(px, py, qrSize + pad * 2, qrSize + pad * 2, 4 * u);
  ctx.fill(); ctx.stroke();
  const qr = await loadImage(await qrDataUrl(url, { size: Math.round(qrSize), fg: q.fg, bg: q.bg, margin: 0 }));
  ctx.drawImage(qr, px + pad, py + pad, qrSize, qrSize);
  y = py + qrSize + pad * 2 + 8 * u;

  ctx.fillStyle = tpl.text;
  ctx.font = `600 ${3.4 * u}px "Hanken Grotesk", sans-serif`;
  ctx.fillText("Scan to apply", w / 2, y);
  y += 4.6 * u;
  ctx.globalAlpha = 0.5;
  ctx.font = `400 ${2.5 * u}px "DM Mono", monospace`;
  ctx.fillText(prettyUrl(url), w / 2, y);
  ctx.globalAlpha = 0.35;
  ctx.font = `italic 500 ${2.6 * u}px "Bodoni Moda", Georgia, serif`;
  ctx.fillText("DateCard", w / 2, h - 6 * u);
  ctx.globalAlpha = 1;

  return c.toDataURL("image/png");
}

/** Downscale a picked photo to a ~480px JPEG before storing/uploading it. */
export async function shrinkPhoto(file, max = 480) {
  const src = URL.createObjectURL(file);
  try {
    const img = await loadImage(src);
    const s = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    // square crop from the centre — profile photos are shown round
    const side = Math.min(img.width, img.height);
    c.width = c.height = Math.round(side * s);
    c.getContext("2d").drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, c.width, c.height);
    return await new Promise((resolve) => c.toBlob(resolve, "image/jpeg", 0.85));
  } finally {
    URL.revokeObjectURL(src);
  }
}

// QR codes are generated in the browser. The old version sent every card URL
// to api.qrserver.com — a third party learning who has a DateCard is exactly
// the leak the product exists to prevent.

import QRCode from "qrcode";

const hex = (c) => (c.startsWith("#") ? c : `#${c}`);

export function qrDataUrl(text, { size = 512, fg = "#c9a84c", bg = "#0a0a0a", margin = 1 } = {}) {
  return QRCode.toDataURL(text, {
    width: size, margin, errorCorrectionLevel: "M",
    color: { dark: hex(fg), light: hex(bg) },
  });
}

export function qrSvg(text, { fg = "#c9a84c", bg = "#0a0a0a", margin = 1 } = {}) {
  return QRCode.toString(text, { type: "svg", margin, errorCorrectionLevel: "M", color: { dark: hex(fg), light: hex(bg) } });
}

export async function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

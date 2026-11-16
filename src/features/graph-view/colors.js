// Author: kamekingdom (2026-10-28)

export function readRgb(value) {
  const v = String(value || "").trim();
  if (v.startsWith("#")) {
    const hex = v.slice(1);
    const norm = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
    if (/^[a-f0-9]{6}$/i.test(norm))
      return [0, 2, 4].map((i) => parseInt(norm.slice(i, i + 2), 16));
  }
  const m = v.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  if (m && !/^rgba\([^)]*,\s*0(?:\.0+)?\)$/.test(v)) return m.slice(1, 4).map(Number);
  return null;
}

export const blend = (a, b, t) => a.map((v, i) => Math.round(v * (1 - t) + b[i] * t));

export const rgbCss = (c) =>
  `rgb(${c.map((v) => Math.max(0, Math.min(255, Math.round(v)))).join(", ")})`;

export const alphaCss = (c, a) => `rgba(${c.map(Math.round).join(", ")}, ${a})`;

export const luminance = (c) =>
  c.reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0) / 255;

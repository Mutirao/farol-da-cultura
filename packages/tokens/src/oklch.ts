// Conversão sRGB hex -> OKLCH (Björn Ottosson, https://bottosson.github.io/posts/oklab/).
// Implementação própria; os testes conferem o resultado com a culori.

function toLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function fmt(value: number, digits: number): string {
  const rounded = Number(value.toFixed(digits));
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

export function hexToOklch(hex: string): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = toLinear((n >> 16) & 255);
  const g = toLinear((n >> 8) & 255);
  const b = toLinear(n & 255);

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  const C = Math.hypot(A, B);
  if (C < 0.0002) return `oklch(${fmt(L, 4)} 0 0)`;
  const H = ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
  return `oklch(${fmt(L, 4)} ${fmt(C, 4)} ${fmt(H, 3)})`;
}

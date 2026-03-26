import { describe, it, expect } from 'vitest';

// We re-declare these here since they are private to Toolbar.tsx.
// In a real project they'd be extracted to a utils file.

const hslToHex = (h: number, s: number, l: number) => {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

const hexToHsl = (hex: string): { h: number; s: number; l: number } => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const ll = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(ll * 100) };
  const d = max - min;
  const ss = ll > 0.5 ? d / (2 - max - min) : d / (max + min);
  let hh = 0;
  if (max === r) hh = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) hh = ((b - r) / d + 2) / 6;
  else hh = ((r - g) / d + 4) / 6;
  return { h: Math.round(hh * 360), s: Math.round(ss * 100), l: Math.round(ll * 100) };
};

describe('hslToHex', () => {
  it('converts pure red', () => {
    expect(hslToHex(0, 100, 50)).toBe('#ff0000');
  });

  it('converts pure green', () => {
    expect(hslToHex(120, 100, 50)).toBe('#00ff00');
  });

  it('converts pure blue', () => {
    expect(hslToHex(240, 100, 50)).toBe('#0000ff');
  });

  it('converts white', () => {
    expect(hslToHex(0, 0, 100)).toBe('#ffffff');
  });

  it('converts black', () => {
    expect(hslToHex(0, 0, 0)).toBe('#000000');
  });

  it('converts mid-gray', () => {
    const hex = hslToHex(0, 0, 50);
    expect(hex).toBe('#808080');
  });
});

describe('hexToHsl', () => {
  it('converts pure red', () => {
    const { h, s, l } = hexToHsl('#ff0000');
    expect(h).toBe(0);
    expect(s).toBe(100);
    expect(l).toBe(50);
  });

  it('converts pure green', () => {
    const { h, s, l } = hexToHsl('#00ff00');
    expect(h).toBe(120);
    expect(s).toBe(100);
    expect(l).toBe(50);
  });

  it('converts white', () => {
    const { s, l } = hexToHsl('#ffffff');
    expect(s).toBe(0);
    expect(l).toBe(100);
  });

  it('converts black', () => {
    const { s, l } = hexToHsl('#000000');
    expect(s).toBe(0);
    expect(l).toBe(0);
  });

  it('round-trips correctly', () => {
    const original = '#3498db';
    const hsl = hexToHsl(original);
    const result = hslToHex(hsl.h, hsl.s, hsl.l);
    // Allow small rounding difference (±1 per channel)
    const oR = parseInt(original.slice(1, 3), 16);
    const oG = parseInt(original.slice(3, 5), 16);
    const oB = parseInt(original.slice(5, 7), 16);
    const rR = parseInt(result.slice(1, 3), 16);
    const rG = parseInt(result.slice(3, 5), 16);
    const rB = parseInt(result.slice(5, 7), 16);
    expect(Math.abs(oR - rR)).toBeLessThanOrEqual(2);
    expect(Math.abs(oG - rG)).toBeLessThanOrEqual(2);
    expect(Math.abs(oB - rB)).toBeLessThanOrEqual(2);
  });
});

/** Deterministic PRNG utilities so the demo dataset is 100% reproducible. */

export function hashString(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Rng {
  next(): number;
  int(min: number, max: number): number;
  float(min: number, max: number, dp?: number): number;
  pick<T>(arr: readonly T[]): T;
  pickMany<T>(arr: readonly T[], n: number): T[];
  weighted<T>(entries: readonly [T, number][]): T;
  bool(pTrue: number): boolean;
  shuffle<T>(arr: readonly T[]): T[];
  dateBetween(start: Date, end: Date): Date;
}

export function createRng(seed: string | number): Rng {
  const next = mulberry32(typeof seed === 'string' ? hashString(seed) : seed);
  const int = (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min;
  const float = (min: number, max: number, dp = 1) => Number((next() * (max - min) + min).toFixed(dp));
  const bool = (pTrue: number) => next() < pTrue;

  const weighted = <T,>(entries: readonly [T, number][]): T => {
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let r = next() * total;
    for (const [value, w] of entries) {
      r -= w;
      if (r <= 0) return value;
    }
    return entries[entries.length - 1][0];
  };

  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(next() * arr.length)];

  const shuffle = <T,>(arr: readonly T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(next() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const pickMany = <T,>(arr: readonly T[], n: number): T[] => shuffle(arr).slice(0, n);

  const dateBetween = (start: Date, end: Date): Date => {
    const t = start.getTime() + next() * (end.getTime() - start.getTime());
    return new Date(t);
  };

  return { next, int, float, pick, pickMany, weighted, bool, shuffle, dateBetween };
}

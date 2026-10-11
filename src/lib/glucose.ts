import type { GlucoseReading, Moment, Unit } from '@/data/types';

/** Seuils de sécurité fixes (mg/dL) — non modifiables. */
export const HYPO_SEVERE = 54;
export const HYPER_SEVERE = 250;
export const DEFAULT_TARGET_MIN = 70;
export const DEFAULT_TARGET_MAX = 180;

export type GlucoseStatus = 'hypo_severe' | 'hypo' | 'cible' | 'hyper' | 'hyper_severe';

export function statusOf(mgdl: number, min = DEFAULT_TARGET_MIN, max = DEFAULT_TARGET_MAX): GlucoseStatus {
  if (mgdl < HYPO_SEVERE) return 'hypo_severe';
  if (mgdl < min) return 'hypo';
  if (mgdl > HYPER_SEVERE) return 'hyper_severe';
  if (mgdl > max) return 'hyper';
  return 'cible';
}

export const isOutOfTarget = (s: GlucoseStatus) => s !== 'cible';
export const isSevere = (s: GlucoseStatus) => s === 'hypo_severe' || s === 'hyper_severe';
export const isLow = (s: GlucoseStatus) => s === 'hypo' || s === 'hypo_severe';
export const isHigh = (s: GlucoseStatus) => s === 'hyper' || s === 'hyper_severe';

/** Flèche textuelle : la couleur n'est jamais le seul indice. */
export const STATUS_GLYPH: Record<GlucoseStatus, string> = {
  hypo_severe: '⬇⬇',
  hypo: '⬇',
  cible: '✓',
  hyper: '⬆',
  hyper_severe: '⬆⬆',
};

export function toUnit(mgdl: number, unit: Unit): number {
  return unit === 'g/L' ? mgdl / 100 : mgdl;
}

export function fromUnit(value: number, unit: Unit): number {
  return unit === 'g/L' ? Math.round(value * 100) : Math.round(value);
}

/** Nombre en français : virgule décimale. */
export function fmtNumber(n: number, decimals = 0): string {
  return n.toFixed(decimals).replace('.', ',');
}

export function fmtGlucose(mgdl: number, unit: Unit, withUnit = true): string {
  const v = unit === 'g/L' ? fmtNumber(mgdl / 100, 2) : fmtNumber(mgdl, 0);
  return withUnit ? `${v} ${unit}` : v;
}

/** Lit "1,25" ou "1.25" ; renvoie null si invalide. */
export function parseNumber(text: string): number | null {
  const clean = text.replace(',', '.').replace(/[^0-9.]/g, '');
  if (!clean) return null;
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
}

/** Bornes de saisie plausibles (mg/dL). */
export const MIN_MGDL = 20;
export const MAX_MGDL = 600;

export function stepFor(unit: Unit): number {
  return unit === 'g/L' ? 0.05 : 5;
}

/** Devine le moment de la mesure selon l'heure. */
export function guessMoment(date = new Date()): Moment {
  const h = date.getHours() + date.getMinutes() / 60;
  if (h >= 4 && h < 9.5) return 'a_jeun';
  if (h >= 11.5 && h < 12.5) return 'avant_repas';
  if (h >= 12.5 && h < 16) return 'apres_repas';
  if (h >= 18 && h < 19.5) return 'avant_repas';
  if (h >= 19.5 && h < 21.5) return 'apres_repas';
  if (h >= 21.5 || h < 4) return 'coucher';
  return 'autre';
}

export const MOMENTS: Moment[] = ['a_jeun', 'avant_repas', 'apres_repas', 'coucher', 'autre'];

export function activeReadings(list: GlucoseReading[]): GlucoseReading[] {
  return list.filter((r) => !r.deleted_at).sort((a, b) => a.measured_at.localeCompare(b.measured_at));
}

export interface GlucoseStats {
  count: number;
  mean: number | null;
  min: number | null;
  max: number | null;
  pctInTarget: number | null;
  hypos: number;
  hypers: number;
}

export function computeStats(list: GlucoseReading[], min: number, max: number): GlucoseStats {
  if (list.length === 0)
    return { count: 0, mean: null, min: null, max: null, pctInTarget: null, hypos: 0, hypers: 0 };
  let sum = 0;
  let lo = Infinity;
  let hi = -Infinity;
  let inT = 0;
  let hypos = 0;
  let hypers = 0;
  for (const r of list) {
    const v = r.value_mgdl;
    sum += v;
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
    const s = statusOf(v, min, max);
    if (s === 'cible') inT++;
    if (isLow(s)) hypos++;
    if (isHigh(s)) hypers++;
  }
  return {
    count: list.length,
    mean: sum / list.length,
    min: lo,
    max: hi,
    pctInTarget: Math.round((inT / list.length) * 100),
    hypos,
    hypers,
  };
}

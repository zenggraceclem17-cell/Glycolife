import type { Language } from '@/data/types';

// Les jours restent en français : les libellés lingala sont à faire valider par un locuteur natif.
const DAYS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const DAYS_LONG = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export const DAY_MS = 24 * 3600 * 1000;

const pad = (n: number) => String(n).padStart(2, '0');

/** Instant situé il y a `minutes` minutes. */
export function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60000);
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Clé locale de jour YYYY-MM-DD (fuseau du téléphone). */
export function dayKey(d: Date | string): string {
  const x = typeof d === 'string' ? new Date(d) : d;
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function fmtTime(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fmtDayShort(d: Date | string): string {
  const x = typeof d === 'string' ? new Date(d) : d;
  return `${pad(x.getDate())}/${pad(x.getMonth() + 1)}`;
}

export function fmtDate(d: Date | string): string {
  const x = typeof d === 'string' ? new Date(d) : d;
  return `${x.getDate()} ${MONTHS[x.getMonth()]} ${x.getFullYear()}`;
}

export function fmtDateNumeric(d: Date | string): string {
  const x = typeof d === 'string' ? new Date(d) : d;
  return `${pad(x.getDate())}/${pad(x.getMonth() + 1)}/${x.getFullYear()}`;
}

export function fmtWeekday(d: Date | string, lang: Language = 'fr', long = false): string {
  const x = typeof d === 'string' ? new Date(d) : d;
  void lang;
  return (long ? DAYS_LONG : DAYS)[x.getDay()];
}

/** "Aujourd'hui", "Hier" ou "lundi 6 oct." */
export function fmtDayLabel(d: Date | string, lang: Language = 'fr'): string {
  const x = typeof d === 'string' ? new Date(d) : d;
  const today = startOfDay(new Date()).getTime();
  const that = startOfDay(x).getTime();
  if (that === today) return lang === 'ln' ? 'Lelo' : "Aujourd'hui";
  if (that === today - DAY_MS) return lang === 'ln' ? 'Lobi eleki' : 'Hier';
  if (that === today + DAY_MS) return lang === 'ln' ? 'Lobi ekoya' : 'Demain';
  return `${DAYS_LONG[x.getDay()]} ${x.getDate()} ${MONTHS[x.getMonth()]}`;
}

export function daysUntil(iso: string): number {
  const a = startOfDay(new Date()).getTime();
  const b = startOfDay(new Date(iso)).getTime();
  return Math.round((b - a) / DAY_MS);
}

/** "HH:MM" du jour donné → Date. */
export function atSlot(day: Date, slot: string): Date {
  const [h, m] = slot.split(':').map(Number);
  const x = new Date(day);
  x.setHours(h || 0, m || 0, 0, 0);
  return x;
}

export function isValidSlot(s: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

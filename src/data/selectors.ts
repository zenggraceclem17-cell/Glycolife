// Lectures dérivées de la base locale. Les mêmes règles de confidentialité que la RLS
// sont appliquées ici (indispensable en mode démo, sans effet en mode serveur).
import { atSlot, addDays, dayKey, startOfDay } from '@/lib/dates';
import { activeReadings, DEFAULT_TARGET_MAX, DEFAULT_TARGET_MIN, statusOf } from '@/lib/glucose';
import {
  KEY,
  type TableName,
  type Appointment,
  type GlucoseReading,
  type LinkedPatient,
  type LocalDb,
  type Meal,
  type MedicalProfile,
  type Medication,
  type MedicationLog,
  type Message,
  type Profile,
  type Vital,
} from './types';

export function profileOf(db: LocalDb, id: string): Profile | null {
  return db.tables.profiles[id] ?? null;
}

export function defaultMedical(patientId: string): MedicalProfile {
  const t = new Date(0).toISOString();
  return {
    patient_id: patientId,
    birth_year: null,
    sex: null,
    diabetes_type: null,
    diagnosis_year: null,
    treatments: [],
    allergies: [],
    other_allergy: null,
    meals_per_day: null,
    usual_foods: [],
    activity: null,
    blood_group: null,
    emergency_name: null,
    emergency_phone: null,
    target_min: DEFAULT_TARGET_MIN,
    target_max: DEFAULT_TARGET_MAX,
    unit: 'g/L',
    share_readings: true,
    share_alerts: true,
    share_profile: false,
    created_at: t,
    updated_at: t,
  };
}

export function medicalOf(db: LocalDb, patientId: string): MedicalProfile {
  return db.tables.medical_profiles[patientId] ?? defaultMedical(patientId);
}

export function hasMedical(db: LocalDb, patientId: string): boolean {
  return !!db.tables.medical_profiles[patientId];
}

export function readingsOf(db: LocalDb, patientId: string): GlucoseReading[] {
  return activeReadings(Object.values(db.tables.glucose_readings).filter((r) => r.patient_id === patientId));
}

export function readingsSince(list: GlucoseReading[], days: number): GlucoseReading[] {
  const from = startOfDay(addDays(new Date(), -(days - 1))).toISOString();
  return list.filter((r) => r.measured_at >= from);
}

// ---------- Liens ----------

export function caregiversOf(db: LocalDb, patientId: string) {
  return Object.values(db.tables.care_links)
    .filter((l) => l.patient_id === patientId && l.status === 'active')
    .map((l) => ({ link: l, profile: profileOf(db, l.caregiver_id) }));
}

export function linkedPatients(db: LocalDb, caregiverId: string): LinkedPatient[] {
  // Mode serveur : résultat de la RPC linked_patients() (déjà filtré par le serveur).
  if (db.linkedPatients) return db.linkedPatients;
  const activeIds = new Set(
    Object.values(db.tables.care_links)
      .filter((l) => l.caregiver_id === caregiverId && l.status === 'active')
      .map((l) => l.patient_id),
  );
  return [...activeIds].map((pid) => {
    const p = profileOf(db, pid);
    const m = medicalOf(db, pid);
    return {
      patient_id: pid,
      full_name: p?.full_name ?? 'Proche',
      phone: p?.phone ?? null,
      target_min: m.target_min,
      target_max: m.target_max,
      share_readings: m.share_readings,
      share_alerts: m.share_alerts,
      share_profile: m.share_profile,
    };
  });
}

/** Mesures visibles par un accompagnateur selon les choix du patient. */
export function visibleReadings(db: LocalDb, lp: LinkedPatient): GlucoseReading[] {
  const all = readingsOf(db, lp.patient_id);
  if (lp.share_readings) return all;
  if (lp.share_alerts) return all.filter((r) => statusOf(r.value_mgdl, lp.target_min, lp.target_max) !== 'cible');
  return [];
}

export interface AlertItem {
  reading: GlucoseReading;
  patient: LinkedPatient;
  seen: boolean;
}

export function alertsFor(db: LocalDb, caregiverId: string, days = 30): AlertItem[] {
  const seen = new Set(db.seenAlerts[caregiverId] ?? []);
  const out: AlertItem[] = [];
  for (const lp of linkedPatients(db, caregiverId)) {
    if (!lp.share_alerts && !lp.share_readings) continue;
    for (const r of readingsSince(visibleReadings(db, lp), days)) {
      if (statusOf(r.value_mgdl, lp.target_min, lp.target_max) !== 'cible')
        out.push({ reading: r, patient: lp, seen: seen.has(r.id) });
    }
  }
  return out.sort((a, b) => b.reading.measured_at.localeCompare(a.reading.measured_at));
}

// ---------- Carnet de santé ----------

export function medicationsOf(db: LocalDb, patientId: string): Medication[] {
  return Object.values(db.tables.medications)
    .filter((m) => m.patient_id === patientId && !m.deleted_at)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export type DoseStatus = 'pris' | 'a_prendre' | 'en_retard';

export interface Dose {
  med: Medication;
  slot: string;
  status: DoseStatus;
  log: MedicationLog | null;
}

export function findLog(db: LocalDb, medId: string, day: string, slot: string): MedicationLog | null {
  return (
    Object.values(db.tables.medication_logs).find(
      (l) => l.medication_id === medId && l.day === day && l.slot === slot,
    ) ?? null
  );
}

export function dosesOfDay(db: LocalDb, patientId: string, date = new Date()): Dose[] {
  const day = dayKey(date);
  const now = new Date();
  const out: Dose[] = [];
  for (const med of medicationsOf(db, patientId).filter((m) => m.active)) {
    for (const slot of [...med.times].sort()) {
      const log = findLog(db, med.id, day, slot);
      const taken = !!log?.taken_at;
      const late = !taken && now.getTime() > atSlot(date, slot).getTime() + 3600000;
      out.push({ med, slot, log, status: taken ? 'pris' : late ? 'en_retard' : 'a_prendre' });
    }
  }
  return out.sort((a, b) => a.slot.localeCompare(b.slot));
}

/** % de prises respectées sur les 7 derniers jours (null si aucun traitement). */
export function adherence7(db: LocalDb, patientId: string): number | null {
  const meds = medicationsOf(db, patientId).filter((m) => m.active);
  if (meds.length === 0) return null;
  const now = new Date();
  let expected = 0;
  let taken = 0;
  for (let i = 0; i < 7; i++) {
    const day = addDays(startOfDay(now), -i);
    for (const m of meds) {
      if (new Date(m.created_at) > atSlot(day, '23:59')) continue;
      for (const slot of m.times) {
        if (atSlot(day, slot) > now) continue;
        expected++;
        if (findLog(db, m.id, dayKey(day), slot)?.taken_at) taken++;
      }
    }
  }
  return expected === 0 ? null : Math.round((taken / expected) * 100);
}

export function appointmentsOf(db: LocalDb, patientId: string): Appointment[] {
  return Object.values(db.tables.appointments)
    .filter((a) => a.patient_id === patientId && !a.deleted_at)
    .sort((a, b) => a.at.localeCompare(b.at));
}

export function nextAppointment(db: LocalDb, patientId: string): Appointment | null {
  const from = startOfDay(new Date()).toISOString();
  return appointmentsOf(db, patientId).find((a) => !a.done && a.at >= from) ?? null;
}

export function vitalsOf(db: LocalDb, patientId: string): Vital[] {
  return Object.values(db.tables.vitals)
    .filter((v) => v.patient_id === patientId && !v.deleted_at)
    .sort((a, b) => a.measured_at.localeCompare(b.measured_at));
}

export function mealsOf(db: LocalDb, patientId: string): Meal[] {
  return Object.values(db.tables.meals)
    .filter((m) => m.patient_id === patientId && !m.deleted_at)
    .sort((a, b) => b.eaten_at.localeCompare(a.eaten_at));
}

// ---------- Messagerie ----------

export function conversation(db: LocalDb, me: string, peer: string): Message[] {
  return Object.values(db.tables.messages)
    .filter((m) => (m.sender_id === me && m.recipient_id === peer) || (m.sender_id === peer && m.recipient_id === me))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function unreadFrom(db: LocalDb, me: string, peer?: string): number {
  return Object.values(db.tables.messages).filter(
    (m) => m.recipient_id === me && !m.read_at && (!peer || m.sender_id === peer),
  ).length;
}

export function isPending(db: LocalDb, table: TableName, key: string): boolean {
  return db.outbox.some((o) => o.table === table && (o.kind === 'update' ? o.key : String(o.row[KEY[table]])) === key);
}

/** Analyse « sans IA » : glycémie moyenne 1 à 3 h après les repas contenant chaque aliment suivi. */
export interface FoodImpact {
  foodId: string;
  name: string;
  meals: number;
  avgAfter: number;
  overTarget: boolean;
}

export function foodImpacts(db: LocalDb, patientId: string, trackedIds: Set<string>, targetMax: number): FoodImpact[] {
  const readings = readingsOf(db, patientId);
  const acc = new Map<string, { name: string; sum: number; n: number; meals: number }>();
  for (const meal of mealsOf(db, patientId)) {
    const t = new Date(meal.eaten_at).getTime();
    const after = readings.filter((r) => {
      const dt = new Date(r.measured_at).getTime() - t;
      return dt >= 3600000 && dt <= 3 * 3600000;
    });
    if (after.length === 0) continue;
    const avg = after.reduce((s, r) => s + r.value_mgdl, 0) / after.length;
    const seen = new Set<string>();
    for (const it of meal.items) {
      if (!trackedIds.has(it.food_id) || seen.has(it.food_id)) continue;
      seen.add(it.food_id);
      const cur = acc.get(it.food_id) ?? { name: it.name, sum: 0, n: 0, meals: 0 };
      cur.sum += avg;
      cur.n += 1;
      cur.meals += 1;
      acc.set(it.food_id, cur);
    }
  }
  return [...acc.entries()]
    .map(([foodId, v]) => ({
      foodId,
      name: v.name,
      meals: v.meals,
      avgAfter: v.sum / v.n,
      overTarget: v.n >= 2 && v.sum / v.n > targetMax,
    }))
    .sort((a, b) => b.avgAfter - a.avgAfter);
}

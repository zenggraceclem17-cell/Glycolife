// Données de démonstration réalistes, 100 % locales (aucun serveur).
import { addDays, atSlot, dayKey, startOfDay } from '@/lib/dates';
import { FOOD_BY_ID } from './foods';
import {
  emptyDb,
  type Appointment,
  type CareLink,
  type Feeling,
  type GlucoseReading,
  type LocalDb,
  type Meal,
  type MealItem,
  type MedicalProfile,
  type Medication,
  type MedicationLog,
  type Message,
  type Moment,
  type Profile,
  type Vital,
} from './types';

export const DEMO_PATIENT = '00000000-0000-4000-a000-000000000001';
export const DEMO_PATIENT_2 = '00000000-0000-4000-a000-000000000002';
export const DEMO_CAREGIVER = '00000000-0000-4000-a000-000000000003';

/** Générateur pseudo-aléatoire déterministe (même démo à chaque chargement). */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

let counter = 0;
function demoId(prefix: string): string {
  counter++;
  const hex = counter.toString(16).padStart(12, '0');
  return `${prefix.padEnd(8, '0').slice(0, 8)}-0000-4000-b000-${hex}`;
}

const MEAL_COMBOS: string[][] = [
  ['fufu', 'pondu', 'poisson'],
  ['chikwangue', 'poisson'],
  ['riz', 'haricots'],
  ['riz', 'poulet', 'ndunda'],
  ['plantain', 'poisson'],
  ['pain', 'oeuf', 'the_sucre'],
  ['mikate', 'the_sucre'],
  ['fufu', 'poulet', 'soda'],
  ['patate', 'arachides'],
];

function mealItems(ids: string[]): MealItem[] {
  return ids.map((id) => {
    const f = FOOD_BY_ID[id];
    return { food_id: id, name: f.name, portions: 1, carbs: f.carbs };
  });
}

interface PatientSpec {
  id: string;
  days: number;
  seed: number;
  baseFast: number;
  meds: { name: string; dose: string; times: string[] }[];
}

function genPatient(db: LocalDb, spec: PatientSpec) {
  const r = rng(spec.seed);
  const now = new Date();
  const today = startOfDay(now);
  const T = db.tables;
  const created = addDays(today, -spec.days).toISOString();

  // Médicaments
  const meds: Medication[] = spec.meds.map((m) => ({
    id: demoId('med'),
    patient_id: spec.id,
    name: m.name,
    dose: m.dose,
    times: m.times,
    active: true,
    deleted_at: null,
    created_at: created,
    updated_at: created,
  }));
  for (const m of meds) T.medications[m.id] = m;

  for (let d = spec.days; d >= 0; d--) {
    const day = addDays(today, -d);
    const feelPick = (): Feeling[] => (r() < 0.8 ? ['bien'] : [(['fatigue', 'soif', 'faim'] as Feeling[])[Math.floor(r() * 3)]]);

    const add = (moment: Moment, at: Date, value: number, extra?: Partial<GlucoseReading>) => {
      if (at > now) return;
      const id = demoId('gly');
      T.glucose_readings[id] = {
        id,
        patient_id: spec.id,
        value_mgdl: Math.round(Math.max(40, Math.min(420, value))),
        moment,
        feelings: feelPick(),
        meal: null,
        note: null,
        measured_at: at.toISOString(),
        deleted_at: null,
        created_at: at.toISOString(),
        updated_at: at.toISOString(),
        ...extra,
      };
    };

    // À jeun
    if (r() < 0.9) add('a_jeun', atSlot(day, `07:${10 + Math.floor(r() * 40)}`), spec.baseFast + (r() - 0.5) * 50);

    // Déjeuner + mesure après repas
    const combo = MEAL_COMBOS[Math.floor(r() * MEAL_COMBOS.length)];
    const items = mealItems(combo);
    const carbs = items.reduce((s, i) => s + i.carbs, 0);
    const mealAt = atSlot(day, `13:${Math.floor(r() * 30) + 10}`);
    if (mealAt <= now) {
      const mid = demoId('meal');
      T.meals[mid] = {
        id: mid,
        patient_id: spec.id,
        eaten_at: mealAt.toISOString(),
        items,
        carbs_total: carbs,
        note: null,
        deleted_at: null,
        created_at: mealAt.toISOString(),
        updated_at: mealAt.toISOString(),
      } satisfies Meal;
    }
    if (r() < 0.75) {
      const after = new Date(mealAt.getTime() + (90 + r() * 40) * 60000);
      const v = spec.baseFast - 15 + carbs * 0.65 + (r() - 0.5) * 50;
      add('apres_repas', after, v, {
        meal: items.map((i) => i.name).join(', '),
        feelings: v > 250 ? ['soif', 'fatigue'] : feelPick(),
        note: v > 250 && r() < 0.5 ? 'Grosse assiette à une fête de famille' : null,
      });
    }

    // Coucher
    if (r() < 0.6) add('coucher', atSlot(day, `21:${30 + Math.floor(r() * 25)}`), spec.baseFast + 15 + (r() - 0.5) * 60);

    // Hypo occasionnelle
    if (r() < 0.05)
      add('autre', atSlot(day, '17:20'), 58 + r() * 8, {
        feelings: ['transpiration', 'vertiges'],
        note: 'Long trajet en taxi-bus sans manger',
      });

    // Prises de médicaments (≈ 88 % d'observance)
    for (const m of meds) {
      for (const slot of m.times) {
        const at = atSlot(day, slot);
        if (at > now) continue;
        if (r() < 0.88) {
          const lid = demoId('log');
          T.medication_logs[lid] = {
            id: lid,
            patient_id: spec.id,
            medication_id: m.id,
            day: dayKey(day),
            slot,
            taken_at: new Date(at.getTime() + r() * 40 * 60000).toISOString(),
            created_at: at.toISOString(),
            updated_at: at.toISOString(),
          } satisfies MedicationLog;
        }
      }
    }

    // Poids et tension : une fois par semaine
    if (d % 7 === 0) {
      const at = atSlot(day, '08:00');
      const vid = demoId('vit');
      T.vitals[vid] = {
        id: vid,
        patient_id: spec.id,
        measured_at: at.toISOString(),
        weight_kg: Math.round((78 - (spec.days - d) * 0.02 + (r() - 0.5)) * 10) / 10,
        sys: Math.round(132 + (r() - 0.5) * 16),
        dia: Math.round(84 + (r() - 0.5) * 10),
        deleted_at: null,
        created_at: at.toISOString(),
        updated_at: at.toISOString(),
      } satisfies Vital;
    }
  }

  const appt = (kind: Appointment['kind'], title: string, inDays: number, hour: string, place: string, doctor: string | null, done: boolean) => {
    const at = atSlot(addDays(today, inDays), hour).toISOString();
    const id = demoId('rdv');
    T.appointments[id] = {
      id,
      patient_id: spec.id,
      kind,
      title,
      at,
      place,
      doctor,
      note: null,
      done,
      deleted_at: null,
      created_at: created,
      updated_at: created,
    };
  };
  appt('consultation', 'Consultation diabétologie', 5, '09:30', 'Cliniques Universitaires de Kinshasa', 'Dr Kabeya', false);
  appt('labo', 'Analyse HbA1c', 12, '07:30', 'Laboratoire — Hôpital du Cinquantenaire', null, false);
  appt('consultation', 'Contrôle des pieds', -20, '10:00', 'Centre de santé de Lemba', 'Infirmier Mvula', true);
}

function profile(id: string, role: Profile['role'], full_name: string, phone: string): Profile {
  const t = addDays(new Date(), -120).toISOString();
  return { id, role, full_name, phone, language: 'fr', created_at: t, updated_at: t };
}

function medical(patient_id: string, over: Partial<MedicalProfile>): MedicalProfile {
  const t = addDays(new Date(), -120).toISOString();
  return {
    patient_id,
    birth_year: 1962,
    sex: 'F',
    diabetes_type: 'type2',
    diagnosis_year: 2015,
    treatments: ['Metformine'],
    allergies: [],
    other_allergy: null,
    meals_per_day: 2,
    usual_foods: ['fufu', 'pondu', 'poisson', 'riz'],
    activity: 'faible',
    blood_group: 'O+',
    emergency_name: 'Patrick (fils)',
    emergency_phone: '+243810000003',
    target_min: 70,
    target_max: 180,
    unit: 'g/L',
    share_readings: true,
    share_alerts: true,
    share_profile: true,
    created_at: t,
    updated_at: t,
    ...over,
  };
}

export function buildDemoDb(): LocalDb {
  counter = 0;
  const db = emptyDb();
  const T = db.tables;

  for (const p of [
    profile(DEMO_PATIENT, 'patient', 'Maman Thérèse Mbuyi', '+243810000001'),
    profile(DEMO_PATIENT_2, 'patient', 'Papa Jean Mbuyi', '+243810000002'),
    profile(DEMO_CAREGIVER, 'accompagnateur', 'Patrick Mbuyi', '+243810000003'),
  ])
    T.profiles[p.id] = p;

  T.medical_profiles[DEMO_PATIENT] = medical(DEMO_PATIENT, {
    treatments: ['Metformine', 'Gliclazide'],
    allergies: ['Pénicilline'],
  });
  T.medical_profiles[DEMO_PATIENT_2] = medical(DEMO_PATIENT_2, {
    birth_year: 1958,
    sex: 'M',
    diagnosis_year: 2019,
    blood_group: 'A+',
    emergency_name: 'Patrick (fils)',
    share_profile: false, // montre le respect de la confidentialité côté accompagnateur
  });

  genPatient(db, {
    id: DEMO_PATIENT,
    days: 95,
    seed: 42,
    baseFast: 136,
    meds: [
      { name: 'Metformine', dose: '500 mg', times: ['07:00', '19:00'] },
      { name: 'Gliclazide', dose: '30 mg', times: ['08:00'] },
    ],
  });
  genPatient(db, {
    id: DEMO_PATIENT_2,
    days: 40,
    seed: 7,
    baseFast: 150,
    meds: [{ name: 'Metformine', dose: '850 mg', times: ['08:00', '20:00'] }],
  });

  const linkT = addDays(new Date(), -60).toISOString();
  for (const pid of [DEMO_PATIENT, DEMO_PATIENT_2]) {
    const id = demoId('link');
    T.care_links[id] = {
      id,
      patient_id: pid,
      caregiver_id: DEMO_CAREGIVER,
      status: 'active',
      created_at: linkT,
      updated_at: linkT,
    } satisfies CareLink;
  }

  const msgs: [string, string, string, number][] = [
    [DEMO_CAREGIVER, DEMO_PATIENT, 'Mbote Mama ! Ozali malamu lelo ?', 26],
    [DEMO_PATIENT, DEMO_CAREGIVER, 'Nazali malamu, mwana na ngai. 1,18 ce matin 🙏', 25.5],
    [DEMO_CAREGIVER, DEMO_PATIENT, "Très bien ! N'oublie pas la Metformine ce soir.", 25],
    [DEMO_PATIENT, DEMO_CAREGIVER, "J'ai pris mon médicament ✅", 3],
    [DEMO_CAREGIVER, DEMO_PATIENT_2, 'Papa, as-tu mesuré ta glycémie ?', 5],
  ];
  for (const [from, to, body, hoursAgo] of msgs) {
    const at = new Date(Date.now() - hoursAgo * 3600000).toISOString();
    const id = demoId('msg');
    T.messages[id] = {
      id,
      sender_id: from,
      recipient_id: to,
      body,
      created_at: at,
      read_at: hoursAgo > 4 ? at : null,
    } satisfies Message;
  }

  // Les alertes de plus de 2 jours sont déjà « vues » : la démo montre seulement les récentes comme nouvelles.
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 3600000).toISOString();
  db.seenAlerts[DEMO_CAREGIVER] = Object.values(T.glucose_readings)
    .filter((r) => r.measured_at < twoDaysAgo && (r.value_mgdl < 70 || r.value_mgdl > 180))
    .map((r) => r.id);

  return db;
}

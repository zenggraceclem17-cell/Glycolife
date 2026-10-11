// Modèle de données GlycoLife — miroir des tables Supabase (voir supabase/schema.sql).
// Les glycémies sont TOUJOURS stockées en mg/dL.

export type Role = 'patient' | 'accompagnateur' | 'medecin';
export type Language = 'fr' | 'ln';
export type Unit = 'g/L' | 'mg/dL';
export type Moment = 'a_jeun' | 'avant_repas' | 'apres_repas' | 'coucher' | 'autre';
export type Feeling = 'bien' | 'fatigue' | 'vertiges' | 'soif' | 'transpiration' | 'faim';
export type DiabetesType = 'type1' | 'type2' | 'gestationnel' | 'autre' | 'inconnu';
export type Activity = 'faible' | 'moderee' | 'elevee';
export type LinkStatus = 'active' | 'revoked';

export interface Timestamps {
  created_at: string;
  updated_at: string;
}

export interface Profile extends Timestamps {
  id: string;
  role: Role;
  full_name: string;
  phone: string | null;
  language: Language;
}

export interface MedicalProfile extends Timestamps {
  patient_id: string;
  birth_year: number | null;
  sex: 'F' | 'M' | null;
  diabetes_type: DiabetesType | null;
  diagnosis_year: number | null;
  treatments: string[];
  allergies: string[];
  other_allergy: string | null;
  meals_per_day: number | null;
  usual_foods: string[];
  activity: Activity | null;
  blood_group: string | null;
  emergency_name: string | null;
  emergency_phone: string | null;
  target_min: number;
  target_max: number;
  unit: Unit;
  share_readings: boolean;
  share_alerts: boolean;
  share_profile: boolean;
}

export interface GlucoseReading extends Timestamps {
  id: string;
  patient_id: string;
  value_mgdl: number;
  moment: Moment;
  feelings: Feeling[];
  meal: string | null;
  note: string | null;
  measured_at: string;
  deleted_at: string | null;
}

export interface CareLink extends Timestamps {
  id: string;
  patient_id: string;
  caregiver_id: string;
  status: LinkStatus;
}

export interface Invite {
  id: string;
  patient_id: string;
  code: string;
  expires_at: string;
  used_at: string | null;
  used_by: string | null;
  created_at: string;
}

export interface DoctorLink extends Timestamps {
  id: string;
  patient_id: string;
  doctor_id: string;
  status: LinkStatus;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

export interface MealItem {
  food_id: string;
  name: string;
  portions: number;
  carbs: number;
}

export interface Meal extends Timestamps {
  id: string;
  patient_id: string;
  eaten_at: string;
  items: MealItem[];
  carbs_total: number;
  note: string | null;
  deleted_at: string | null;
}

export interface Medication extends Timestamps {
  id: string;
  patient_id: string;
  name: string;
  dose: string;
  times: string[]; // "HH:MM"
  active: boolean;
  deleted_at: string | null;
}

export interface MedicationLog extends Timestamps {
  id: string; // déterministe : medication_id + jour + créneau
  patient_id: string;
  medication_id: string;
  day: string; // YYYY-MM-DD
  slot: string; // HH:MM
  taken_at: string | null; // null = décoché
}

export interface Appointment extends Timestamps {
  id: string;
  patient_id: string;
  kind: 'consultation' | 'labo';
  title: string;
  at: string;
  place: string | null;
  doctor: string | null;
  note: string | null;
  done: boolean;
  deleted_at: string | null;
}

export interface Vital extends Timestamps {
  id: string;
  patient_id: string;
  measured_at: string;
  weight_kg: number | null;
  sys: number | null;
  dia: number | null;
  deleted_at: string | null;
}

/** Résumé d'un proche suivi, renvoyé par la RPC `linked_patients()` (accompagnateur). */
export interface LinkedPatient {
  patient_id: string;
  full_name: string;
  phone: string | null;
  target_min: number;
  target_max: number;
  share_readings: boolean;
  share_alerts: boolean;
  share_profile: boolean;
}

export interface Tables {
  profiles: Profile;
  medical_profiles: MedicalProfile;
  glucose_readings: GlucoseReading;
  care_links: CareLink;
  invites: Invite;
  doctor_links: DoctorLink;
  messages: Message;
  meals: Meal;
  medications: Medication;
  medication_logs: MedicationLog;
  appointments: Appointment;
  vitals: Vital;
}

export type TableName = keyof Tables;

export const TABLES: TableName[] = [
  'profiles',
  'medical_profiles',
  'glucose_readings',
  'care_links',
  'invites',
  'doctor_links',
  'messages',
  'meals',
  'medications',
  'medication_logs',
  'appointments',
  'vitals',
];

/** Colonne clé primaire de chaque table. */
export const KEY: Record<TableName, string> = {
  profiles: 'id',
  medical_profiles: 'patient_id',
  glucose_readings: 'id',
  care_links: 'id',
  invites: 'id',
  doctor_links: 'id',
  messages: 'id',
  meals: 'id',
  medications: 'id',
  medication_logs: 'id',
  appointments: 'id',
  vitals: 'id',
};

export function keyOf<T extends TableName>(table: T, row: Tables[T]): string {
  return (row as unknown as Record<string, string>)[KEY[table]];
}

export type OutboxOp =
  | { opId: string; table: TableName; kind: 'upsert'; row: Record<string, unknown>; attempts: number }
  | { opId: string; table: TableName; kind: 'insert'; row: Record<string, unknown>; attempts: number }
  | {
      opId: string;
      table: TableName;
      kind: 'update';
      key: string;
      patch: Record<string, unknown>;
      attempts: number;
    };

export interface LocalDb {
  version: 1;
  tables: { [K in TableName]: Record<string, Tables[K]> };
  outbox: OutboxOp[];
  linkedPatients: LinkedPatient[] | null; // null en mode démo : calculé localement
  seenAlerts: Record<string, string[]>; // par utilisateur : ids des alertes vues
  readLessons: Record<string, string[]>; // par utilisateur : fiches lues
  lastSyncAt: string | null;
}

export function emptyDb(): LocalDb {
  const tables = {} as LocalDb['tables'];
  for (const t of TABLES) (tables as Record<string, object>)[t] = {};
  return {
    version: 1,
    tables,
    outbox: [],
    linkedPatients: null,
    seenAlerts: {},
    readLessons: {},
    lastSyncAt: null,
  };
}

export interface Session {
  mode: 'demo' | 'supabase';
  userId: string;
  role: Role;
  fullName: string;
  email: string | null;
}

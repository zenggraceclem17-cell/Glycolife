// Actions métier. Règle D7 : seul le patient modifie ses données médicales —
// chaque action d'écriture médicale vérifie que l'utilisateur courant est le patient.
import { useMemo } from 'react';

import { dayKey, nowIso } from '@/lib/dates';
import { inviteCode, uuid } from '@/lib/ids';
import { findLog, medicalOf } from './selectors';
import { useData } from './store';
import type {
  Appointment,
  Feeling,
  GlucoseReading,
  Invite,
  MealItem,
  MedicalProfile,
  Medication,
  Moment,
  Vital,
} from './types';

export function useActions() {
  const { session, db, upsert, insert, update } = useData();

  return useMemo(() => {
    const me = session?.userId ?? '';
    const isPatient = session?.role === 'patient';
    const guard = () => {
      if (!isPatient) throw new Error('Lecture seule : seul le patient peut modifier ses données.');
    };
    const stamp = () => {
      const t = nowIso();
      return { created_at: t, updated_at: t };
    };

    return {
      addReading(input: { value_mgdl: number; moment: Moment; feelings: Feeling[]; meal: string | null; note: string | null; measured_at: string }): GlucoseReading {
        guard();
        const row: GlucoseReading = { id: uuid(), patient_id: me, deleted_at: null, ...stamp(), ...input };
        upsert('glucose_readings', row);
        return row;
      },
      deleteReading(id: string) {
        guard();
        const t = nowIso();
        update('glucose_readings', id, { deleted_at: t, updated_at: t });
      },

      saveMedical(patch: Partial<MedicalProfile>) {
        guard();
        const cur = medicalOf(db, me);
        const t = nowIso();
        upsert('medical_profiles', {
          ...cur,
          ...patch,
          patient_id: me,
          created_at: db.tables.medical_profiles[me]?.created_at ?? t,
          updated_at: t,
        });
      },

      toggleDose(medicationId: string, day: Date, slot: string) {
        guard();
        const k = dayKey(day);
        const existing = findLog(db, medicationId, k, slot);
        const t = nowIso();
        if (existing) upsert('medication_logs', { ...existing, taken_at: existing.taken_at ? null : t, updated_at: t });
        else upsert('medication_logs', { id: uuid(), patient_id: me, medication_id: medicationId, day: k, slot, taken_at: t, ...stamp() });
      },
      saveMedication(m: Omit<Medication, 'patient_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'id'> & { id?: string }) {
        guard();
        const prev = m.id ? db.tables.medications[m.id] : undefined;
        const t = nowIso();
        upsert('medications', {
          ...m,
          id: m.id ?? uuid(),
          patient_id: me,
          deleted_at: null,
          created_at: prev?.created_at ?? t,
          updated_at: t,
        });
      },
      deleteMedication(id: string) {
        guard();
        const cur = db.tables.medications[id];
        if (cur) upsert('medications', { ...cur, deleted_at: nowIso(), active: false, updated_at: nowIso() });
      },

      addMeal(items: MealItem[], eaten_at: string, note: string | null) {
        guard();
        upsert('meals', {
          id: uuid(),
          patient_id: me,
          eaten_at,
          items,
          carbs_total: items.reduce((s, i) => s + i.carbs * i.portions, 0),
          note,
          deleted_at: null,
          ...stamp(),
        });
      },
      deleteMeal(id: string) {
        guard();
        const cur = db.tables.meals[id];
        if (cur) upsert('meals', { ...cur, deleted_at: nowIso(), updated_at: nowIso() });
      },

      saveAppointment(a: Omit<Appointment, 'patient_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'id'> & { id?: string }) {
        guard();
        const prev = a.id ? db.tables.appointments[a.id] : undefined;
        const t = nowIso();
        upsert('appointments', { ...a, id: a.id ?? uuid(), patient_id: me, deleted_at: null, created_at: prev?.created_at ?? t, updated_at: t });
      },
      setAppointmentDone(id: string, done: boolean) {
        guard();
        const cur = db.tables.appointments[id];
        if (cur) upsert('appointments', { ...cur, done, updated_at: nowIso() });
      },
      deleteAppointment(id: string) {
        guard();
        const cur = db.tables.appointments[id];
        if (cur) upsert('appointments', { ...cur, deleted_at: nowIso(), updated_at: nowIso() });
      },

      addVital(v: Pick<Vital, 'weight_kg' | 'sys' | 'dia' | 'measured_at'>) {
        guard();
        upsert('vitals', { id: uuid(), patient_id: me, deleted_at: null, ...stamp(), ...v });
      },
      deleteVital(id: string) {
        guard();
        const cur = db.tables.vitals[id];
        if (cur) upsert('vitals', { ...cur, deleted_at: nowIso(), updated_at: nowIso() });
      },

      createInvite(): Invite {
        guard();
        const t = new Date();
        const row: Invite = {
          id: uuid(),
          patient_id: me,
          code: inviteCode(),
          expires_at: new Date(t.getTime() + 24 * 3600000).toISOString(),
          used_at: null,
          used_by: null,
          created_at: t.toISOString(),
        };
        insert('invites', row);
        return row;
      },
      revokeCaregiver(linkId: string) {
        guard();
        update('care_links', linkId, { status: 'revoked', updated_at: nowIso() });
      },

      // Messagerie (patient, accompagnateur, médecin)
      sendMessage(to: string, body: string) {
        insert('messages', { id: uuid(), sender_id: me, recipient_id: to, body, created_at: nowIso(), read_at: null });
      },
      markConversationRead(peer: string) {
        const t = nowIso();
        for (const m of Object.values(db.tables.messages)) {
          if (m.recipient_id === me && m.sender_id === peer && !m.read_at) update('messages', m.id, { read_at: t });
        }
      },
    };
  }, [session, db, upsert, insert, update]);
}

import { useState } from 'react';
import { View } from 'react-native';

import { AppointmentLine } from '@/components/health';
import { Button, Card, Chip, Field, IconButton, Row, Screen, SectionTitle, T } from '@/components/ui';
import { useActions } from '@/data/actions';
import { appointmentsOf } from '@/data/selectors';
import { useData, useSession } from '@/data/store';
import type { Appointment } from '@/data/types';
import { addDays, atSlot, fmtDateNumeric, isValidSlot, startOfDay } from '@/lib/dates';
import { confirmAsk } from '@/lib/dialog';
import { useTheme } from '@/theme/settings';

function parseDate(text: string): Date | null {
  const m = text.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return d.getDate() === Number(m[1]) ? d : null;
}

interface Draft {
  id?: string;
  kind: Appointment['kind'];
  title: string;
  date: string;
  time: string;
  place: string;
  doctor: string;
}

const EMPTY: Draft = { kind: 'consultation', title: '', date: fmtDateNumeric(addDays(new Date(), 7)), time: '09:00', place: '', doctor: '' };

export default function RendezVous() {
  const { c } = useTheme();
  const { db } = useData();
  const session = useSession();
  const actions = useActions();
  const list = appointmentsOf(db, session.userId);
  const today = startOfDay(new Date()).toISOString();
  const upcoming = list.filter((a) => !a.done && a.at >= today);
  const past = list.filter((a) => a.done || a.at < today).reverse();
  const [draft, setDraft] = useState<Draft | null>(null);

  const date = draft ? parseDate(draft.date) : null;
  const ok = !!draft && !!date && isValidSlot(draft.time);

  const save = () => {
    if (!draft || !date || !ok) return;
    actions.saveAppointment({
      id: draft.id,
      kind: draft.kind,
      title: draft.title.trim() || (draft.kind === 'labo' ? 'Analyse de laboratoire' : 'Consultation'),
      at: atSlot(date, draft.time).toISOString(),
      place: draft.place.trim() || null,
      doctor: draft.doctor.trim() || null,
      note: null,
      done: false,
    });
    setDraft(null);
  };

  const row = (a: Appointment) => (
    <Card key={a.id} style={a.done ? { opacity: 0.7 } : undefined}>
      <AppointmentLine a={a} />
      {a.doctor ? <T v="small" muted>Avec {a.doctor}</T> : null}
      <Row style={{ justifyContent: 'flex-end' }}>
        <Button small variant={a.done ? 'secondary' : 'success'} icon={a.done ? 'arrow-undo' : 'checkmark'} label={a.done ? 'Pas encore fait' : 'Marquer comme fait'} onPress={() => actions.setAppointmentDone(a.id, !a.done)} />
        <IconButton
          icon="create-outline"
          label="Modifier"
          onPress={() => {
            const d = new Date(a.at);
            setDraft({ id: a.id, kind: a.kind, title: a.title, date: fmtDateNumeric(d), time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`, place: a.place ?? '', doctor: a.doctor ?? '' });
          }}
        />
        <IconButton icon="trash-outline" color={c.danger} label="Supprimer" onPress={() => confirmAsk('Supprimer ce rendez-vous ?', a.title, 'Supprimer', () => actions.deleteAppointment(a.id))} />
      </Row>
    </Card>
  );

  return (
    <Screen>
      {!draft ? <Button big icon="add" label="Ajouter un rendez-vous" onPress={() => setDraft(EMPTY)} /> : null}
      {draft ? (
        <Card tone="primary">
          <Row>
            <Chip label="Consultation" selected={draft.kind === 'consultation'} onPress={() => setDraft({ ...draft, kind: 'consultation' })} />
            <Chip label="Analyse (labo)" selected={draft.kind === 'labo'} onPress={() => setDraft({ ...draft, kind: 'labo' })} />
          </Row>
          <Field label="Quoi ?" value={draft.title} onChangeText={(title) => setDraft({ ...draft, title })} placeholder={draft.kind === 'labo' ? 'Ex. HbA1c, glycémie à jeun' : 'Ex. Diabétologue'} />
          <Row>
            <View style={{ flex: 3 }}>
              <Field label="Date (JJ/MM/AAAA)" value={draft.date} onChangeText={(v) => setDraft({ ...draft, date: v })} keyboardType="numbers-and-punctuation" />
            </View>
            <View style={{ flex: 2 }}>
              <Field label="Heure" value={draft.time} onChangeText={(v) => setDraft({ ...draft, time: v })} keyboardType="numbers-and-punctuation" />
            </View>
          </Row>
          <Field label="Lieu" value={draft.place} onChangeText={(place) => setDraft({ ...draft, place })} placeholder="Ex. Cliniques Universitaires" />
          <Field label="Médecin (facultatif)" value={draft.doctor} onChangeText={(doctor) => setDraft({ ...draft, doctor })} />
          {!ok ? <T v="small" color={c.danger}>Vérifiez la date (JJ/MM/AAAA) et l’heure (HH:MM).</T> : null}
          <Row>
            <Button style={{ flex: 1 }} variant="secondary" label="Annuler" onPress={() => setDraft(null)} />
            <Button style={{ flex: 1 }} label="Enregistrer" icon="checkmark" disabled={!ok} onPress={save} />
          </Row>
        </Card>
      ) : null}
      <SectionTitle>À venir</SectionTitle>
      {upcoming.length ? upcoming.map(row) : <T muted>Aucun rendez-vous prévu.</T>}
      <SectionTitle>Passés et faits</SectionTitle>
      {past.length ? past.map(row) : <T muted>—</T>}
    </Screen>
  );
}

import { useState } from 'react';
import { View } from 'react-native';

import { DoseList } from '@/components/health';
import { Button, Card, Chip, Field, IconButton, Notice, Row, Screen, SectionTitle, Stat, T } from '@/components/ui';
import { useActions } from '@/data/actions';
import { adherence7, dosesOfDay, medicationsOf } from '@/data/selectors';
import { useData, useSession } from '@/data/store';
import type { Medication } from '@/data/types';
import { isValidSlot } from '@/lib/dates';
import { confirmAsk } from '@/lib/dialog';
import { useTheme } from '@/theme/settings';

const PRESET_TIMES = ['07:00', '08:00', '12:00', '13:00', '19:00', '20:00', '21:00'];

export default function Traitements() {
  const { c } = useTheme();
  const { db } = useData();
  const session = useSession();
  const actions = useActions();
  const me = session.userId;
  const meds = medicationsOf(db, me);
  const adh = adherence7(db, me);
  const [editing, setEditing] = useState<Partial<Medication> | null>(null);
  const [customTime, setCustomTime] = useState('');

  const times = editing?.times ?? [];
  const canSave = !!editing?.name?.trim() && times.length > 0;

  const save = () => {
    if (!editing || !canSave) return;
    actions.saveMedication({
      id: editing.id,
      name: editing.name!.trim(),
      dose: editing.dose?.trim() ?? '',
      times: [...times].sort(),
      active: editing.active ?? true,
    });
    setEditing(null);
  };

  return (
    <Screen>
      <Notice icon="medkit-outline">Ne modifiez jamais un traitement sans l’avis de votre médecin. GlycoLife vous aide seulement à ne pas oublier.</Notice>
      <Row>
        <Stat label="Prises respectées (7 j)" value={adh === null ? '—' : `${adh}%`} color={adh !== null && adh >= 80 ? c.success : c.warning} />
        <Stat label="Médicaments actifs" value={String(meds.filter((m) => m.active).length)} />
      </Row>

      <SectionTitle>Aujourd’hui</SectionTitle>
      <Card>
        <DoseList doses={dosesOfDay(db, me)} onToggle={(d) => actions.toggleDose(d.med.id, new Date(), d.slot)} />
      </Card>

      <SectionTitle right={!editing ? <Button small icon="add" label="Ajouter" onPress={() => setEditing({ times: [], active: true })} /> : null}>
        Mes médicaments
      </SectionTitle>

      {editing ? (
        <Card tone="primary">
          <Field label="Nom du médicament" value={editing.name ?? ''} onChangeText={(name) => setEditing({ ...editing, name })} placeholder="Ex. Metformine" />
          <Field label="Dose" value={editing.dose ?? ''} onChangeText={(dose) => setEditing({ ...editing, dose })} placeholder="Ex. 500 mg, 1 comprimé" />
          <T v="bodyBold">Heures de prise</T>
          <Row style={{ flexWrap: 'wrap' }}>
            {[...new Set([...PRESET_TIMES, ...times])].sort().map((h) => (
              <Chip
                key={h}
                label={h}
                selected={times.includes(h)}
                onPress={() => setEditing({ ...editing, times: times.includes(h) ? times.filter((x) => x !== h) : [...times, h] })}
              />
            ))}
          </Row>
          <Row>
            <View style={{ flex: 1 }}>
              <Field label="Autre heure (HH:MM)" value={customTime} onChangeText={setCustomTime} placeholder="06:30" keyboardType="numbers-and-punctuation" />
            </View>
            <Button
              small
              label="Ajouter"
              disabled={!isValidSlot(customTime)}
              onPress={() => {
                setEditing({ ...editing, times: [...new Set([...times, customTime])] });
                setCustomTime('');
              }}
            />
          </Row>
          <Row>
            <Button style={{ flex: 1 }} variant="secondary" label="Annuler" onPress={() => setEditing(null)} />
            <Button style={{ flex: 1 }} label="Enregistrer" icon="checkmark" disabled={!canSave} onPress={save} />
          </Row>
        </Card>
      ) : null}

      {meds.map((m) => (
        <Card key={m.id}>
          <Row>
            <View style={{ flex: 1 }}>
              <T v="bodyBold" color={m.active ? undefined : c.textMuted}>
                {m.name} {m.dose ? `· ${m.dose}` : ''}
              </T>
              <T v="small" muted>
                {m.times.join(' · ')} {m.active ? '' : '(arrêté)'}
              </T>
            </View>
            <IconButton icon="create-outline" label={`Modifier ${m.name}`} onPress={() => setEditing(m)} />
            <IconButton
              icon={m.active ? 'pause-outline' : 'play-outline'}
              label={m.active ? 'Arrêter' : 'Reprendre'}
              onPress={() => actions.saveMedication({ ...m, active: !m.active })}
            />
            <IconButton
              icon="trash-outline"
              color={c.danger}
              label={`Supprimer ${m.name}`}
              onPress={() => confirmAsk(`Supprimer ${m.name} ?`, 'Les prises déjà cochées restent dans l’historique.', 'Supprimer', () => actions.deleteMedication(m.id))}
            />
          </Row>
        </Card>
      ))}
    </Screen>
  );
}

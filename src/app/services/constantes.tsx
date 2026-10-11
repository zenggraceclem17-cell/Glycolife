import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Card, Field, Row, Screen, SectionTitle, T } from '@/components/ui';
import { VitalsCharts } from '@/components/VitalsCharts';
import { useActions } from '@/data/actions';
import { vitalsOf } from '@/data/selectors';
import { useData, useSession } from '@/data/store';
import { fmtDayLabel, fmtTime } from '@/lib/dates';
import { confirmAsk } from '@/lib/dialog';
import { fmtNumber, parseNumber } from '@/lib/glucose';
import { useTheme } from '@/theme/settings';
import { radius, space } from '@/theme/tokens';

export default function Constantes() {
  const { c } = useTheme();
  const { db } = useData();
  const session = useSession();
  const actions = useActions();
  const vitals = vitalsOf(db, session.userId);
  const [w, setW] = useState('');
  const [sys, setSys] = useState('');
  const [dia, setDia] = useState('');

  const weight = parseNumber(w);
  const s = parseNumber(sys);
  const d = parseNumber(dia);
  const weightOk = weight === null || (weight >= 20 && weight <= 300);
  const bpGiven = s !== null || d !== null;
  const bpOk = !bpGiven || (s !== null && d !== null && s >= 60 && s <= 260 && d >= 30 && d <= 160 && s > d);
  const ok = (weight !== null || bpGiven) && weightOk && bpOk;

  const save = () => {
    actions.addVital({
      weight_kg: weight === null ? null : Math.round(weight * 10) / 10,
      sys: bpGiven ? Math.round(s!) : null,
      dia: bpGiven ? Math.round(d!) : null,
      measured_at: new Date().toISOString(),
    });
    setW('');
    setSys('');
    setDia('');
  };

  return (
    <Screen>
      <Card>
        <Field label="Poids (kg)" value={w} onChangeText={setW} keyboardType="decimal-pad" placeholder="Ex. 76,5" />
        <T v="bodyBold">Tension (mmHg)</T>
        <Row>
          <View style={{ flex: 1 }}>
            <Field label="Haute (systolique)" value={sys} onChangeText={setSys} keyboardType="number-pad" placeholder="130" />
          </View>
          <T v="h2">/</T>
          <View style={{ flex: 1 }}>
            <Field label="Basse (diastolique)" value={dia} onChangeText={setDia} keyboardType="number-pad" placeholder="80" />
          </View>
        </Row>
        {!weightOk || !bpOk ? <T v="small" color={c.danger}>Vérifiez les valeurs saisies.</T> : null}
        {bpOk && s !== null && d !== null ? (
          <T v="small" color={s < 130 && d < 80 ? c.success : c.warning}>
            {s < 130 && d < 80 ? '✓ Sous le repère de 130/80 mmHg.' : '⬆ Au-dessus du repère de 130/80 mmHg : parlez-en à votre médecin.'}
          </T>
        ) : null}
        <Button label="Enregistrer" icon="checkmark" big disabled={!ok} onPress={save} />
      </Card>

      <VitalsCharts vitals={vitals} />

      <SectionTitle>Historique</SectionTitle>
      {[...vitals].reverse().slice(0, 15).map((v) => (
        <Pressable
          key={v.id}
          onLongPress={() => confirmAsk('Supprimer cette mesure ?', fmtDayLabel(v.measured_at), 'Supprimer', () => actions.deleteVital(v.id))}
          style={{ padding: space.md, borderRadius: radius.md, backgroundColor: c.surfaceAlt, flexDirection: 'row', justifyContent: 'space-between' }}>
          <T>
            {fmtDayLabel(v.measured_at)} {fmtTime(v.measured_at)}
          </T>
          <T v="bodyBold">
            {[v.weight_kg !== null ? `${fmtNumber(v.weight_kg, 1)} kg` : null, v.sys !== null ? `${v.sys}/${v.dia} mmHg` : null].filter(Boolean).join(' · ')}
          </T>
        </Pressable>
      ))}
    </Screen>
  );
}

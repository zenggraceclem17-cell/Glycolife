// Blocs du carnet de santé partagés (patient : interactifs ; accompagnateur : lecture seule).
import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { analyser } from '@/ai';
import type { Dose } from '@/data/selectors';
import type { Appointment, GlucoseReading, MedicalProfile } from '@/data/types';
import { useT } from '@/i18n';
import { daysUntil, fmtDate, fmtTime } from '@/lib/dates';
import { useTheme } from '@/theme/settings';
import { radius, space } from '@/theme/tokens';
import { Card, Row, T } from './ui';

const DOSE_LABEL = { pris: 'Pris', a_prendre: 'À prendre', en_retard: 'En retard' } as const;

export function DoseList({ doses, onToggle }: { doses: Dose[]; onToggle?: (d: Dose) => void }) {
  const { c, fs } = useTheme();
  const t = useT();
  if (doses.length === 0) return <T muted>{t('no_meds')}</T>;
  return (
    <View style={{ gap: space.xs }}>
      {doses.map((d) => {
        const col = d.status === 'pris' ? c.success : d.status === 'en_retard' ? c.danger : c.textMuted;
        const content = (
          <Row gap={space.md} style={{ paddingVertical: 6 }}>
            <Ionicons
              name={d.status === 'pris' ? 'checkmark-circle' : d.status === 'en_retard' ? 'alert-circle-outline' : 'ellipse-outline'}
              size={fs(30)}
              color={col}
            />
            <View style={{ flex: 1 }}>
              <T v="bodyBold">
                {d.slot} · {d.med.name}
              </T>
              <T v="small" muted>
                {d.med.dose}
              </T>
            </View>
            <View style={{ borderWidth: 1.5, borderColor: col, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 }}>
              <T v="caption" color={col}>
                {DOSE_LABEL[d.status]}
              </T>
            </View>
          </Row>
        );
        return onToggle ? (
          <Pressable
            key={`${d.med.id}${d.slot}`}
            onPress={() => onToggle(d)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: d.status === 'pris' }}
            accessibilityLabel={`${d.med.name} ${d.slot}`}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            {content}
          </Pressable>
        ) : (
          <View key={`${d.med.id}${d.slot}`}>{content}</View>
        );
      })}
    </View>
  );
}

export function AppointmentLine({ a }: { a: Appointment | null }) {
  const t = useT();
  const { c, fs } = useTheme();
  if (!a) return <T muted>{t('no_appointment')}</T>;
  const n = daysUntil(a.at);
  const when = n === 0 ? t('today') : n === 1 ? t('tomorrow') : t('in_days', { n });
  return (
    <Row gap={space.md} style={{ alignItems: 'flex-start' }}>
      <Ionicons name={a.kind === 'labo' ? 'flask-outline' : 'calendar-outline'} size={fs(28)} color={c.primary} />
      <View style={{ flex: 1 }}>
        <T v="bodyBold">{a.title}</T>
        <T v="small" muted>
          {fmtDate(a.at)} · {fmtTime(a.at)}
          {a.place ? ` · ${a.place}` : ''}
        </T>
        <T v="small" color={c.primary}>
          {when}
        </T>
      </View>
    </Row>
  );
}

/** Encart alimenté par le module IA locale ; « bientôt » tant qu'il n'est pas branché. */
export function AnalysisCard({ readings, medical }: { readings: GlucoseReading[]; medical: MedicalProfile | null }) {
  const t = useT();
  const { c, fs } = useTheme();
  const res = analyser(readings, medical);
  const riskCol = res ? { faible: c.success, modere: c.warning, eleve: c.danger }[res.niveauRisque] : c.textMuted;
  return (
    <Card>
      <Row>
        <Ionicons name="sparkles-outline" size={fs(22)} color={c.primary} />
        <T v="h2">{t('smart_analysis')}</T>
      </Row>
      {res ? (
        <>
          <T v="bodyBold" color={riskCol}>
            Risque {res.niveauRisque}
          </T>
          <T>{res.resume}</T>
          {res.tendance ? <T muted>{res.tendance}</T> : null}
          {res.conseils?.map((x) => (
            <T key={x}>• {x}</T>
          ))}
          <T v="caption" muted>
            {t('disclaimer')}
          </T>
        </>
      ) : (
        <T muted>{t('smart_soon')}</T>
      )}
    </Card>
  );
}

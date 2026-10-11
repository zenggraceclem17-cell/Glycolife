// Fiche du proche — LECTURE SEULE, filtrée selon les choix de confidentialité du patient.
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Linking, View } from 'react-native';

import { LastReadingCard, ReportsView } from '@/components/glucose';
import { AppointmentLine, DoseList } from '@/components/health';
import { Button, Card, EmptyState, Notice, Row, Screen, SectionTitle, Stat, T } from '@/components/ui';
import { VitalsCharts } from '@/components/VitalsCharts';
import { MEAL_LOAD_LABEL, mealLoad } from '@/data/foods';
import {
  adherence7,
  dosesOfDay,
  linkedPatients,
  mealsOf,
  medicalOf,
  nextAppointment,
  visibleReadings,
  vitalsOf,
} from '@/data/selectors';
import { useData, useSession } from '@/data/store';
import { useT } from '@/i18n';
import { fmtDayLabel, fmtTime } from '@/lib/dates';
import { fmtGlucose, fmtNumber } from '@/lib/glucose';
import { useSettings, useTheme } from '@/theme/settings';
import { space } from '@/theme/tokens';

const TYPE = { type1: 'Type 1', type2: 'Type 2', gestationnel: 'Gestationnel', autre: 'Autre', inconnu: 'Inconnu' } as const;
const ACT = { faible: 'Faible', moderee: 'Modérée', elevee: 'Élevée' } as const;

export default function Proche() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const { c } = useTheme();
  const { settings } = useSettings();
  const { db } = useData();
  const session = useSession();
  const p = linkedPatients(db, session.userId).find((x) => x.patient_id === id);
  const readings = useMemo(() => (p ? visibleReadings(db, p) : []), [db, p]);

  if (!p)
    return (
      <Screen>
        <EmptyState icon="lock-closed-outline" title="Accès indisponible" hint="Ce lien n’est plus actif." />
      </Screen>
    );

  const last = readings[readings.length - 1] ?? null;
  const notShared = <T muted>{t('not_shared', { name: p.full_name })}</T>;
  const m = medicalOf(db, p.patient_id);
  const vitals = vitalsOf(db, p.patient_id);
  const lastVital = vitals[vitals.length - 1];
  const adh = adherence7(db, p.patient_id);

  return (
    <Screen>
      <Stack.Screen options={{ title: p.full_name }} />
      <Notice icon="eye-outline">{t('read_only')} — seul(e) {p.full_name} peut modifier ses données.</Notice>
      <Row>
        <Button style={{ flex: 1 }} variant="secondary" icon="chatbubble-outline" label={t('message')} onPress={() => router.push(`/chat/${p.patient_id}`)} />
        {p.phone ? <Button style={{ flex: 1 }} variant="success" icon="call" label={t('call')} onPress={() => Linking.openURL(`tel:${p.phone}`)} /> : null}
      </Row>

      {p.share_readings || p.share_alerts ? (
        <LastReadingCard reading={last} targetMin={p.target_min} targetMax={p.target_max} />
      ) : (
        <Card>{notShared}</Card>
      )}

      {p.share_profile ? (
        <>
          <SectionTitle>{t('meds_today')}</SectionTitle>
          <Card>
            <DoseList doses={dosesOfDay(db, p.patient_id)} />
            {adh !== null ? (
              <T v="small" muted>
                {t('adherence')} 7 jours : <T v="bodyBold" color={adh >= 80 ? c.success : c.warning}>{adh}%</T>
              </T>
            ) : null}
          </Card>

          <SectionTitle>{t('next_appointment')}</SectionTitle>
          <Card>
            <AppointmentLine a={nextAppointment(db, p.patient_id)} />
          </Card>

          <SectionTitle>{t('weight_bp')}</SectionTitle>
          {lastVital ? (
            <Row>
              {lastVital.weight_kg !== null ? <Stat label="Poids (kg)" value={fmtNumber(lastVital.weight_kg, 1)} /> : null}
              {lastVital.sys !== null ? <Stat label="Tension (mmHg)" value={`${lastVital.sys}/${lastVital.dia}`} /> : null}
              <Stat label="Mesuré" value={fmtDayLabel(lastVital.measured_at)} />
            </Row>
          ) : (
            <T muted>—</T>
          )}
          {vitals.length > 1 ? <VitalsCharts vitals={vitals} /> : null}

          <SectionTitle>{t('meals_recent')}</SectionTitle>
          <Card style={{ gap: space.xs }}>
            {mealsOf(db, p.patient_id)
              .slice(0, 5)
              .map((meal) => (
                <View key={meal.id}>
                  <T v="bodyBold">
                    {fmtDayLabel(meal.eaten_at)} {fmtTime(meal.eaten_at)} · ≈ {meal.carbs_total} g ({MEAL_LOAD_LABEL[mealLoad(meal.carbs_total)].toLowerCase()})
                  </T>
                  <T v="small" muted>
                    {meal.items.map((i) => i.name).join(', ')}
                  </T>
                </View>
              ))}
            {mealsOf(db, p.patient_id).length === 0 ? <T muted>—</T> : null}
          </Card>

          <SectionTitle>{t('medical_summary')}</SectionTitle>
          <Card style={{ gap: 4 }}>
            <T>Diabète : {m.diabetes_type ? TYPE[m.diabetes_type] : '—'}{m.diagnosis_year ? ` depuis ${m.diagnosis_year}` : ''}</T>
            <T>Traitements : {m.treatments.join(', ') || '—'}</T>
            <T>Allergies : {[...m.allergies, ...(m.other_allergy ? [m.other_allergy] : [])].join(', ') || 'aucune connue'}</T>
            <T>Groupe sanguin : {m.blood_group ?? '—'}</T>
            <T>Activité : {m.activity ? ACT[m.activity] : '—'}</T>
            <T>
              Cible : {fmtGlucose(p.target_min, settings.unit, false)} – {fmtGlucose(p.target_max, settings.unit)}
            </T>
            {m.emergency_name ? <T>Contact d’urgence : {m.emergency_name} {m.emergency_phone ?? ''}</T> : null}
          </Card>
        </>
      ) : (
        <>
          <SectionTitle>{t('medical_summary')}</SectionTitle>
          <Card>{notShared}</Card>
        </>
      )}

      <SectionTitle>{t('full_reports')}</SectionTitle>
      {p.share_readings ? (
        <ReportsView readings={readings} targetMin={p.target_min} targetMax={p.target_max} />
      ) : (
        <Card>
          {p.share_alerts ? <T muted>Seules les valeurs hors cible sont partagées (onglet Alertes).</T> : notShared}
        </Card>
      )}
    </Screen>
  );
}

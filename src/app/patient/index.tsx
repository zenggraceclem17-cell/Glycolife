import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { Bubble } from '@/components/chat';
import { GlucoseChart, LastReadingCard } from '@/components/glucose';
import { AnalysisCard, AppointmentLine, DoseList } from '@/components/health';
import { Button, Card, Row, Screen, SectionTitle, Stat, statusColor, T } from '@/components/ui';
import { useActions } from '@/data/actions';
import { dosesOfDay, hasMedical, medicalOf, nextAppointment, readingsOf, readingsSince } from '@/data/selectors';
import { useData, useSession } from '@/data/store';
import { useT } from '@/i18n';
import { comfortFor } from '@/lib/comfort';
import { dayKey, fmtTime } from '@/lib/dates';
import { computeStats, fmtGlucose, statusOf } from '@/lib/glucose';
import { useSettings, useTheme } from '@/theme/settings';
import { space } from '@/theme/tokens';

export default function PatientHome() {
  const t = useT();
  const { c } = useTheme();
  const { settings } = useSettings();
  const { db } = useData();
  const session = useSession();
  const actions = useActions();
  const me = session.userId;

  const medical = medicalOf(db, me);
  const readings = useMemo(() => readingsOf(db, me), [db, me]);
  const last = readings[readings.length - 1] ?? null;
  const week = readingsSince(readings, 7);
  const st = computeStats(week, medical.target_min, medical.target_max);
  const doses = dosesOfDay(db, me);
  const today = readings.filter((r) => dayKey(r.measured_at) === dayKey(new Date()));
  const words = session.fullName.trim().split(/\s+/);
  const firstName = words.length > 1 ? words.slice(0, -1).join(' ') : words[0];

  return (
    <Screen safeTop title={t('hello', { name: firstName || session.fullName })} subtitle={t('tagline')}>
      {!hasMedical(db, me) ? (
        <Card tone="primary" onPress={() => router.push('/dossier')}>
          <T v="bodyBold">{t('medical_record')}</T>
          <T muted>{t('medical_record_desc')}</T>
        </Card>
      ) : null}

      <LastReadingCard reading={last} targetMin={medical.target_min} targetMax={medical.target_max} />

      <Button label={t('add_reading')} icon="add-circle" big onPress={() => router.push('/mesure')} />

      <Card>
        <T v="h2">{t('last_7_days')}</T>
        <GlucoseChart readings={week} days={7} targetMin={medical.target_min} targetMax={medical.target_max} height={190} />
        <Row>
          <Stat label={`${t('avg_7')} (${settings.unit})`} value={st.mean === null ? '—' : fmtGlucose(st.mean, settings.unit, false)} />
          <Stat label={t('in_target')} value={st.pctInTarget === null ? '—' : `${st.pctInTarget}%`} color={c.success} />
          <Stat label={t('readings_count')} value={String(st.count)} />
        </Row>
      </Card>

      <SectionTitle>{t('today_block')}</SectionTitle>
      <Card>
        <T v="bodyBold">{t('meds_today')}</T>
        <DoseList doses={doses} onToggle={(d) => actions.toggleDose(d.med.id, new Date(), d.slot)} />
        <View style={{ height: 1, backgroundColor: c.border, marginVertical: space.sm }} />
        <T v="bodyBold">{t('next_appointment')}</T>
        <AppointmentLine a={nextAppointment(db, me)} />
      </Card>

      <AnalysisCard readings={readings} medical={medical} />

      <SectionTitle>{t('feed_today')}</SectionTitle>
      <View style={{ backgroundColor: c.chatBg, borderRadius: 18, padding: space.md }}>
        {today.length === 0 ? (
          <Bubble side="bot" title={t('glycolife_says')} text={t('feed_empty')} />
        ) : (
          today.map((r) => {
            const s = statusOf(r.value_mgdl, medical.target_min, medical.target_max);
            return (
              <View key={r.id}>
                <Bubble side="mine" time={fmtTime(r.measured_at)} accent={statusColor(c, s)}>
                  <T v="bodyBold" color={statusColor(c, s)}>
                    {fmtGlucose(r.value_mgdl, settings.unit)} · {t(`status_${s}`)}
                  </T>
                  <T v="small" muted>
                    {t(`moment_${r.moment}`)}
                    {r.meal ? ` · ${r.meal}` : ''}
                  </T>
                </Bubble>
                <Bubble side="bot" title={t('glycolife_says')} text={comfortFor(r, readings, medical.target_min, medical.target_max, settings.language)} />
              </View>
            );
          })
        )}
      </View>
    </Screen>
  );
}

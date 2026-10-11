import { router } from 'expo-router';
import { View } from 'react-native';

import { Button, Card, EmptyState, Row, Screen, StatusPill, statusColor, T } from '@/components/ui';
import { alertsFor } from '@/data/selectors';
import { useData, useSession } from '@/data/store';
import { useT } from '@/i18n';
import { fmtDayLabel, fmtTime } from '@/lib/dates';
import { fmtGlucose, statusOf } from '@/lib/glucose';
import { useSettings, useTheme } from '@/theme/settings';
import { radius } from '@/theme/tokens';

export default function Alertes() {
  const t = useT();
  const { c } = useTheme();
  const { settings } = useSettings();
  const { db, markAlertsSeen } = useData();
  const session = useSession();
  const alerts = alertsFor(db, session.userId);
  const unseen = alerts.filter((a) => !a.seen);

  return (
    <Screen
      safeTop
      title={t('alerts_title')}
      subtitle={unseen.length ? t('new_alerts', { n: unseen.length }) : undefined}
      right={unseen.length ? <Button small variant="secondary" icon="checkmark-done" label={t('mark_all_seen')} onPress={() => markAlertsSeen(unseen.map((a) => a.reading.id))} /> : null}>
      {alerts.length === 0 ? <EmptyState icon="happy-outline" title={t('no_alerts')} /> : null}
      {alerts.map(({ reading: r, patient: p, seen }) => {
        const s = statusOf(r.value_mgdl, p.target_min, p.target_max);
        const feelings = r.feelings.filter((f) => f !== 'bien').map((f) => t(`feel_${f}`));
        return (
          <Card
            key={r.id}
            onPress={() => {
              markAlertsSeen([r.id]);
              router.push(`/proche/${p.patient_id}`);
            }}
            style={{ borderLeftWidth: 6, borderLeftColor: statusColor(c, s), opacity: seen ? 0.75 : 1 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T v="bodyBold">{p.full_name}</T>
              <View style={{ backgroundColor: seen ? c.surfaceAlt : c.dangerSoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 }}>
                <T v="caption" color={seen ? c.textMuted : c.danger}>
                  {seen ? t('seen') : t('new')}
                </T>
              </View>
            </Row>
            <Row style={{ flexWrap: 'wrap' }}>
              <T v="h2" color={statusColor(c, s)}>
                {fmtGlucose(r.value_mgdl, settings.unit)}
              </T>
              <StatusPill status={s} />
            </Row>
            <T v="small" muted>
              {t(`moment_${r.moment}`)} · {fmtDayLabel(r.measured_at, settings.language)} {fmtTime(r.measured_at)}
            </T>
            {feelings.length ? <T v="small">Ressenti : {feelings.join(', ')}</T> : null}
            {r.note ? <T v="small">Note : {r.note}</T> : null}
          </Card>
        );
      })}
    </Screen>
  );
}

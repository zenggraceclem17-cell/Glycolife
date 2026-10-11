import { Card, Notice, Screen, T, ToggleRow } from '@/components/ui';
import { useActions } from '@/data/actions';
import { medicalOf } from '@/data/selectors';
import { useData, useSession } from '@/data/store';
import { useT } from '@/i18n';

export default function Confidentialite() {
  const t = useT();
  const { db } = useData();
  const session = useSession();
  const actions = useActions();
  const m = medicalOf(db, session.userId);

  return (
    <Screen>
      <T muted>{t('privacy_desc')}</T>
      <Card style={{ paddingVertical: 4 }}>
        <ToggleRow label={t('share_readings')} description={t('share_readings_desc')} value={m.share_readings} onChange={(v) => actions.saveMedical({ share_readings: v })} />
        <ToggleRow label={t('share_alerts')} description={t('share_alerts_desc')} value={m.share_alerts} onChange={(v) => actions.saveMedical({ share_alerts: v })} />
        <ToggleRow label={t('share_profile')} description={t('share_profile_desc')} value={m.share_profile} onChange={(v) => actions.saveMedical({ share_profile: v })} />
      </Card>
      <Notice icon="lock-closed-outline">{t('privacy_note')}</Notice>
    </Screen>
  );
}

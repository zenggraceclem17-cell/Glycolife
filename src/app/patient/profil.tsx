import { router } from 'expo-router';

import { Avatar } from '@/components/Conversations';
import { Button, Card, ListRow, Row, Screen, SectionTitle, T } from '@/components/ui';
import { caregiversOf, hasMedical, medicalOf } from '@/data/selectors';
import { useData, useSession } from '@/data/store';
import { useT } from '@/i18n';
import { confirmAsk } from '@/lib/dialog';
import { fmtGlucose } from '@/lib/glucose';
import { useSettings } from '@/theme/settings';
import { space } from '@/theme/tokens';

const DIABETES = { type1: 'Type 1', type2: 'Type 2', gestationnel: 'Gestationnel', autre: 'Autre', inconnu: 'Je ne sais pas' } as const;

export default function Profil() {
  const t = useT();
  const { db, signOut, switchDemoRole } = useData();
  const { settings } = useSettings();
  const session = useSession();
  const me = session.userId;
  const m = medicalOf(db, me);
  const caregivers = caregiversOf(db, me);

  const logout = () =>
    confirmAsk(t('logout_q'), t('logout_msg'), t('logout'), async () => {
      await signOut();
      router.replace('/');
    }, t('cancel'));

  const summary = hasMedical(db, me)
    ? [
        m.diabetes_type ? `Diabète ${DIABETES[m.diabetes_type]}` : null,
        m.diagnosis_year ? `depuis ${m.diagnosis_year}` : null,
        m.treatments.length ? m.treatments.join(', ') : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : t('medical_record_desc');

  return (
    <Screen safeTop title={t('profile_title')}>
      <Card>
        <Row gap={space.md}>
          <Avatar name={session.fullName} size={60} />
          <Row style={{ flex: 1, flexDirection: 'column', alignItems: 'flex-start' }} gap={2}>
            <T v="h2">{session.fullName}</T>
            {session.email ? <T muted>{session.email}</T> : null}
            <T v="small" muted>
              Cible : {fmtGlucose(m.target_min, settings.unit, false)} – {fmtGlucose(m.target_max, settings.unit)}
            </T>
          </Row>
        </Row>
      </Card>

      <Card style={{ paddingVertical: 0 }}>
        <ListRow icon="document-text-outline" label={t('medical_record')} description={summary} onPress={() => router.push('/dossier')} />
        <ListRow icon="person-add-outline" label={t('invite_caregiver')} description={`${t('my_caregivers')} : ${caregivers.length}`} onPress={() => router.push('/inviter')} />
        <ListRow icon="shield-checkmark-outline" label={t('privacy')} description={t('privacy_desc')} onPress={() => router.push('/confidentialite')} />
        <ListRow icon="settings-outline" label={t('settings')} onPress={() => router.push('/parametres')} />
      </Card>

      {session.mode === 'demo' ? (
        <>
          <SectionTitle>Démo</SectionTitle>
          <Button
            variant="secondary"
            icon="swap-horizontal"
            label={t('demo_switch_cg')}
            onPress={async () => {
              await switchDemoRole();
              router.replace('/');
            }}
          />
        </>
      ) : null}

      <Button variant="ghost" icon="log-out-outline" label={t('logout')} onPress={logout} />
      <T v="caption" muted center>
        {t('disclaimer')}
      </T>
    </Screen>
  );
}

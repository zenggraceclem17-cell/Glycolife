import { router } from 'expo-router';

import { Avatar } from '@/components/Conversations';
import { Button, Card, ListRow, Notice, Row, Screen, SectionTitle, T } from '@/components/ui';
import { useData, useSession } from '@/data/store';
import { useT } from '@/i18n';
import { confirmAsk } from '@/lib/dialog';
import { space } from '@/theme/tokens';

export default function Compte() {
  const t = useT();
  const { signOut, switchDemoRole } = useData();
  const session = useSession();

  return (
    <Screen safeTop title={t('tab_account')}>
      <Card>
        <Row gap={space.md}>
          <Avatar name={session.fullName} size={56} />
          <Row style={{ flex: 1, flexDirection: 'column', alignItems: 'flex-start' }} gap={2}>
            <T v="h2">{session.fullName}</T>
            <T muted>{t('role_caregiver')}</T>
          </Row>
        </Row>
      </Card>
      <Notice icon="eye-outline">Vous voyez ce que vos proches ont choisi de partager. Vous ne pouvez pas modifier leurs données.</Notice>
      <Card style={{ paddingVertical: 0 }}>
        <ListRow icon="qr-code-outline" label={t('link_someone')} onPress={() => router.push('/relier')} />
        <ListRow icon="navigate-outline" label={t('svc_hospitals')} onPress={() => router.push('/services/hopitaux')} />
        <ListRow icon="book-outline" label={t('svc_learn')} onPress={() => router.push('/services/apprendre')} />
        <ListRow icon="settings-outline" label={t('settings')} onPress={() => router.push('/parametres')} />
      </Card>
      {session.mode === 'demo' ? (
        <>
          <SectionTitle>Démo</SectionTitle>
          <Button
            variant="secondary"
            icon="swap-horizontal"
            label={t('demo_switch_patient')}
            onPress={async () => {
              await switchDemoRole();
              router.replace('/');
            }}
          />
        </>
      ) : null}
      <Button
        variant="ghost"
        icon="log-out-outline"
        label={t('logout')}
        onPress={() =>
          confirmAsk(t('logout_q'), t('logout_msg'), t('logout'), async () => {
            await signOut();
            router.replace('/');
          }, t('cancel'))
        }
      />
    </Screen>
  );
}

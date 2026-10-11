import { useMemo } from 'react';
import { Linking, Platform, Share, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Avatar } from '@/components/Conversations';
import { Button, Card, EmptyState, Notice, Row, Screen, SectionTitle, T } from '@/components/ui';
import { useActions } from '@/data/actions';
import { caregiversOf, isPending } from '@/data/selectors';
import { useData, useSession } from '@/data/store';
import { useT } from '@/i18n';
import { fmtDayLabel, fmtTime } from '@/lib/dates';
import { confirmAsk } from '@/lib/dialog';
import { useTheme } from '@/theme/settings';
import { space } from '@/theme/tokens';

export default function Inviter() {
  const t = useT();
  const { c, fs } = useTheme();
  const { db } = useData();
  const session = useSession();
  const actions = useActions();
  const me = session.userId;

  const invite = useMemo(
    () =>
      Object.values(db.tables.invites)
        .filter((i) => i.patient_id === me && !i.used_at && new Date(i.expires_at) > new Date())
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null,
    [db, me],
  );
  const caregivers = caregiversOf(db, me);
  const message = invite ? t('invite_message', { code: invite.code }) : '';

  const shareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => Share.share({ message }));
  };
  const shareSms = () => {
    const sep = Platform.OS === 'ios' ? '&' : '?';
    Linking.openURL(`sms:${sep}body=${encodeURIComponent(message)}`).catch(() => Share.share({ message }));
  };

  return (
    <Screen>
      <T muted>{t('invite_explain')}</T>
      {invite ? (
        <Card style={{ alignItems: 'center', gap: space.md }}>
          <View style={{ padding: 12, backgroundColor: '#FFFFFF', borderRadius: 12 }}>
            <QRCode value={`GLYCOLIFE:${invite.code}`} size={200} color="#000000" backgroundColor="#FFFFFF" />
          </View>
          <T v="small" muted>
            {t('invite_code')}
          </T>
          <T v="display" style={{ letterSpacing: 6, fontSize: fs(40) }}>
            {invite.code}
          </T>
          <T v="small" muted>
            {t('invite_valid_until', { time: `${fmtDayLabel(invite.expires_at)} ${fmtTime(invite.expires_at)}` })}
          </T>
          {isPending(db, 'invites', invite.id) ? <Notice tone="warning" icon="cloud-upload-outline">{t('invite_pending_sync')}</Notice> : null}
          <Button style={{ alignSelf: 'stretch' }} icon="logo-whatsapp" label={t('invite_share_whatsapp')} variant="success" onPress={shareWhatsApp} />
          <Button style={{ alignSelf: 'stretch' }} icon="chatbox-outline" label={t('invite_share_sms')} variant="secondary" onPress={shareSms} />
          <Button
            variant="ghost"
            icon="refresh"
            label={t('invite_new')}
            onPress={() => actions.createInvite()}
          />
        </Card>
      ) : (
        <Button big icon="qr-code-outline" label={t('invite_caregiver')} onPress={() => actions.createInvite()} />
      )}

      <SectionTitle>{t('my_caregivers')}</SectionTitle>
      {caregivers.length === 0 ? <EmptyState icon="people-outline" title={t('no_caregivers')} /> : null}
      {caregivers.map(({ link, profile }) => {
        const name = profile?.full_name ?? 'Accompagnateur';
        return (
          <Card key={link.id}>
            <Row gap={space.md}>
              <Avatar name={name} size={44} />
              <View style={{ flex: 1 }}>
                <T v="bodyBold">{name}</T>
                <T v="small" muted>
                  Depuis le {fmtDayLabel(link.created_at)}
                </T>
              </View>
              <Button
                small
                variant="secondary"
                label={t('remove')}
                onPress={() =>
                  confirmAsk(t('remove_caregiver_q', { name }), t('remove_caregiver_msg'), t('remove'), () => actions.revokeCaregiver(link.id), t('cancel'))
                }
              />
            </Row>
          </Card>
        );
      })}
      <T v="caption" muted center style={{ color: c.textMuted }}>
        {t('privacy_note')}
      </T>
    </Screen>
  );
}

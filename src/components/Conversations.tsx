import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { conversation, unreadFrom } from '@/data/selectors';
import { useData, useSession } from '@/data/store';
import { useT } from '@/i18n';
import { fmtDayShort, fmtTime, dayKey } from '@/lib/dates';
import { useTheme } from '@/theme/settings';
import { space } from '@/theme/tokens';
import { Badge, Card, EmptyState, T } from './ui';

export interface Peer {
  id: string;
  name: string;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

export function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  const { c, fs } = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
      <T v="bodyBold" color={c.onPrimary} style={{ fontSize: fs(size * 0.36) }}>
        {initials(name)}
      </T>
    </View>
  );
}

/** Liste des conversations façon WhatsApp. */
export function ConversationList({ peers, emptyText, doctorSlot }: { peers: Peer[]; emptyText: string; doctorSlot?: boolean }) {
  const { db } = useData();
  const session = useSession();
  const { c, fs } = useTheme();
  const t = useT();
  const me = session.userId;

  const rows = peers
    .map((p) => {
      const msgs = conversation(db, me, p.id);
      return { peer: p, last: msgs[msgs.length - 1] ?? null, unread: unreadFrom(db, me, p.id) };
    })
    .sort((a, b) => (b.last?.created_at ?? '').localeCompare(a.last?.created_at ?? ''));

  return (
    <View style={{ gap: 0 }}>
      {rows.length === 0 ? <EmptyState icon="chatbubbles-outline" title={emptyText} /> : null}
      {rows.map(({ peer, last, unread }) => (
        <Pressable
          key={peer.id}
          onPress={() => router.push(`/chat/${peer.id}`)}
          accessibilityRole="button"
          accessibilityLabel={`${peer.name}${unread ? `, ${unread} non lus` : ''}`}
          style={({ pressed }) => ({
            flexDirection: 'row',
            gap: space.md,
            alignItems: 'center',
            paddingVertical: space.md,
            borderBottomWidth: 1,
            borderColor: c.border,
            opacity: pressed ? 0.7 : 1,
          })}>
          <Avatar name={peer.name} />
          <View style={{ flex: 1 }}>
            <T v="bodyBold">{peer.name}</T>
            <T v="small" muted numberOfLines={1}>
              {last ? `${last.sender_id === me ? '✓ ' : ''}${last.body}` : t('type_message')}
            </T>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            {last ? (
              <T v="caption" color={unread ? c.success : c.textMuted}>
                {dayKey(last.created_at) === dayKey(new Date()) ? fmtTime(last.created_at) : fmtDayShort(last.created_at)}
              </T>
            ) : null}
            <Badge count={unread} />
          </View>
        </Pressable>
      ))}
      {doctorSlot ? (
        <Card style={{ marginTop: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md, opacity: 0.75 }}>
          <Ionicons name="medkit-outline" size={fs(30)} color={c.textMuted} />
          <View style={{ flex: 1 }}>
            <T v="bodyBold">{t('your_doctor')}</T>
            <T v="small" muted>
              {t('doctor_soon')}
            </T>
          </View>
          <Ionicons name="lock-closed" size={fs(18)} color={c.textMuted} />
        </Card>
      ) : null}
    </View>
  );
}

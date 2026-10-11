// Conversation façon WhatsApp entre personnes reliées.
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { KeyboardAvoidingView, Linking, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Bubble, Composer, DaySeparator, QuickReplies, type Delivery } from '@/components/chat';
import { IconButton } from '@/components/ui';
import { SyncBanner } from '@/components/SyncBanner';
import { useActions } from '@/data/actions';
import { conversation, isPending, linkedPatients, profileOf } from '@/data/selectors';
import { useData, useSession } from '@/data/store';
import { useT } from '@/i18n';
import { dayKey, fmtDayLabel, fmtTime } from '@/lib/dates';
import { useSettings, useTheme } from '@/theme/settings';
import { space } from '@/theme/tokens';

const QUICK_PATIENT = ['Je vais bien 👍', "J'ai pris mon médicament ✅", 'Peux-tu m’appeler ?', 'Je ne me sens pas bien', 'Nazali malamu 👍', 'Nameli nkisi ✅', 'Benga ngai 📞'];
const QUICK_CAREGIVER = ['Comment tu te sens ?', 'As-tu mesuré ta glycémie ?', "N'oublie pas ton médicament 💊", "J'arrive 🚶", 'Ozali malamu ?', 'Komela nkisi 💊', 'Nazali koya 🚶'];

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const { c } = useTheme();
  const { settings } = useSettings();
  const { db } = useData();
  const session = useSession();
  const actions = useActions();
  const scrollRef = useRef<ScrollView>(null);
  const me = session.userId;

  const peerProfile = profileOf(db, id);
  const lp = linkedPatients(db, me).find((p) => p.patient_id === id);
  const name = peerProfile?.full_name ?? lp?.full_name ?? '…';
  const phone = peerProfile?.phone ?? lp?.phone ?? null;
  const msgs = useMemo(() => conversation(db, me, id), [db, me, id]);
  const unreadCount = msgs.filter((m) => m.recipient_id === me && !m.read_at).length;

  useEffect(() => {
    if (unreadCount > 0) actions.markConversationRead(id);
  }, [unreadCount, id, actions]);

  const quick = session.role === 'accompagnateur' ? QUICK_CAREGIVER : QUICK_PATIENT;
  const ordered = settings.language === 'ln' ? [...quick.slice(4), ...quick.slice(0, 4)] : quick;

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={{ flex: 1, backgroundColor: c.chatBg }}>
      <Stack.Screen
        options={{
          title: name,
          headerRight: () =>
            phone ? <IconButton icon="call" label={`${t('call')} ${name}`} onPress={() => Linking.openURL(`tel:${phone}`)} /> : null,
        }}
      />
      <SyncBanner />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: space.md, maxWidth: 720, width: '100%', alignSelf: 'center' }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
          {msgs.map((m, i) => {
            const newDay = i === 0 || dayKey(msgs[i - 1].created_at) !== dayKey(m.created_at);
            const mine = m.sender_id === me;
            const delivery: Delivery | undefined = mine
              ? isPending(db, 'messages', m.id)
                ? 'pending'
                : m.read_at
                  ? 'read'
                  : 'sent'
              : undefined;
            return (
              <View key={m.id}>
                {newDay ? <DaySeparator label={fmtDayLabel(m.created_at, settings.language)} /> : null}
                <Bubble side={mine ? 'mine' : 'theirs'} text={m.body} time={fmtTime(m.created_at)} delivery={delivery} />
              </View>
            );
          })}
        </ScrollView>
        <QuickReplies replies={ordered} onPick={(r) => actions.sendMessage(id, r)} />
        <Composer onSend={(text) => actions.sendMessage(id, text)} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

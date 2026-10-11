// Interface conversationnelle inspirée de WhatsApp : bulles, accusés de lecture, réponses rapides.
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useT } from '@/i18n';
import { fmtTime } from '@/lib/dates';
import { useTheme } from '@/theme/settings';
import { radius, space } from '@/theme/tokens';
import { T } from './ui';

export type Delivery = 'pending' | 'sent' | 'read';

export function Bubble({
  text,
  time,
  side,
  delivery,
  title,
  accent,
  children,
}: {
  text?: string;
  time?: string;
  side: 'mine' | 'theirs' | 'bot';
  delivery?: Delivery;
  title?: string;
  accent?: string;
  children?: React.ReactNode;
}) {
  const { c, fs } = useTheme();
  const bg = side === 'mine' ? c.bubbleMine : side === 'bot' ? c.bubbleBot : c.bubbleTheirs;
  return (
    <View
      style={[
        styles.bubble,
        {
          backgroundColor: bg,
          alignSelf: side === 'mine' ? 'flex-end' : 'flex-start',
          borderTopRightRadius: side === 'mine' ? 4 : radius.lg,
          borderTopLeftRadius: side === 'mine' ? radius.lg : 4,
          borderLeftWidth: accent ? 4 : 0,
          borderLeftColor: accent,
        },
      ]}>
      {title ? (
        <Text style={{ color: c.primary, fontWeight: '800', fontSize: fs(13), marginBottom: 2 }}>{title}</Text>
      ) : null}
      {children}
      {text ? <T>{text}</T> : null}
      {time ? (
        <View style={styles.meta}>
          <Text style={{ color: c.textMuted, fontSize: fs(11) }}>{time}</Text>
          {delivery ? <Ticks delivery={delivery} /> : null}
        </View>
      ) : null}
    </View>
  );
}

function Ticks({ delivery }: { delivery: Delivery }) {
  const { c, fs } = useTheme();
  if (delivery === 'pending') return <Ionicons name="time-outline" size={fs(13)} color={c.textMuted} accessibilityLabel="En attente" />;
  return (
    <Ionicons
      name="checkmark-done"
      size={fs(15)}
      color={delivery === 'read' ? c.read : c.textMuted}
      accessibilityLabel={delivery === 'read' ? 'Lu' : 'Envoyé'}
    />
  );
}

export function DaySeparator({ label }: { label: string }) {
  const { c } = useTheme();
  return (
    <View style={{ alignSelf: 'center', backgroundColor: c.surface, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 3, marginVertical: space.sm }}>
      <T v="caption" muted>
        {label}
      </T>
    </View>
  );
}

export function QuickReplies({ replies, onPick }: { replies: string[]; onPick: (r: string) => void }) {
  const { c, fs } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.sm, paddingVertical: space.xs }} keyboardShouldPersistTaps="handled">
      {replies.map((r) => (
        <Pressable
          key={r}
          onPress={() => onPick(r)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.quick, { borderColor: c.primary, backgroundColor: c.surface, opacity: pressed ? 0.7 : 1 }]}>
          <Text style={{ color: c.primary, fontWeight: '700', fontSize: fs(14) }}>{r}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function Composer({ onSend }: { onSend: (text: string) => void }) {
  const { c, fs } = useTheme();
  const t = useT();
  const [text, setText] = useState('');
  const send = () => {
    const v = text.trim();
    if (!v) return;
    onSend(v);
    setText('');
  };
  return (
    <View style={[styles.composer, { backgroundColor: c.chatBg }]}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={t('type_message')}
        placeholderTextColor={c.textMuted}
        multiline
        onSubmitEditing={send}
        style={[styles.input, { backgroundColor: c.surface, color: c.text, fontSize: fs(16) }]}
        accessibilityLabel={t('type_message')}
      />
      <Pressable
        onPress={send}
        accessibilityRole="button"
        accessibilityLabel={t('send')}
        style={({ pressed }) => [styles.send, { backgroundColor: c.success, opacity: pressed ? 0.8 : 1 }]}>
        <Ionicons name="send" size={fs(20)} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

export const fmtBubbleTime = fmtTime;

const styles = StyleSheet.create({
  bubble: { maxWidth: '86%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.lg, gap: 2, marginVertical: 3 },
  meta: { flexDirection: 'row', alignSelf: 'flex-end', alignItems: 'center', gap: 4 },
  quick: { borderWidth: 1.5, borderRadius: radius.pill, paddingHorizontal: 14, minHeight: 40, justifyContent: 'center' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, padding: space.sm },
  input: { flex: 1, borderRadius: 24, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, minHeight: 48, maxHeight: 120 },
  send: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});

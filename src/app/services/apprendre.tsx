import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View } from 'react-native';

import { Card, Row, Screen, T } from '@/components/ui';
import { LESSONS } from '@/data/lessons';
import { useData, useSession } from '@/data/store';
import { useTheme } from '@/theme/settings';
import { radius } from '@/theme/tokens';

export default function Apprendre() {
  const { c, fs } = useTheme();
  const { db } = useData();
  const session = useSession();
  const read = new Set(db.readLessons[session.userId] ?? []);
  const pct = Math.round((read.size / LESSONS.length) * 100);

  return (
    <Screen>
      <Card>
        <T v="bodyBold">
          {read.size} fiche(s) lue(s) sur {LESSONS.length}
        </T>
        <View style={{ height: 10, borderRadius: radius.pill, backgroundColor: c.surfaceAlt, overflow: 'hidden' }}>
          <View style={{ width: `${pct}%`, height: '100%', backgroundColor: c.success }} />
        </View>
      </Card>
      {LESSONS.map((l) => (
        <Card key={l.id} onPress={() => router.push(`/services/fiche/${l.id}`)} accessibilityLabel={l.title}>
          <Row>
            <Ionicons name={l.icon as React.ComponentProps<typeof Ionicons>['name']} size={fs(30)} color={c.primary} />
            <View style={{ flex: 1 }}>
              <T v="bodyBold">{l.title}</T>
              <T v="small" muted>
                {l.minutes} min de lecture + 1 question
              </T>
            </View>
            {read.has(l.id) ? (
              <Ionicons name="checkmark-circle" size={fs(26)} color={c.success} accessibilityLabel="Lue" />
            ) : (
              <Ionicons name="chevron-forward" size={fs(22)} color={c.textMuted} />
            )}
          </Row>
        </Card>
      ))}
      <T v="caption" muted center>
        Contenu éducatif à faire valider par un professionnel de santé.
      </T>
    </Screen>
  );
}

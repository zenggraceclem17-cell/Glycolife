import { Ionicons } from '@expo/vector-icons';
import Tabs from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';

import { alertsFor, unreadFrom } from '@/data/selectors';
import { useData } from '@/data/store';
import { useT } from '@/i18n';
import { useTheme } from '@/theme/settings';

type Icon = React.ComponentProps<typeof Ionicons>['name'];

export default function AidantTabs() {
  const { c, fs } = useTheme();
  const t = useT();
  const { db, session } = useData();
  const me = session?.userId ?? '';
  const unread = unreadFrom(db, me);
  const newAlerts = alertsFor(db, me).filter((a) => !a.seen).length;

  const icon = (name: Icon) =>
    function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
      return <Ionicons name={(focused ? name : `${name}-outline`) as Icon} size={fs(24)} color={color as string} />;
    };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border, minHeight: 60 },
        tabBarLabelStyle: { fontSize: fs(12), fontWeight: '700' },
      }}>
      <Tabs.Screen name="index" options={{ title: t('tab_follow'), tabBarIcon: icon('heart') }} />
      <Tabs.Screen
        name="alertes"
        options={{ title: t('tab_alerts'), tabBarIcon: icon('notifications'), tabBarBadge: newAlerts > 0 ? newAlerts : undefined }}
      />
      <Tabs.Screen
        name="messages"
        options={{ title: t('tab_messages'), tabBarIcon: icon('chatbubbles'), tabBarBadge: unread > 0 ? unread : undefined }}
      />
      <Tabs.Screen name="compte" options={{ title: t('tab_account'), tabBarIcon: icon('person') }} />
    </Tabs>
  );
}

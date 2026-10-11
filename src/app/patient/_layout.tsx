import { Ionicons } from '@expo/vector-icons';
import Tabs from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';

import { unreadFrom } from '@/data/selectors';
import { useData } from '@/data/store';
import { useT } from '@/i18n';
import { useTheme } from '@/theme/settings';

type Icon = React.ComponentProps<typeof Ionicons>['name'];

export default function PatientTabs() {
  const { c, fs } = useTheme();
  const t = useT();
  const { db, session } = useData();
  const unread = session ? unreadFrom(db, session.userId) : 0;

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
      <Tabs.Screen name="index" options={{ title: t('tab_home'), tabBarIcon: icon('home') }} />
      <Tabs.Screen name="bilans" options={{ title: t('tab_reports'), tabBarIcon: icon('stats-chart') }} />
      <Tabs.Screen name="services" options={{ title: t('tab_services'), tabBarIcon: icon('grid') }} />
      <Tabs.Screen
        name="messages"
        options={{ title: t('tab_messages'), tabBarIcon: icon('chatbubbles'), tabBarBadge: unread > 0 ? unread : undefined }}
      />
      <Tabs.Screen name="profil" options={{ title: t('tab_profile'), tabBarIcon: icon('person') }} />
    </Tabs>
  );
}

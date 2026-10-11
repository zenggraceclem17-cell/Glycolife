import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { useData } from '@/data/store';
import { useT } from '@/i18n';
import { useTheme } from '@/theme/settings';

/** Bannière discrète : hors ligne, éléments en attente, ou mode démo. */
export function SyncBanner() {
  const { session, online, pending, syncing } = useData();
  const { c, fs } = useTheme();
  const t = useT();
  if (!session) return null;

  let text: string | null = null;
  let icon: 'cloud-offline-outline' | 'sync-outline' | 'flask-outline' = 'sync-outline';
  if (session.mode === 'demo') {
    text = t('demo_banner');
    icon = 'flask-outline';
  } else if (!online) {
    text = t('offline_banner');
    icon = 'cloud-offline-outline';
  } else if (syncing && pending > 0) {
    text = t('syncing');
  } else if (pending > 0) {
    text = t('pending_banner', { n: pending });
  }
  if (!text) return null;

  return (
    <View
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 5,
        paddingHorizontal: 12,
        backgroundColor: session.mode === 'demo' ? c.primarySoft : c.warningSoft,
      }}>
      <Ionicons name={icon} size={fs(14)} color={session.mode === 'demo' ? c.primary : c.warning} />
      <Text style={{ color: c.text, fontSize: fs(12), fontWeight: '600' }}>{text}</Text>
    </View>
  );
}

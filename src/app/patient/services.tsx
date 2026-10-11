import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Screen, T, type IconName } from '@/components/ui';
import { useT, type DictKey } from '@/i18n';
import { useTheme } from '@/theme/settings';
import { radius, space } from '@/theme/tokens';

const TILES: { key: DictKey; icon: IconName; href?: string; desc: string }[] = [
  { key: 'svc_meals', icon: 'restaurant-outline', href: '/services/repas', desc: 'Glucides et effet des aliments' },
  { key: 'svc_meds', icon: 'medkit-outline', href: '/services/traitements', desc: 'Prises du jour à cocher' },
  { key: 'svc_appointments', icon: 'calendar-outline', href: '/services/rendez-vous', desc: 'Consultations et analyses' },
  { key: 'svc_vitals', icon: 'fitness-outline', href: '/services/constantes', desc: 'Courbes et repères' },
  { key: 'svc_hospitals', icon: 'navigate-outline', href: '/services/hopitaux', desc: 'Carte et itinéraire' },
  { key: 'svc_learn', icon: 'book-outline', href: '/services/apprendre', desc: 'Fiches courtes + quiz' },
  { key: 'svc_emergency', icon: 'qr-code-outline', href: '/services/urgence', desc: 'QR lisible sans internet' },
  { key: 'svc_ai', icon: 'sparkles-outline', desc: 'IA locale' },
  { key: 'svc_doctor', icon: 'person-circle-outline', desc: 'Partage avec le médecin' },
  { key: 'svc_insulin', icon: 'calculator-outline', desc: 'Réglages fixés par le médecin' },
];

export default function Services() {
  const t = useT();
  const { c, fs } = useTheme();
  return (
    <Screen safeTop title={t('services_title')}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        {TILES.map((tile) => {
          const locked = !tile.href;
          return (
            <Pressable
              key={tile.key}
              disabled={locked}
              onPress={() => tile.href && router.push(tile.href)}
              accessibilityRole="button"
              accessibilityLabel={`${t(tile.key)}${locked ? `, ${t('svc_locked')}` : ''}`}
              accessibilityState={{ disabled: locked }}
              style={({ pressed }) => ({
                flexBasis: '47%',
                flexGrow: 1,
                minHeight: 130,
                padding: space.md,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: c.border,
                backgroundColor: locked ? c.surfaceAlt : c.surface,
                gap: space.xs,
                opacity: pressed ? 0.7 : locked ? 0.6 : 1,
              })}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={tile.icon} size={fs(26)} color={c.primary} />
                </View>
                {locked ? <Ionicons name="lock-closed" size={fs(18)} color={c.textMuted} /> : null}
              </View>
              <T v="bodyBold">{t(tile.key)}</T>
              <T v="small" muted>
                {locked ? t('soon') : tile.desc}
              </T>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

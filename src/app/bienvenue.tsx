import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View } from 'react-native';

import { Card, Row, Screen, Segmented, T, type IconName } from '@/components/ui';
import { useData } from '@/data/store';
import type { Role } from '@/data/types';
import { useT } from '@/i18n';
import { useSettings, useTheme } from '@/theme/settings';
import { space } from '@/theme/tokens';

/** Premier lancement : choix du profil (application unique « 3 en 1 »). */
export default function Bienvenue() {
  const t = useT();
  const { c, fs } = useTheme();
  const { settings, update } = useSettings();
  const { chooseRole } = useData();

  const roles: { role: Role; icon: IconName; title: string; desc: string }[] = [
    { role: 'patient', icon: 'person-outline', title: t('role_patient'), desc: t('role_patient_desc') },
    { role: 'accompagnateur', icon: 'people-outline', title: t('role_caregiver'), desc: t('role_caregiver_desc') },
    { role: 'medecin', icon: 'medkit-outline', title: t('role_doctor'), desc: t('role_doctor_desc') },
  ];

  const pick = (role: Role) => {
    chooseRole(role);
    router.push('/connexion');
  };

  return (
    <Screen safeTop>
      <View style={{ alignItems: 'center', gap: space.sm, marginTop: space.xl }}>
        <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="water" size={fs(44)} color={c.onPrimary} />
        </View>
        <T v="title" center>
          {t('welcome_title')}
        </T>
        <T muted center>
          {t('tagline')}
        </T>
      </View>

      <T v="h2" style={{ marginTop: space.lg }}>
        {t('welcome_sub')}
      </T>
      {roles.map((r) => (
        <Card key={r.role} onPress={() => pick(r.role)} accessibilityLabel={r.title}>
          <Row gap={space.md}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={r.icon} size={fs(28)} color={c.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <T v="h2">{r.title}</T>
              <T muted>{r.desc}</T>
            </View>
            <Ionicons name="chevron-forward" size={fs(22)} color={c.textMuted} />
          </Row>
        </Card>
      ))}

      <T v="small" muted style={{ marginTop: space.md }}>
        {t('choose_language')}
      </T>
      <Segmented
        options={[
          { value: 'fr', label: 'Français' },
          { value: 'ln', label: 'Lingala' },
        ]}
        value={settings.language}
        onChange={(language) => update({ language })}
      />
      <T v="caption" muted center style={{ marginTop: space.lg }}>
        {t('disclaimer')}
      </T>
    </Screen>
  );
}

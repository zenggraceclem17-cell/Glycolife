import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useData } from '@/data/store';
import { useTheme } from '@/theme/settings';

/** Aiguillage : profil choisi ? connecté ? → bon espace. */
export default function Index() {
  const { ready, session, chosenRole } = useData();
  const { c } = useTheme();
  if (!ready)
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
        <ActivityIndicator color={c.primary} size="large" />
      </View>
    );
  if (session) {
    if (session.role === 'accompagnateur') return <Redirect href="/aidant" />;
    if (session.role === 'medecin') return <Redirect href="/medecin" />;
    return <Redirect href="/patient" />;
  }
  return <Redirect href={chosenRole ? '/connexion' : '/bienvenue'} />;
}

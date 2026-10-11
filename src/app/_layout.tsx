import { DarkTheme, DefaultTheme, Stack, ThemeProvider, router, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DataProvider, useData } from '@/data/store';
import { SettingsProvider, useSettings, useTheme } from '@/theme/settings';

SplashScreen.preventAutoHideAsync().catch(() => {});

const PUBLIC = new Set(['', 'bienvenue', 'connexion']);

function RootStack() {
  const { c, scheme, fs } = useTheme();
  const { ready: settingsReady } = useSettings();
  const { ready, session } = useData();
  const segments = useSegments();

  useEffect(() => {
    if (ready && settingsReady) SplashScreen.hideAsync().catch(() => {});
  }, [ready, settingsReady]);

  // Garde : sans session, retour à l'accueil (choix du profil / connexion).
  useEffect(() => {
    if (!ready) return;
    const first = (segments[0] as string | undefined) ?? '';
    if (!session && !PUBLIC.has(first)) router.replace('/');
  }, [ready, session, segments]);

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, primary: c.primary, background: c.bg, card: c.surface, text: c.text, border: c.border },
  };

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: c.surface },
          headerTintColor: c.primary,
          headerTitleStyle: { color: c.text, fontSize: fs(18), fontWeight: '700' },
          contentStyle: { backgroundColor: c.bg },
          headerBackButtonDisplayMode: 'minimal',
        }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="bienvenue" options={{ headerShown: false }} />
        <Stack.Screen name="connexion" options={{ title: '' }} />
        <Stack.Screen name="patient" options={{ headerShown: false }} />
        <Stack.Screen name="aidant" options={{ headerShown: false }} />
        <Stack.Screen name="medecin" options={{ title: 'Espace médecin' }} />
        <Stack.Screen name="mesure" options={{ title: 'Nouvelle glycémie', presentation: 'modal' }} />
        <Stack.Screen name="chat/[id]" options={{ title: '' }} />
        <Stack.Screen name="proche/[id]" options={{ title: '' }} />
        <Stack.Screen name="dossier" options={{ title: 'Dossier médical' }} />
        <Stack.Screen name="inviter" options={{ title: 'Inviter un proche' }} />
        <Stack.Screen name="confidentialite" options={{ title: 'Confidentialité' }} />
        <Stack.Screen name="parametres" options={{ title: 'Paramètres' }} />
        <Stack.Screen name="relier" options={{ title: 'Relier un proche' }} />
        <Stack.Screen name="services/repas" options={{ title: 'Mes repas' }} />
        <Stack.Screen name="services/traitements" options={{ title: 'Traitements' }} />
        <Stack.Screen name="services/rendez-vous" options={{ title: 'Rendez-vous' }} />
        <Stack.Screen name="services/constantes" options={{ title: 'Poids et tension' }} />
        <Stack.Screen name="services/hopitaux" options={{ title: 'Hôpitaux proches' }} />
        <Stack.Screen name="services/apprendre" options={{ title: 'Apprendre' }} />
        <Stack.Screen name="services/fiche/[id]" options={{ title: '' }} />
        <Stack.Screen name="services/urgence" options={{ title: "Carte d'urgence" }} />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <DataProvider>
          <RootStack />
        </DataProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

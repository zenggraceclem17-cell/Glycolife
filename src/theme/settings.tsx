import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import type { Language, Unit } from '@/data/types';
import { buildColors, TEXT_SCALE, type Accent, type Colors, type Scheme, type TextSize } from './tokens';

export interface Settings {
  theme: 'auto' | 'light' | 'dark';
  accent: Accent;
  textSize: TextSize;
  highContrast: boolean;
  chartTarget: boolean;
  chartPoints: boolean;
  chartGrid: boolean;
  defaultPeriod: 7 | 30 | 90;
  language: Language;
  unit: Unit;
  autoSync: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'auto',
  accent: 'bleu',
  textSize: 'normal',
  highContrast: false,
  chartTarget: true,
  chartPoints: true,
  chartGrid: true,
  defaultPeriod: 7,
  language: 'fr',
  unit: 'g/L',
  autoSync: true,
};

// Clé indépendante du compte : les réglages restent sur le téléphone après déconnexion.
const KEY = 'glycolife:settings';

interface Ctx {
  settings: Settings;
  ready: boolean;
  update: (patch: Partial<Settings>) => void;
  resetDisplay: () => void;
}

const SettingsContext = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) setSettings({ ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) });
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const resetDisplay = useCallback(() => {
    update({
      theme: DEFAULT_SETTINGS.theme,
      accent: DEFAULT_SETTINGS.accent,
      textSize: DEFAULT_SETTINGS.textSize,
      highContrast: DEFAULT_SETTINGS.highContrast,
      chartTarget: true,
      chartPoints: true,
      chartGrid: true,
      defaultPeriod: 7,
    });
  }, [update]);

  const value = useMemo(() => ({ settings, ready, update, resetDisplay }), [settings, ready, update, resetDisplay]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): Ctx {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings hors SettingsProvider');
  return ctx;
}

export interface Theme {
  c: Colors;
  scheme: Scheme;
  scale: number;
  /** Taille de police mise à l'échelle selon le réglage « Taille du texte ». */
  fs: (size: number) => number;
}

export function useTheme(): Theme {
  const { settings } = useSettings();
  const system = useColorScheme();
  const scheme: Scheme = settings.theme === 'auto' ? (system === 'dark' ? 'dark' : 'light') : settings.theme;
  return useMemo(() => {
    const scale = TEXT_SCALE[settings.textSize];
    return {
      c: buildColors(scheme, settings.accent, settings.highContrast),
      scheme,
      scale,
      fs: (size: number) => Math.round(size * scale),
    };
  }, [scheme, settings.accent, settings.highContrast, settings.textSize]);
}

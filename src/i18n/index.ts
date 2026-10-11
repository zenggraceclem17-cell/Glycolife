import { useCallback } from 'react';

import { useSettings } from '@/theme/settings';
import { fr, type DictKey } from './fr';
import { ln } from './ln';

export type { DictKey };

export function translate(lang: 'fr' | 'ln', key: DictKey, params?: Record<string, string | number>): string {
  let s: string = (lang === 'ln' ? ln[key] : undefined) ?? fr[key];
  if (params) for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

export function useT() {
  const { settings } = useSettings();
  return useCallback(
    (key: DictKey, params?: Record<string, string | number>) => translate(settings.language, key, params),
    [settings.language],
  );
}

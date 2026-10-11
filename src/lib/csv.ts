// Export .csv compatible Excel en français : séparateur « ; », virgule décimale, UTF-8 avec BOM.
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import type { GlucoseReading } from '@/data/types';
import { translate } from '@/i18n';
import { fmtDateNumeric, fmtTime } from './dates';
import { fmtNumber, statusOf } from './glucose';

const STATUS_LABEL = {
  hypo_severe: 'hypo sévère',
  hypo: 'hypo',
  cible: 'dans la cible',
  hyper: 'hyper',
  hyper_severe: 'hyper sévère',
} as const;

function cell(v: string): string {
  return /[;"\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function readingsToCsv(readings: GlucoseReading[], min: number, max: number): string {
  const header = ['date', 'heure', 'glycemie_g_L', 'glycemie_mg_dL', 'moment', 'statut', 'ressenti', 'repas', 'note'];
  const lines = [header.join(';')];
  for (const r of readings) {
    lines.push(
      [
        fmtDateNumeric(r.measured_at),
        fmtTime(r.measured_at),
        fmtNumber(r.value_mgdl / 100, 2),
        String(r.value_mgdl),
        translate('fr', `moment_${r.moment}`),
        STATUS_LABEL[statusOf(r.value_mgdl, min, max)],
        r.feelings.map((f) => translate('fr', `feel_${f}`)).join(', '),
        r.meal ?? '',
        r.note ?? '',
      ]
        .map(cell)
        .join(';'),
    );
  }
  return '﻿' + lines.join('\r\n') + '\r\n';
}

/** Enregistre puis propose le partage (WhatsApp, e-mail…). Sur le web : téléchargement. */
export async function shareCsv(filename: string, content: string): Promise<void> {
  if (Platform.OS === 'web') {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: filename, UTI: 'public.comma-separated-values-text' });
  }
}

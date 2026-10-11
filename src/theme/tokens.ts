// Jetons de thème GlycoLife. Toute couleur de l'interface passe par ici.
// Charte : fond blanc, textes noirs, actions en couleur principale (bleu par défaut), positif en vert.

export type Accent = 'bleu' | 'vert' | 'violet' | 'turquoise' | 'terre';
export type Scheme = 'light' | 'dark';

export const ACCENTS: { id: Accent; label: string; light: string; dark: string }[] = [
  { id: 'bleu', label: 'Bleu GlycoLife', light: '#1565C0', dark: '#6CB4FF' },
  { id: 'vert', label: 'Vert santé', light: '#2E7D32', dark: '#7BCB80' },
  { id: 'violet', label: 'Violet', light: '#6A3FB5', dark: '#C3A6F5' },
  { id: 'turquoise', label: 'Turquoise', light: '#00796B', dark: '#5ED3C3' },
  { id: 'terre', label: 'Terre de Kinshasa', light: '#A4512A', dark: '#E8A57F' },
];

export interface Colors {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  primarySoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  chatBg: string;
  bubbleMine: string;
  bubbleTheirs: string;
  bubbleBot: string;
  read: string;
  // Statuts glycémiques
  hypoSevere: string;
  hypo: string;
  inRange: string;
  hyper: string;
  hyperSevere: string;
  // Graphiques (paire validée daltonisme : bleu / orange, + trait plein / pointillé)
  chartGrid: string;
  chartAxis: string;
  chartTarget: string;
  series1: string;
  series2: string;
  tooltipBg: string;
  tooltipText: string;
}

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

/** Mélange une couleur avec le fond (pour les fonds « doux »). */
export function mix(hex: string, bg: string, amount: number): string {
  const a = hexToRgb(hex);
  const b = hexToRgb(bg);
  const c = a.map((v, i) => Math.round(v * amount + b[i] * (1 - amount)));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}

export function buildColors(scheme: Scheme, accent: Accent, highContrast: boolean): Colors {
  const acc = ACCENTS.find((a) => a.id === accent) ?? ACCENTS[0];
  const primary = scheme === 'light' ? acc.light : acc.dark;

  if (scheme === 'light') {
    const bg = '#FFFFFF';
    return {
      bg,
      surface: '#FFFFFF',
      surfaceAlt: highContrast ? '#EDEDED' : '#F4F6F9',
      border: highContrast ? '#000000' : '#DDE2EA',
      text: '#000000',
      textMuted: highContrast ? '#1A1A1A' : '#4A5260',
      primary: highContrast ? mix(primary, '#000000', 0.8) : primary,
      onPrimary: '#FFFFFF',
      primarySoft: mix(primary, bg, 0.12),
      success: '#1B7F3B',
      successSoft: '#E3F4E8',
      warning: '#A85A00',
      warningSoft: '#FFF1DC',
      danger: '#C62828',
      dangerSoft: '#FDE7E7',
      chatBg: highContrast ? '#FFFFFF' : '#EFEAE2',
      bubbleMine: highContrast ? '#D6F0DA' : '#DCF8C6',
      bubbleTheirs: '#FFFFFF',
      bubbleBot: mix(primary, bg, 0.1),
      read: '#1E88E5',
      hypoSevere: '#B71C1C',
      hypo: '#D84315',
      inRange: '#1B7F3B',
      hyper: '#A86400',
      hyperSevere: '#B71C1C',
      chartGrid: highContrast ? '#9AA0A6' : '#E3E7ED',
      chartAxis: highContrast ? '#000000' : '#5F6773',
      chartTarget: highContrast ? '#BFE5C8' : '#E3F4E8',
      series1: '#1565C0',
      series2: '#D55E00',
      tooltipBg: '#111111',
      tooltipText: '#FFFFFF',
    };
  }
  const bg = highContrast ? '#000000' : '#0F1318';
  return {
    bg,
    surface: highContrast ? '#000000' : '#171C23',
    surfaceAlt: highContrast ? '#1A1A1A' : '#212832',
    border: highContrast ? '#FFFFFF' : '#2E3640',
    text: '#FFFFFF',
    textMuted: highContrast ? '#F0F0F0' : '#AEB6C2',
    primary,
    onPrimary: '#0B0E12',
    primarySoft: mix(primary, bg, 0.2),
    success: '#6FD08A',
    successSoft: '#163323',
    warning: '#F5B355',
    warningSoft: '#3A2A12',
    danger: '#FF8A80',
    dangerSoft: '#3D1A1A',
    chatBg: highContrast ? '#000000' : '#0B141A',
    bubbleMine: '#1F5C3A',
    bubbleTheirs: highContrast ? '#1A1A1A' : '#202C33',
    bubbleBot: mix(primary, bg, 0.22),
    read: '#53BDEB',
    hypoSevere: '#FF6B6B',
    hypo: '#FF9E6B',
    inRange: '#6FD08A',
    hyper: '#F5C055',
    hyperSevere: '#FF6B6B',
    chartGrid: highContrast ? '#8A8A8A' : '#2A323C',
    chartAxis: highContrast ? '#FFFFFF' : '#AEB6C2',
    chartTarget: highContrast ? '#1F4D2C' : '#173A25',
    series1: '#6CB4FF',
    series2: '#FFA94D',
    tooltipBg: '#F2F2F2',
    tooltipText: '#000000',
  };
}

export type TextSize = 'normal' | 'grand' | 'tres_grand';
export const TEXT_SCALE: Record<TextSize, number> = { normal: 1, grand: 1.18, tres_grand: 1.36 };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 18, pill: 999 };

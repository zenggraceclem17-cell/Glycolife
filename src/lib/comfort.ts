// Mots de réconfort contextuels (remplaçables par le module IA locale).
// Ton : direct, chaleureux, jamais culpabilisant. Renvoie toujours vers le médecin pour le traitement.
import { reconfortIA } from '@/ai';
import type { GlucoseReading, Language } from '@/data/types';
import { statusOf, type GlucoseStatus } from './glucose';

function pick<T>(list: T[], seed: string): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return list[h % list.length];
}

const FR: Record<GlucoseStatus, string[]> = {
  cible: [
    'Bravo, votre glycémie est dans la cible. Continuez comme ça 💪',
    'Très bien ! Cette mesure est dans la cible. Vous prenez soin de vous.',
    'Belle mesure ! Vos efforts portent leurs fruits.',
  ],
  hypo: [
    'Votre glycémie est basse. Règle des 15 : prenez 15 g de sucre rapide (3 morceaux de sucre ou ½ verre de jus/soda), puis remesurez dans 15 minutes.',
    "C'est un peu bas. Prenez 15 g de sucre rapide maintenant, asseyez-vous, et remesurez dans 15 minutes. Vous n'êtes pas seul.",
  ],
  hypo_severe: [
    "Glycémie très basse. Prenez tout de suite 15 g de sucre rapide et prévenez un proche. Si la personne est inconsciente : rien par la bouche, appelez les secours.",
  ],
  hyper: [
    "Votre glycémie est un peu haute. Buvez de l'eau, bougez un peu si vous le pouvez, et remesurez plus tard. Ça arrive, on continue ensemble.",
    "Un peu au-dessus de la cible. Pas d'inquiétude : notez ce que vous avez mangé, cela aidera votre médecin.",
  ],
  hyper_severe: [
    "Glycémie très haute. Buvez de l'eau, remesurez dans 1 heure. Si elle reste haute ou si vous vous sentez mal (vomissements, grande fatigue), contactez votre médecin ou allez à l'hôpital.",
  ],
};

const LN: Partial<Record<GlucoseStatus, string[]>> = {
  cible: ['Malamu mingi ! Sukali na yo ezali malamu. Kobanda bongo 💪'],
  hypo: ['Sukali ekiti. Lia sukali moke (bitini 3) to mele ndambo ya kopo ya jus, sima ya miniti 15 meka lisusu.'],
  hyper: ['Sukali emati moke. Mela mai, tambola moke soki okoki, meka lisusu sima.'],
};

const STREAK_FR = '🎉 3 mesures de suite dans la cible ! Vous pouvez être fier de vous.';
const STREAK_LN = '🎉 Mbala 3 na nsima sukali ezali malamu ! Osali malamu mingi.';

/** Nombre de mesures consécutives dans la cible, en terminant par `upTo`. */
export function streakInTarget(readings: GlucoseReading[], upTo: GlucoseReading, min: number, max: number): number {
  const sorted = readings.filter((r) => r.measured_at <= upTo.measured_at).sort((a, b) => b.measured_at.localeCompare(a.measured_at));
  let n = 0;
  for (const r of sorted) {
    if (statusOf(r.value_mgdl, min, max) !== 'cible') break;
    n++;
  }
  return n;
}

export function comfortFor(
  reading: GlucoseReading,
  all: GlucoseReading[],
  min: number,
  max: number,
  lang: Language,
): string {
  const status = statusOf(reading.value_mgdl, min, max);
  const streak = status === 'cible' ? streakInTarget(all, reading, min, max) : 0;
  const ai = reconfortIA({ reading, status, streakInTarget: streak, langue: lang });
  if (ai) return ai;
  if (streak > 0 && streak % 3 === 0) return lang === 'ln' ? STREAK_LN : STREAK_FR;
  const list = (lang === 'ln' ? LN[status] : undefined) ?? FR[status];
  let msg = pick(list, reading.id);
  if (status === 'cible' && reading.feelings.some((f) => f !== 'bien'))
    msg += ' Vous ne vous sentez pas très bien : reposez-vous et parlez-en à un proche si ça continue.';
  return msg;
}

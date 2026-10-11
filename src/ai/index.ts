// Point d'intégration du module d'IA LOCALE (fourni par une autre partie de l'équipe).
// Aucune IA en ligne : le module tourne sur le téléphone.
//
// Pour brancher le module :
//   import { brancherIA, brancherReconfort } from '@/ai';
//   brancherIA(monAnalyseur);          // dans src/app/_layout.tsx par exemple
//   brancherReconfort(mesMotsDeReconfort);
import type { GlucoseReading, MedicalProfile } from '@/data/types';
import type { GlucoseStatus } from '@/lib/glucose';

export interface AnalyseIA {
  niveauRisque: 'faible' | 'modere' | 'eleve';
  resume: string;
  tendance?: string;
  prevision7j?: number[]; // mg/dL
  conseils?: string[];
}

export type Analyseur = (readings: GlucoseReading[], medical: MedicalProfile | null) => AnalyseIA | null;

export interface ContexteReconfort {
  reading: GlucoseReading;
  status: GlucoseStatus;
  streakInTarget: number;
  langue: 'fr' | 'ln';
}
export type FournisseurReconfort = (ctx: ContexteReconfort) => string | null;

let analyseur: Analyseur | null = null;
let reconfort: FournisseurReconfort | null = null;

export function brancherIA(fn: Analyseur | null) {
  analyseur = fn;
}

export function brancherReconfort(fn: FournisseurReconfort | null) {
  reconfort = fn;
}

/** Renvoie null tant que le module n'est pas branché : l'app affiche « bientôt ». */
export function analyser(readings: GlucoseReading[], medical: MedicalProfile | null): AnalyseIA | null {
  if (!analyseur) return null;
  try {
    return analyseur(readings, medical);
  } catch {
    return null;
  }
}

export function reconfortIA(ctx: ContexteReconfort): string | null {
  if (!reconfort) return null;
  try {
    return reconfort(ctx);
  } catch {
    return null;
  }
}

// Dossier médical : questionnaire en 7 étapes, une question par écran, gros boutons.
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Chip, Field, Row, Screen, T } from '@/components/ui';
import { useActions } from '@/data/actions';
import { FOODS } from '@/data/foods';
import { medicalOf } from '@/data/selectors';
import { useData, useSession } from '@/data/store';
import type { Activity, DiabetesType, MedicalProfile } from '@/data/types';
import { useT } from '@/i18n';
import { fmtNumber, fromUnit, parseNumber, toUnit, HYPER_SEVERE, HYPO_SEVERE } from '@/lib/glucose';
import { useSettings, useTheme } from '@/theme/settings';
import { radius, space } from '@/theme/tokens';

const TREATMENTS = ['Metformine', 'Gliclazide', 'Glibenclamide', 'Insuline', 'Régime seul', 'Plantes / tisanes'];
const ALLERGIES = ['Pénicilline', 'Sulfamides', 'Aspirine', 'Arachides', 'Fruits de mer'];
const BLOOD = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'Je ne sais pas'];
const TYPES: { v: DiabetesType; l: string }[] = [
  { v: 'type1', l: 'Type 1' },
  { v: 'type2', l: 'Type 2' },
  { v: 'gestationnel', l: 'Diabète de grossesse' },
  { v: 'autre', l: 'Autre' },
  { v: 'inconnu', l: 'Je ne sais pas' },
];
const ACTIVITIES: { v: Activity; l: string }[] = [
  { v: 'faible', l: 'Peu (je marche peu)' },
  { v: 'moderee', l: 'Moyenne (marche chaque jour)' },
  { v: 'elevee', l: 'Beaucoup (travail physique, sport)' },
];

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export default function Dossier() {
  const t = useT();
  const { c } = useTheme();
  const { settings } = useSettings();
  const { db } = useData();
  const session = useSession();
  const actions = useActions();
  const [m, setM] = useState<MedicalProfile>(() => medicalOf(db, session.userId));
  const [step, setStep] = useState(0);
  const set = (patch: Partial<MedicalProfile>) => setM((p) => ({ ...p, ...patch }));
  const unit = settings.unit;
  const dec = unit === 'g/L' ? 2 : 0;
  const [minText, setMinText] = useState(fmtNumber(toUnit(m.target_min, unit), dec));
  const [maxText, setMaxText] = useState(fmtNumber(toUnit(m.target_max, unit), dec));

  const targetMin = fromUnit(parseNumber(minText) ?? 0, unit);
  const targetMax = fromUnit(parseNumber(maxText) ?? 0, unit);
  const targetOk = targetMin >= HYPO_SEVERE && targetMax <= HYPER_SEVERE && targetMin < targetMax;

  const steps: { title: string; body: React.ReactNode; ok?: boolean }[] = [
    {
      title: 'Parlons de vous',
      body: (
        <>
          <Field
            label="Année de naissance"
            keyboardType="number-pad"
            value={m.birth_year ? String(m.birth_year) : ''}
            onChangeText={(v) => set({ birth_year: Number(v.replace(/\D/g, '').slice(0, 4)) || null })}
            placeholder="Ex. 1965"
          />
          <T muted>Vous êtes :</T>
          <Row style={{ flexWrap: 'wrap' }}>
            <Chip label="Une femme" selected={m.sex === 'F'} onPress={() => set({ sex: 'F' })} />
            <Chip label="Un homme" selected={m.sex === 'M'} onPress={() => set({ sex: 'M' })} />
          </Row>
        </>
      ),
    },
    {
      title: 'Votre diabète',
      body: (
        <>
          <Row style={{ flexWrap: 'wrap' }}>
            {TYPES.map((x) => (
              <Chip key={x.v} label={x.l} selected={m.diabetes_type === x.v} onPress={() => set({ diabetes_type: x.v })} />
            ))}
          </Row>
          <Field
            label="Depuis quelle année ?"
            keyboardType="number-pad"
            value={m.diagnosis_year ? String(m.diagnosis_year) : ''}
            onChangeText={(v) => set({ diagnosis_year: Number(v.replace(/\D/g, '').slice(0, 4)) || null })}
            placeholder="Ex. 2015"
          />
        </>
      ),
    },
    {
      title: 'Vos traitements',
      body: (
        <>
          <T muted>Touchez tout ce que vous prenez.</T>
          <Row style={{ flexWrap: 'wrap' }}>
            {TREATMENTS.map((x) => (
              <Chip key={x} label={x} selected={m.treatments.includes(x)} onPress={() => set({ treatments: toggle(m.treatments, x) })} />
            ))}
          </Row>
        </>
      ),
    },
    {
      title: 'Vos allergies',
      body: (
        <>
          <Row style={{ flexWrap: 'wrap' }}>
            <Chip label={t('none')} selected={m.allergies.length === 0 && !m.other_allergy} onPress={() => set({ allergies: [], other_allergy: null })} />
            {ALLERGIES.map((x) => (
              <Chip key={x} label={x} selected={m.allergies.includes(x)} onPress={() => set({ allergies: toggle(m.allergies, x) })} />
            ))}
          </Row>
          <Field label="Autre allergie" value={m.other_allergy ?? ''} onChangeText={(v) => set({ other_allergy: v || null })} />
        </>
      ),
    },
    {
      title: 'Vos repas',
      body: (
        <>
          <T muted>Combien de repas par jour ?</T>
          <Row style={{ flexWrap: 'wrap' }}>
            {[1, 2, 3, 4].map((n) => (
              <Chip key={n} label={n === 4 ? '4 ou plus' : String(n)} selected={m.meals_per_day === n} onPress={() => set({ meals_per_day: n })} />
            ))}
          </Row>
          <T muted>Ce que vous mangez souvent :</T>
          <Row style={{ flexWrap: 'wrap' }}>
            {FOODS.map((f) => (
              <Chip key={f.id} label={f.name} selected={m.usual_foods.includes(f.id)} onPress={() => set({ usual_foods: toggle(m.usual_foods, f.id) })} />
            ))}
          </Row>
        </>
      ),
    },
    {
      title: 'Activité et groupe sanguin',
      body: (
        <>
          <T muted>Vous bougez :</T>
          {ACTIVITIES.map((a) => (
            <Chip key={a.v} label={a.l} selected={m.activity === a.v} onPress={() => set({ activity: a.v })} />
          ))}
          <T muted>Groupe sanguin :</T>
          <Row style={{ flexWrap: 'wrap' }}>
            {BLOOD.map((b) => (
              <Chip key={b} label={b} selected={(m.blood_group ?? 'Je ne sais pas') === b} onPress={() => set({ blood_group: b === 'Je ne sais pas' ? null : b })} />
            ))}
          </Row>
        </>
      ),
    },
    {
      title: 'Urgence et cible',
      ok: targetOk,
      body: (
        <>
          <Field label="Personne à prévenir" value={m.emergency_name ?? ''} onChangeText={(v) => set({ emergency_name: v || null })} placeholder="Ex. Patrick (fils)" />
          <Field label="Son téléphone" keyboardType="phone-pad" value={m.emergency_phone ?? ''} onChangeText={(v) => set({ emergency_phone: v || null })} placeholder="+243…" />
          <T muted>Cible fixée avec votre médecin ({unit}) :</T>
          <Row>
            <View style={{ flex: 1 }}>
              <Field label="Minimum" keyboardType="decimal-pad" value={minText} onChangeText={setMinText} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Maximum" keyboardType="decimal-pad" value={maxText} onChangeText={setMaxText} />
            </View>
          </Row>
          {!targetOk ? (
            <T color={c.danger} v="small">
              La cible doit rester entre {fmtNumber(toUnit(HYPO_SEVERE, unit), dec)} et {fmtNumber(toUnit(HYPER_SEVERE, unit), dec)} {unit}.
            </T>
          ) : (
            <T v="small" muted>
              Par défaut : {fmtNumber(toUnit(70, unit), dec)} – {fmtNumber(toUnit(180, unit), dec)} {unit}. Ne la changez que sur avis médical.
            </T>
          )}
        </>
      ),
    },
  ];

  const cur = steps[step];
  const last = step === steps.length - 1;

  const finish = () => {
    actions.saveMedical({ ...m, target_min: targetMin, target_max: targetMax, unit });
    router.back();
  };

  return (
    <Screen>
      <Row gap={4}>
        {steps.map((_, i) => (
          <View key={i} style={{ flex: 1, height: 6, borderRadius: radius.pill, backgroundColor: i <= step ? c.primary : c.border }} />
        ))}
      </Row>
      <T v="small" muted>
        Étape {step + 1} sur {steps.length}
      </T>
      <T v="title">{cur.title}</T>
      <View style={{ gap: space.sm }}>{cur.body}</View>
      <Row style={{ marginTop: space.lg }}>
        {step > 0 ? <Button style={{ flex: 1 }} variant="secondary" label={t('back')} onPress={() => setStep(step - 1)} /> : null}
        <Button
          style={{ flex: 2 }}
          big
          label={last ? t('finish') : t('next')}
          icon={last ? 'checkmark' : 'arrow-forward'}
          disabled={cur.ok === false}
          onPress={() => (last ? finish() : setStep(step + 1))}
        />
      </Row>
    </Screen>
  );
}

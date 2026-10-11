import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Card, Chip, Field, Notice, Row, Screen, SectionTitle, T } from '@/components/ui';
import { useActions } from '@/data/actions';
import { FOOD_BY_ID, FOODS, isTracked, MEAL_LOAD_LABEL, mealLoad } from '@/data/foods';
import { foodImpacts, medicalOf, mealsOf } from '@/data/selectors';
import { useData, useSession } from '@/data/store';
import type { MealItem } from '@/data/types';
import { fmtDayLabel, fmtTime, minutesAgo } from '@/lib/dates';
import { confirmAsk } from '@/lib/dialog';
import { fmtGlucose } from '@/lib/glucose';
import { useSettings, useTheme } from '@/theme/settings';
import { radius, space } from '@/theme/tokens';

const OFFSETS = [0, 60, 120];

export default function Repas() {
  const { c, fs } = useTheme();
  const { settings } = useSettings();
  const { db } = useData();
  const session = useSession();
  const actions = useActions();
  const me = session.userId;
  const medical = medicalOf(db, me);
  const [portions, setPortions] = useState<Record<string, number>>({});
  const [offset, setOffset] = useState(0);
  const [note, setNote] = useState('');

  const items: MealItem[] = Object.entries(portions)
    .filter(([, n]) => n > 0)
    .map(([id, n]) => ({ food_id: id, name: FOOD_BY_ID[id].name, portions: n, carbs: FOOD_BY_ID[id].carbs }));
  const carbs = items.reduce((s, i) => s + i.carbs * i.portions, 0);
  const load = mealLoad(carbs);
  const loadCol = { leger: c.success, modere: c.warning, riche: c.danger }[load];

  const meals = mealsOf(db, me).slice(0, 10);
  const impacts = useMemo(
    () => foodImpacts(db, me, new Set(FOODS.filter(isTracked).map((f) => f.id)), medical.target_max),
    [db, me, medical.target_max],
  );

  const change = (id: string, d: number) =>
    setPortions((p) => ({ ...p, [id]: Math.max(0, Math.min(5, (p[id] ?? 0) + d)) }));

  const save = () => {
    actions.addMeal(items, minutesAgo(offset).toISOString(), note.trim() || null);
    setPortions({});
    setNote('');
  };

  return (
    <Screen>
      <T muted>Touchez + pour ajouter une portion. Les glucides sont des estimations à valider avec un professionnel de santé.</T>
      <Card style={{ gap: 0, paddingVertical: space.sm }}>
        {FOODS.map((f) => {
          const n = portions[f.id] ?? 0;
          return (
            <Row key={f.id} style={{ paddingVertical: 6, borderBottomWidth: 1, borderColor: c.border }} gap={space.sm}>
              <View style={{ flex: 1 }}>
                <T v={n ? 'bodyBold' : 'body'}>{f.name}</T>
                <T v="caption" muted>
                  {f.portion} · ≈ {f.carbs} g glucides
                </T>
              </View>
              {n > 0 ? (
                <>
                  <Pressable accessibilityLabel={`Retirer ${f.name}`} onPress={() => change(f.id, -1)} hitSlop={6}>
                    <Ionicons name="remove-circle-outline" size={fs(32)} color={c.primary} />
                  </Pressable>
                  <T v="h2" style={{ minWidth: 22, textAlign: 'center' }}>
                    {n}
                  </T>
                </>
              ) : null}
              <Pressable accessibilityLabel={`Ajouter ${f.name}`} onPress={() => change(f.id, 1)} hitSlop={6}>
                <Ionicons name="add-circle" size={fs(32)} color={c.primary} />
              </Pressable>
            </Row>
          );
        })}
      </Card>

      {items.length > 0 ? (
        <Card style={{ borderColor: loadCol, borderWidth: 2 }}>
          <T v="h2">≈ {carbs} g de glucides</T>
          <T v="bodyBold" color={loadCol}>
            {MEAL_LOAD_LABEL[load]}
          </T>
          <T v="small" muted>
            {items.map((i) => `${i.portions > 1 ? `${i.portions}× ` : ''}${i.name}`).join(', ')}
          </T>
          <Row style={{ flexWrap: 'wrap' }}>
            {OFFSETS.map((m) => (
              <Chip key={m} label={m === 0 ? 'Maintenant' : `Il y a ${m / 60} h`} selected={offset === m} onPress={() => setOffset(m)} />
            ))}
          </Row>
          <Field label="Note (facultatif)" value={note} onChangeText={setNote} placeholder="Ex. fête de famille" />
          <Button big icon="checkmark" label="Enregistrer le repas" onPress={save} />
        </Card>
      ) : null}

      <SectionTitle>Effet de vos aliments</SectionTitle>
      <T v="small" muted>
        Glycémie moyenne mesurée 1 à 3 h après les repas contenant chaque aliment (sans IA).
      </T>
      {impacts.length === 0 ? (
        <Notice>Enregistrez vos repas et mesurez 1 à 2 h après : GlycoLife vous montrera l’effet de chaque aliment.</Notice>
      ) : (
        <Card style={{ gap: space.xs }}>
          {impacts.slice(0, 8).map((i) => (
            <Row key={i.foodId} style={{ justifyContent: 'space-between' }}>
              <T v={i.overTarget ? 'bodyBold' : 'body'}>
                {i.overTarget ? '⚠ ' : ''}
                {i.name} <T v="caption" muted>({i.meals} repas)</T>
              </T>
              <T v="bodyBold" color={i.overTarget ? c.hyper : c.inRange}>
                {fmtGlucose(i.avgAfter, settings.unit)}
              </T>
            </Row>
          ))}
          {impacts.filter((i) => i.overTarget).slice(0, 2).map((i) => (
            <Notice key={`n${i.foodId}`} tone="warning" icon="bulb-outline">
              Après les repas avec « {i.name} », votre glycémie dépasse souvent la cible. Essayez une portion plus petite avec plus de légumes, et
              parlez-en à votre médecin.
            </Notice>
          ))}
        </Card>
      )}

      <SectionTitle>Derniers repas</SectionTitle>
      {meals.map((m) => (
        <Pressable
          key={m.id}
          onLongPress={() => confirmAsk('Supprimer ce repas ?', m.items.map((i) => i.name).join(', '), 'Supprimer', () => actions.deleteMeal(m.id))}
          style={{ padding: space.md, borderRadius: radius.md, backgroundColor: c.surfaceAlt }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T v="bodyBold">
              {fmtDayLabel(m.eaten_at)} · {fmtTime(m.eaten_at)}
            </T>
            <T v="small" color={{ leger: c.success, modere: c.warning, riche: c.danger }[mealLoad(m.carbs_total)]}>
              ≈ {m.carbs_total} g
            </T>
          </Row>
          <T v="small" muted>
            {m.items.map((i) => i.name).join(', ')}
          </T>
        </Pressable>
      ))}
    </Screen>
  );
}

// Saisie d'une glycémie — objectif : moins d'une minute pour un novice.
// Un grand chiffre, + / −, statut en direct ; le reste est déjà pré-rempli.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, Pressable, TextInput, View } from 'react-native';

import { Bubble } from '@/components/chat';
import { Button, Card, Chip, Field, Row, Screen, StatusPill, statusColor, T } from '@/components/ui';
import { useActions } from '@/data/actions';
import { medicalOf, readingsOf } from '@/data/selectors';
import { useData, useSession } from '@/data/store';
import type { Feeling, GlucoseReading, Moment } from '@/data/types';
import { useT } from '@/i18n';
import { comfortFor } from '@/lib/comfort';
import { minutesAgo } from '@/lib/dates';
import {
  fmtGlucose,
  fmtNumber,
  fromUnit,
  guessMoment,
  isSevere,
  MAX_MGDL,
  MIN_MGDL,
  MOMENTS,
  parseNumber,
  statusOf,
  stepFor,
  toUnit,
} from '@/lib/glucose';
import { useSettings, useTheme } from '@/theme/settings';
import { radius, space } from '@/theme/tokens';

const FEELINGS: Feeling[] = ['bien', 'fatigue', 'vertiges', 'soif', 'transpiration', 'faim'];
const OFFSETS = [0, 30, 60, 120]; // minutes

export default function Mesure() {
  const t = useT();
  const { c, fs } = useTheme();
  const { settings } = useSettings();
  const { db } = useData();
  const session = useSession();
  const actions = useActions();
  const unit = settings.unit;
  const medical = medicalOf(db, session.userId);
  const readings = useMemo(() => readingsOf(db, session.userId), [db, session.userId]);
  const last = readings[readings.length - 1];
  const dec = unit === 'g/L' ? 2 : 0;

  const [text, setText] = useState(fmtNumber(toUnit(last?.value_mgdl ?? 100, unit), dec));
  const [offset, setOffset] = useState(0);
  const [moment, setMoment] = useState<Moment>(guessMoment());
  const [feelings, setFeelings] = useState<Feeling[]>([]);
  const [meal, setMeal] = useState('');
  const [note, setNote] = useState('');
  const [details, setDetails] = useState(false);
  const [saved, setSaved] = useState<GlucoseReading | null>(null);

  const parsed = parseNumber(text);
  const mgdl = parsed === null ? null : fromUnit(parsed, unit);
  const valid = mgdl !== null && mgdl >= MIN_MGDL && mgdl <= MAX_MGDL;
  const status = valid ? statusOf(mgdl, medical.target_min, medical.target_max) : null;

  const step = (dir: 1 | -1) => {
    const base = parsed ?? toUnit(100, unit);
    const next = Math.max(toUnit(MIN_MGDL, unit), Math.min(toUnit(MAX_MGDL, unit), base + dir * stepFor(unit)));
    setText(fmtNumber(next, dec));
  };

  const changeOffset = (m: number) => {
    setOffset(m);
    setMoment(guessMoment(minutesAgo(m)));
  };

  const toggleFeeling = (f: Feeling) =>
    setFeelings((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev.filter((x) => (f === 'bien' ? false : x !== 'bien')), f]));

  const save = () => {
    if (!valid || mgdl === null) return;
    const r = actions.addReading({
      value_mgdl: mgdl,
      moment,
      feelings,
      meal: meal.trim() || null,
      note: note.trim() || null,
      measured_at: minutesAgo(offset).toISOString(),
    });
    setSaved(r);
  };

  // ---------- Résultat ----------
  if (saved) {
    const s = statusOf(saved.value_mgdl, medical.target_min, medical.target_max);
    const col = statusColor(c, s);
    const message = comfortFor(saved, [...readings, saved], medical.target_min, medical.target_max, settings.language);
    return (
      <Screen>
        <View style={{ alignItems: 'center', gap: space.sm, marginTop: space.lg }}>
          <Ionicons name="checkmark-circle" size={fs(56)} color={c.success} />
          <T v="h2">{t('saved')}</T>
          <T v="display" color={col}>
            {fmtGlucose(saved.value_mgdl, unit)}
          </T>
          <StatusPill status={s} big />
        </View>
        <View style={{ backgroundColor: c.chatBg, borderRadius: radius.lg, padding: space.md }}>
          <Bubble side="bot" title={t('glycolife_says')} text={message} />
        </View>
        {isSevere(s) && medical.emergency_phone ? (
          <Button
            variant="danger"
            big
            icon="call"
            label={t('call_emergency', { name: medical.emergency_name ?? '' })}
            onPress={() => Linking.openURL(`tel:${medical.emergency_phone}`)}
          />
        ) : null}
        <Button label={t('back_home')} icon="home-outline" big onPress={() => router.back()} />
        <Button
          label={t('add_another')}
          variant="ghost"
          onPress={() => {
            setSaved(null);
            setFeelings([]);
            setMeal('');
            setNote('');
          }}
        />
        <T v="caption" muted center>
          {t('disclaimer')}
        </T>
      </Screen>
    );
  }

  // ---------- Saisie ----------
  const statusCol = status ? statusColor(c, status) : c.border;
  return (
    <Screen>
      <Card style={{ alignItems: 'center', borderColor: statusCol, borderWidth: 2 }}>
        <T v="small" muted>
          {t('your_value')} ({unit})
        </T>
        <Row gap={space.md}>
          <StepButton icon="remove" onPress={() => step(-1)} label="Moins" />
          <TextInput
            value={text}
            onChangeText={setText}
            keyboardType="decimal-pad"
            selectTextOnFocus
            accessibilityLabel={`${t('your_value')} en ${unit}`}
            style={{
              fontSize: fs(52),
              fontWeight: '800',
              color: status ? statusCol : c.text,
              textAlign: 'center',
              minWidth: 150,
              paddingVertical: 4,
              borderBottomWidth: 2,
              borderColor: c.border,
            }}
          />
          <StepButton icon="add" onPress={() => step(1)} label="Plus" />
        </Row>
        {status ? <StatusPill status={status} big /> : <T color={c.danger}>{t('invalid_value')}</T>}
      </Card>

      <T v="bodyBold">{t('when')}</T>
      <Row style={{ flexWrap: 'wrap' }}>
        {OFFSETS.map((m) => (
          <Chip
            key={m}
            label={m === 0 ? t('now') : m < 60 ? t('min_ago', { n: m }) : t('hour_ago', { n: m / 60 })}
            selected={offset === m}
            onPress={() => changeOffset(m)}
          />
        ))}
      </Row>

      <T v="bodyBold">{t('moment')}</T>
      <Row style={{ flexWrap: 'wrap' }}>
        {MOMENTS.map((m) => (
          <Chip key={m} label={t(`moment_${m}`)} selected={moment === m} onPress={() => setMoment(m)} />
        ))}
      </Row>

      <T v="bodyBold">{t('how_feel')}</T>
      <Row style={{ flexWrap: 'wrap' }}>
        {FEELINGS.map((f) => (
          <Chip key={f} label={t(`feel_${f}`)} selected={feelings.includes(f)} onPress={() => toggleFeeling(f)} />
        ))}
      </Row>

      {details ? (
        <View>
          <Field label={t('meal_label')} placeholder={t('meal_placeholder')} value={meal} onChangeText={setMeal} />
          <Field label={t('note_label')} placeholder={t('note_placeholder')} value={note} onChangeText={setNote} multiline />
        </View>
      ) : (
        <Button variant="ghost" icon="create-outline" label={t('more_details')} onPress={() => setDetails(true)} />
      )}

      <Button label={t('save')} icon="checkmark" big disabled={!valid} onPress={save} />
    </Screen>
  );
}

function StepButton({ icon, onPress, label }: { icon: 'add' | 'remove'; onPress: () => void; label: string }) {
  const { c, fs } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: c.primarySoft,
        borderWidth: 1.5,
        borderColor: c.primary,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}>
      <Ionicons name={icon} size={fs(30)} color={c.primary} />
    </Pressable>
  );
}

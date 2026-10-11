// Composants glycémie partagés par le patient et l'accompagnateur.
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import type { GlucoseReading } from '@/data/types';
import { useT } from '@/i18n';
import { dayKey, fmtDayLabel, fmtTime } from '@/lib/dates';
import { computeStats, fmtGlucose, fmtNumber, MOMENTS, statusOf, toUnit } from '@/lib/glucose';
import { useSettings, useTheme } from '@/theme/settings';
import { radius, space } from '@/theme/tokens';
import { BarChart, dayRange, LineChart } from './charts';
import { Card, Row, SectionTitle, Segmented, Stat, StatusPill, statusColor, T } from './ui';

export type Period = 7 | 30 | 90;

export function GlucoseChart({
  readings,
  days,
  targetMin,
  targetMax,
  height,
}: {
  readings: GlucoseReading[];
  days: Period;
  targetMin: number;
  targetMax: number;
  height?: number;
}) {
  const { c } = useTheme();
  const { settings } = useSettings();
  const t = useT();
  const unit = settings.unit;
  const { start, end, ticks } = dayRange(days);
  const pts = readings
    .filter((r) => new Date(r.measured_at).getTime() >= start)
    .map((r) => {
      const s = statusOf(r.value_mgdl, targetMin, targetMax);
      return {
        x: new Date(r.measured_at).getTime(),
        y: toUnit(r.value_mgdl, unit),
        color: statusColor(c, s),
        label: `${fmtGlucose(r.value_mgdl, unit)}\n${fmtDayLabel(r.measured_at)} ${fmtTime(r.measured_at)}\n${t(`moment_${r.moment}`)} · ${t(`status_${s}`)}`,
      };
    });
  return (
    <LineChart
      series={[{ key: 'gly', label: t('your_value'), color: c.series1, points: pts }]}
      unit={unit}
      xStart={start}
      xEnd={end}
      xTicks={ticks}
      height={height}
      targetBand={settings.chartTarget ? [toUnit(targetMin, unit), toUnit(targetMax, unit)] : null}
      yMinHint={toUnit(60, unit)}
      yMaxHint={toUnit(200, unit)}
      showPoints={settings.chartPoints}
      showGrid={settings.chartGrid}
      connect={days <= 30}
      accessibilityLabel={`Courbe de glycémie sur ${days} jours, ${pts.length} mesures`}
    />
  );
}

export function LastReadingCard({
  reading,
  targetMin,
  targetMax,
}: {
  reading: GlucoseReading | null;
  targetMin: number;
  targetMax: number;
}) {
  const { c } = useTheme();
  const { settings } = useSettings();
  const t = useT();
  if (!reading)
    return (
      <Card>
        <T v="small" muted>
          {t('last_reading')}
        </T>
        <T v="bodyBold">{t('no_reading')}</T>
        <T muted>{t('no_reading_hint')}</T>
      </Card>
    );
  const s = statusOf(reading.value_mgdl, targetMin, targetMax);
  const col = statusColor(c, s);
  return (
    <Card style={{ borderLeftWidth: 8, borderLeftColor: col }} accessibilityLabel={t('last_reading')}>
      <T v="small" muted>
        {t('last_reading')}
      </T>
      <Row style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <T v="display" color={col}>
          {fmtGlucose(reading.value_mgdl, settings.unit, false)}
        </T>
        <T v="h2" muted style={{ marginBottom: 6 }}>
          {settings.unit}
        </T>
      </Row>
      <StatusPill status={s} big />
      <T muted>
        {t(`moment_${reading.moment}`)} · {fmtDayLabel(reading.measured_at, settings.language)} {fmtTime(reading.measured_at)}
      </T>
    </Card>
  );
}

export function ReadingRow({
  reading,
  targetMin,
  targetMax,
  onLongPress,
}: {
  reading: GlucoseReading;
  targetMin: number;
  targetMax: number;
  onLongPress?: () => void;
}) {
  const { c } = useTheme();
  const { settings } = useSettings();
  const t = useT();
  const s = statusOf(reading.value_mgdl, targetMin, targetMax);
  const extras = [
    ...reading.feelings.filter((f) => f !== 'bien').map((f) => t(`feel_${f}`)),
    reading.meal,
    reading.note,
  ].filter(Boolean);
  return (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={450}
      accessibilityHint={onLongPress ? t('long_press_delete') : undefined}
      style={({ pressed }) => ({
        flexDirection: 'row',
        gap: space.md,
        alignItems: 'center',
        paddingVertical: space.sm,
        borderBottomWidth: 1,
        borderColor: c.border,
        opacity: pressed ? 0.6 : 1,
      })}>
      <T v="bodyBold" style={{ width: 52 }}>
        {fmtTime(reading.measured_at)}
      </T>
      <View style={{ flex: 1, gap: 2 }}>
        <Row style={{ flexWrap: 'wrap' }}>
          <T v="h2" color={statusColor(c, s)}>
            {fmtGlucose(reading.value_mgdl, settings.unit)}
          </T>
          <StatusPill status={s} />
        </Row>
        <T v="small" muted>
          {t(`moment_${reading.moment}`)}
          {extras.length ? ` · ${extras.join(' · ')}` : ''}
        </T>
      </View>
    </Pressable>
  );
}

/** Bilans complets : période, courbe, statistiques, moyennes par moment, historique. */
export function ReportsView({
  readings,
  targetMin,
  targetMax,
  onDelete,
  header,
}: {
  readings: GlucoseReading[];
  targetMin: number;
  targetMax: number;
  onDelete?: (r: GlucoseReading) => void;
  header?: React.ReactNode;
}) {
  const { c } = useTheme();
  const { settings } = useSettings();
  const t = useT();
  const [days, setDays] = useState<Period>(settings.defaultPeriod);
  const unit = settings.unit;
  const { start } = dayRange(days);
  const inPeriod = useMemo(() => readings.filter((r) => new Date(r.measured_at).getTime() >= start), [readings, start]);
  const st = computeStats(inPeriod, targetMin, targetMax);
  const fmt = (v: number | null) => (v === null ? '—' : fmtGlucose(v, unit, false));

  const byMoment = MOMENTS.map((m) => {
    const list = inPeriod.filter((r) => r.moment === m);
    const mean = list.length ? list.reduce((s, r) => s + r.value_mgdl, 0) / list.length : null;
    return {
      label: t(`moment_${m}`),
      value: mean === null ? null : toUnit(mean, unit),
      color: mean === null ? c.textMuted : statusColor(c, statusOf(mean, targetMin, targetMax)),
      valueLabel: mean === null ? undefined : fmtGlucose(mean, unit, false),
    };
  });

  const groups = useMemo(() => {
    const map = new Map<string, GlucoseReading[]>();
    for (const r of [...inPeriod].reverse()) {
      const k = dayKey(r.measured_at);
      map.set(k, [...(map.get(k) ?? []), r]);
    }
    return [...map.entries()];
  }, [inPeriod]);

  return (
    <View style={{ gap: space.md }}>
      {header}
      <Segmented<Period>
        options={[
          { value: 7, label: t('period_7') },
          { value: 30, label: t('period_30') },
          { value: 90, label: t('period_90') },
        ]}
        value={days}
        onChange={setDays}
      />
      <Card>
        <GlucoseChart readings={readings} days={days} targetMin={targetMin} targetMax={targetMax} height={240} />
        {settings.chartTarget ? (
          <Row gap={6}>
            <View style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: c.chartTarget, borderWidth: 1, borderColor: c.inRange }} />
            <T v="small" muted>
              {t('target_zone')} : {fmtGlucose(targetMin, unit, false)} – {fmtGlucose(targetMax, unit)}
            </T>
          </Row>
        ) : null}
      </Card>

      {st.count === 0 ? (
        <Card>
          <T muted center>
            {t('no_data_period')}
          </T>
        </Card>
      ) : (
        <>
          <Row>
            <Stat label={`${t('average')} (${unit})`} value={fmt(st.mean)} />
            <Stat label={t('in_target')} value={`${st.pctInTarget}%`} color={c.success} />
            <Stat label={t('readings_count')} value={String(st.count)} />
          </Row>
          <Row>
            <Stat label={t('minimum')} value={fmt(st.min)} />
            <Stat label={t('maximum')} value={fmt(st.max)} />
            <Stat label={t('hypos')} value={String(st.hypos)} color={st.hypos ? c.hypo : undefined} />
            <Stat label={t('hypers')} value={String(st.hypers)} color={st.hypers ? c.hyper : undefined} />
          </Row>
          <SectionTitle>{t('by_moment')}</SectionTitle>
          <Card>
            <BarChart
              bars={byMoment}
              unit={unit}
              showGrid={settings.chartGrid}
              targetBand={settings.chartTarget ? [toUnit(targetMin, unit), toUnit(targetMax, unit)] : null}
              accessibilityLabel={byMoment.map((b) => `${b.label} ${b.valueLabel ?? 'aucune mesure'}`).join(', ')}
            />
          </Card>
        </>
      )}

      <SectionTitle>{t('history')}</SectionTitle>
      {onDelete ? (
        <Row gap={6}>
          <Ionicons name="hand-left-outline" size={16} color={c.textMuted} />
          <T v="small" muted>
            {t('long_press_delete')}
          </T>
        </Row>
      ) : null}
      {groups.map(([k, list]) => {
        const mean = list.reduce((s, r) => s + r.value_mgdl, 0) / list.length;
        return (
          <Card key={k} style={{ gap: 0 }}>
            <Row style={{ justifyContent: 'space-between', marginBottom: space.xs }}>
              <T v="bodyBold">{fmtDayLabel(list[0].measured_at, settings.language)}</T>
              <View style={{ backgroundColor: c.surfaceAlt, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 }}>
                <T v="caption" muted>
                  {t('average')} {fmtGlucose(mean, unit)}
                </T>
              </View>
            </Row>
            {list.map((r) => (
              <ReadingRow key={r.id} reading={r} targetMin={targetMin} targetMax={targetMax} onLongPress={onDelete ? () => onDelete(r) : undefined} />
            ))}
          </Card>
        );
      })}
    </View>
  );
}

export function fmtPct(n: number | null): string {
  return n === null ? '—' : `${fmtNumber(n, 0)}%`;
}

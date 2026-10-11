// Graphiques faits main (react-native-svg) : légers et 100 % hors ligne.
// Règles : un seul axe vertical gradué avec l'unité, axe des dates, zone cible en vert,
// repères en pointillés, légende dès 2 séries, info-bulle au toucher d'un point.
import React, { useState } from 'react';
import { Pressable, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import { addDays, fmtDayShort, startOfDay } from '@/lib/dates';
import { fmtNumber } from '@/lib/glucose';
import { useTheme } from '@/theme/settings';
import { space } from '@/theme/tokens';
import { Row, T } from './ui';

export interface ChartPoint {
  x: number; // timestamp ms
  y: number; // valeur dans l'unité affichée
  color?: string;
  label?: string; // texte de l'info-bulle
}

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
  dashed?: boolean;
  points: ChartPoint[];
}

/** Graduations « rondes » couvrant [min, max]. */
export function niceTicks(min: number, max: number, count = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const raw = (max - min) / (count - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  const start = Math.floor(min / step) * step;
  const out: number[] = [];
  for (let v = start; v <= max + step * 0.001; v += step) out.push(Math.round(v * 1e6) / 1e6);
  if (out[out.length - 1] < max) out.push(out[out.length - 1] + step);
  return out;
}

/** Repères de dates : chaque jour (7 j), tous les 5 jours (30 j), tous les 15 jours (3 mois). */
export function dayRange(days: number): { start: number; end: number; ticks: number[] } {
  const end = startOfDay(addDays(new Date(), 1)).getTime();
  const start = startOfDay(addDays(new Date(), -(days - 1))).getTime();
  const every = days <= 7 ? 1 : days <= 31 ? 5 : 15;
  const ticks: number[] = [];
  // Repères ancrés sur aujourd'hui, en ordre croissant.
  for (let i = 0; i < days; i += every) ticks.unshift(startOfDay(addDays(new Date(), -i)).getTime());
  return { start, end, ticks };
}

function decimalsFor(ticks: number[]): number {
  const step = ticks.length > 1 ? Math.abs(ticks[1] - ticks[0]) : 1;
  if (step >= 1) return 0;
  if (step >= 0.1) return 1;
  return 2;
}

interface LineChartProps {
  series: ChartSeries[];
  unit: string;
  xStart: number;
  xEnd: number;
  xTicks: number[];
  height?: number;
  targetBand?: [number, number] | null;
  refLines?: { y: number; label: string }[];
  yMinHint?: number;
  yMaxHint?: number;
  showPoints?: boolean;
  showGrid?: boolean;
  connect?: boolean;
  accessibilityLabel: string;
}

export function LineChart({
  series,
  unit,
  xStart,
  xEnd,
  xTicks,
  height = 220,
  targetBand,
  refLines = [],
  yMinHint,
  yMaxHint,
  showPoints = true,
  showGrid = true,
  connect = true,
  accessibilityLabel,
}: LineChartProps) {
  const { c, fs } = useTheme();
  const [width, setWidth] = useState(0);
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);

  const allY = series.flatMap((s) => s.points.map((p) => p.y));
  const extra = [
    ...(targetBand ?? []),
    ...refLines.map((r) => r.y),
    ...(yMinHint !== undefined ? [yMinHint] : []),
    ...(yMaxHint !== undefined ? [yMaxHint] : []),
  ];
  const yTicks = niceTicks(Math.min(...allY, ...extra), Math.max(...allY, ...extra));
  const dec = decimalsFor(yTicks);
  const yMin = yTicks[0];
  const yMax = yTicks[yTicks.length - 1];

  const font = fs(11);
  const padL = Math.max(...yTicks.map((v) => fmtNumber(v, dec).length)) * font * 0.62 + 10;
  const padR = 10;
  const padT = font + 10; // place pour l'unité
  const padB = font + 14;
  const w = Math.max(0, width - padL - padR);
  const h = height - padT - padB;
  const sx = (x: number) => padL + ((x - xStart) / Math.max(1, xEnd - xStart)) * w;
  const sy = (y: number) => padT + h - ((y - yMin) / Math.max(1e-9, yMax - yMin)) * h;

  // Étiquettes de dates espacées automatiquement si elles se chevauchent
  const labelW = font * 0.62 * 5 + 6;
  const shownX: number[] = [];
  for (const tx of xTicks) {
    const px = sx(tx);
    if (shownX.length === 0 || px - sx(shownX[shownX.length - 1]) >= labelW) shownX.push(tx);
  }

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  // Info-bulle : un seul Pressable au-dessus du graphique, point le plus proche du toucher
  // (pas de gestionnaires d'événements sur les éléments SVG, mal gérés sur le web).
  const targets = series.flatMap((s) =>
    s.points.map((p) => ({ x: sx(p.x), y: sy(p.y), text: p.label ?? `${fmtNumber(p.y, dec)} ${unit}` })),
  );
  const onPress = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    let best: (typeof targets)[number] | null = null;
    let bestD = 24 * 24;
    for (const t of targets) {
      const d = (t.x - locationX) ** 2 + (t.y - locationY) ** 2;
      if (d < bestD) {
        bestD = d;
        best = t;
      }
    }
    setTip(best);
  };
  const empty = allY.length === 0;

  return (
    <View>
      <Pressable onLayout={onLayout} onPress={onPress} accessible accessibilityLabel={accessibilityLabel} style={{ height }}>
        {width > 0 ? (
          <Svg width={width} height={height} pointerEvents="none">
            {/* Unité de l'axe vertical */}
            <SvgText x={4} y={font} fontSize={font} fill={c.chartAxis} fontWeight="700">
              {unit}
            </SvgText>

            {targetBand ? (
              <Rect
                x={padL}
                y={sy(Math.min(targetBand[1], yMax))}
                width={w}
                height={Math.max(0, sy(Math.max(targetBand[0], yMin)) - sy(Math.min(targetBand[1], yMax)))}
                fill={c.chartTarget}
              />
            ) : null}

            {yTicks.map((v) => (
              <G key={`y${v}`}>
                {showGrid ? <Line x1={padL} x2={padL + w} y1={sy(v)} y2={sy(v)} stroke={c.chartGrid} strokeWidth={1} /> : null}
                <SvgText x={padL - 6} y={sy(v) + font / 3} fontSize={font} fill={c.chartAxis} textAnchor="end">
                  {fmtNumber(v, dec)}
                </SvgText>
              </G>
            ))}

            {refLines.map((r) => (
              <G key={`ref${r.y}`}>
                <Line x1={padL} x2={padL + w} y1={sy(r.y)} y2={sy(r.y)} stroke={c.chartAxis} strokeWidth={1} strokeDasharray="5,4" />
                <SvgText x={padL + w - 2} y={sy(r.y) - 3} fontSize={font} fill={c.chartAxis} textAnchor="end">
                  {r.label}
                </SvgText>
              </G>
            ))}

            {/* Axe des dates */}
            <Line x1={padL} x2={padL + w} y1={padT + h} y2={padT + h} stroke={c.chartAxis} strokeWidth={1} />
            {xTicks.map((tx) => (
              <Line key={`xt${tx}`} x1={sx(tx)} x2={sx(tx)} y1={padT + h} y2={padT + h + 4} stroke={c.chartAxis} strokeWidth={1} />
            ))}
            {shownX.map((tx) => (
              <SvgText key={`xl${tx}`} x={Math.min(Math.max(sx(tx), padL + labelW / 2), padL + w - labelW / 2)} y={padT + h + font + 6} fontSize={font} fill={c.chartAxis} textAnchor="middle">
                {fmtDayShort(new Date(tx))}
              </SvgText>
            ))}

            {series.map((s) => {
              const pts = [...s.points].sort((a, b) => a.x - b.x);
              return (
                <G key={s.key}>
                  {connect && pts.length > 1 ? (
                    <Polyline
                      points={pts.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' ')}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={2}
                      strokeDasharray={s.dashed ? '6,4' : undefined}
                      strokeLinejoin="round"
                    />
                  ) : null}
                  {showPoints || !connect
                    ? pts.map((p, i) => (
                        <Circle key={`${s.key}${i}`} cx={sx(p.x)} cy={sy(p.y)} r={4} fill={p.color ?? s.color} stroke={c.surface} strokeWidth={1.5} />
                      ))
                    : null}
                </G>
              );
            })}

            {tip ? <Tooltip x={tip.x} y={tip.y} text={tip.text} width={width} font={font} bg={c.tooltipBg} fg={c.tooltipText} /> : null}
          </Svg>
        ) : null}
        {empty && width > 0 ? (
          <View style={{ position: 'absolute', left: 0, right: 0, top: height / 2 - 12 }}>
            <T muted center v="small">
              —
            </T>
          </View>
        ) : null}
      </Pressable>
      {series.length >= 2 ? <Legend series={series} /> : null}
    </View>
  );
}

function Tooltip({ x, y, text, width, font, bg, fg }: { x: number; y: number; text: string; width: number; font: number; bg: string; fg: string }) {
  const lines = text.split('\n');
  const tw = Math.max(...lines.map((l) => l.length)) * font * 0.6 + 14;
  const th = lines.length * (font + 4) + 8;
  const left = Math.min(Math.max(2, x - tw / 2), width - tw - 2);
  const top = y - th - 10 < 0 ? y + 12 : y - th - 10;
  return (
    <G>
      <Rect x={left} y={top} width={tw} height={th} rx={6} fill={bg} />
      {lines.map((l, i) => (
        <SvgText key={i} x={left + 7} y={top + 4 + (i + 1) * (font + 4) - 4} fontSize={font} fill={fg} fontWeight={i === 0 ? '700' : '400'}>
          {l}
        </SvgText>
      ))}
    </G>
  );
}

export function Legend({ series }: { series: { key: string; label: string; color: string; dashed?: boolean }[] }) {
  return (
    <Row style={{ flexWrap: 'wrap', marginTop: space.xs }} gap={space.lg}>
      {series.map((s) => (
        <Row key={s.key} gap={6}>
          <Svg width={28} height={10}>
            <Line x1={0} x2={28} y1={5} y2={5} stroke={s.color} strokeWidth={3} strokeDasharray={s.dashed ? '6,4' : undefined} />
          </Svg>
          <T v="small">{s.label}</T>
        </Row>
      ))}
    </Row>
  );
}

// ---------- Barres (un seul axe gradué) ----------

export function BarChart({
  bars,
  unit,
  height = 200,
  targetBand,
  showGrid = true,
  accessibilityLabel,
}: {
  bars: { label: string; value: number | null; color: string; valueLabel?: string }[];
  unit: string;
  height?: number;
  targetBand?: [number, number] | null;
  showGrid?: boolean;
  accessibilityLabel: string;
}) {
  const { c, fs } = useTheme();
  const [width, setWidth] = useState(0);
  const vals = bars.map((b) => b.value).filter((v): v is number => v !== null);
  const yTicks = niceTicks(0, Math.max(...vals, ...(targetBand ?? [0]), 0.0001));
  const dec = decimalsFor(yTicks);
  const yMax = yTicks[yTicks.length - 1];
  const font = fs(11);
  const padL = Math.max(...yTicks.map((v) => fmtNumber(v, dec).length)) * font * 0.62 + 10;
  const padT = font + 16;
  const padB = font * 2 + 14;
  const w = Math.max(0, width - padL - 6);
  const h = height - padT - padB;
  const sy = (y: number) => padT + h - (y / yMax) * h;
  const slot = w / Math.max(1, bars.length);
  const bw = Math.min(46, slot * 0.6);

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessible accessibilityLabel={accessibilityLabel} style={{ height }}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          <SvgText x={4} y={font} fontSize={font} fill={c.chartAxis} fontWeight="700">
            {unit}
          </SvgText>
          {targetBand ? (
            <Rect x={padL} y={sy(targetBand[1])} width={w} height={sy(targetBand[0]) - sy(targetBand[1])} fill={c.chartTarget} />
          ) : null}
          {yTicks.map((v) => (
            <G key={v}>
              {showGrid ? <Line x1={padL} x2={padL + w} y1={sy(v)} y2={sy(v)} stroke={c.chartGrid} /> : null}
              <SvgText x={padL - 6} y={sy(v) + font / 3} fontSize={font} fill={c.chartAxis} textAnchor="end">
                {fmtNumber(v, dec)}
              </SvgText>
            </G>
          ))}
          <Line x1={padL} x2={padL + w} y1={padT + h} y2={padT + h} stroke={c.chartAxis} />
          {bars.map((b, i) => {
            const cx = padL + slot * i + slot / 2;
            const words = b.label.split(' ');
            return (
              <G key={b.label}>
                {b.value !== null ? (
                  <>
                    <Rect x={cx - bw / 2} y={sy(b.value)} width={bw} height={padT + h - sy(b.value)} rx={4} fill={b.color} />
                    <SvgText x={cx} y={sy(b.value) - 4} fontSize={font} fill={c.text} textAnchor="middle" fontWeight="700">
                      {b.valueLabel ?? fmtNumber(b.value, dec)}
                    </SvgText>
                  </>
                ) : (
                  <SvgText x={cx} y={padT + h - 4} fontSize={font} fill={c.textMuted} textAnchor="middle">
                    —
                  </SvgText>
                )}
                <SvgText x={cx} y={padT + h + font + 4} fontSize={font} fill={c.chartAxis} textAnchor="middle">
                  {words[0]}
                </SvgText>
                {words.length > 1 ? (
                  <SvgText x={cx} y={padT + h + font * 2 + 6} fontSize={font} fill={c.chartAxis} textAnchor="middle">
                    {words.slice(1).join(' ')}
                  </SvgText>
                ) : null}
              </G>
            );
          })}
        </Svg>
      ) : null}
    </View>
  );
}

// ---------- Mini-courbe (carte d'un proche) ----------

export function Sparkline({
  values,
  band,
  height = 40,
  color,
}: {
  values: number[];
  band?: [number, number];
  height?: number;
  color?: string;
}) {
  const { c } = useTheme();
  const [width, setWidth] = useState(0);
  const lo = Math.min(...values, ...(band ?? []));
  const hi = Math.max(...values, ...(band ?? []));
  const sy = (v: number) => height - 3 - ((v - lo) / Math.max(1, hi - lo)) * (height - 6);
  const sx = (i: number) => 3 + (i / Math.max(1, values.length - 1)) * (width - 6);
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {width > 0 && values.length > 0 ? (
        <Svg width={width} height={height}>
          {band ? <Rect x={0} y={sy(band[1])} width={width} height={sy(band[0]) - sy(band[1])} fill={c.chartTarget} /> : null}
          <Polyline points={values.map((v, i) => `${sx(i)},${sy(v)}`).join(' ')} fill="none" stroke={color ?? c.series1} strokeWidth={2} />
          <Circle cx={sx(values.length - 1)} cy={sy(values[values.length - 1])} r={3.5} fill={color ?? c.series1} />
        </Svg>
      ) : null}
    </View>
  );
}

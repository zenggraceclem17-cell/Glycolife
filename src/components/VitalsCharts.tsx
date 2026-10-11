import { View } from 'react-native';

import type { Vital } from '@/data/types';
import { addDays, fmtDayLabel, startOfDay } from '@/lib/dates';
import { fmtNumber } from '@/lib/glucose';
import { useSettings, useTheme } from '@/theme/settings';
import { space } from '@/theme/tokens';
import { LineChart } from './charts';
import { Card, T } from './ui';

/** Courbes poids (kg) et tension (mmHg) : un graphique par unité, jamais de double axe. */
export function VitalsCharts({ vitals }: { vitals: Vital[] }) {
  const { c } = useTheme();
  const { settings } = useSettings();
  const start = startOfDay(addDays(new Date(), -89)).getTime();
  const end = startOfDay(addDays(new Date(), 1)).getTime();
  const ticks: number[] = [];
  for (let i = 0; i < 90; i += 15) ticks.unshift(startOfDay(addDays(new Date(), -i)).getTime());
  const recent = vitals.filter((v) => new Date(v.measured_at).getTime() >= start);
  const weights = recent.filter((v) => v.weight_kg !== null);
  const bp = recent.filter((v) => v.sys !== null && v.dia !== null);
  const common = { xStart: start, xEnd: end, xTicks: ticks, showGrid: settings.chartGrid, showPoints: settings.chartPoints, height: 190 };

  return (
    <View style={{ gap: space.md }}>
      <Card>
        <T v="bodyBold">Poids (3 mois)</T>
        <LineChart
          {...common}
          unit="kg"
          accessibilityLabel={`Courbe du poids, ${weights.length} mesures`}
          series={[
            {
              key: 'w',
              label: 'Poids',
              color: c.series1,
              points: weights.map((v) => ({ x: new Date(v.measured_at).getTime(), y: v.weight_kg!, label: `${fmtNumber(v.weight_kg!, 1)} kg\n${fmtDayLabel(v.measured_at)}` })),
            },
          ]}
        />
      </Card>
      <Card>
        <T v="bodyBold">Tension artérielle (3 mois)</T>
        <LineChart
          {...common}
          unit="mmHg"
          refLines={[
            { y: 130, label: '130' },
            { y: 80, label: '80' },
          ]}
          accessibilityLabel={`Courbe de tension, ${bp.length} mesures. Repère : moins de 130 sur 80.`}
          series={[
            {
              key: 'sys',
              label: 'Systolique (haute)',
              color: c.series1,
              points: bp.map((v) => ({ x: new Date(v.measured_at).getTime(), y: v.sys!, label: `${v.sys}/${v.dia} mmHg\n${fmtDayLabel(v.measured_at)}` })),
            },
            {
              key: 'dia',
              label: 'Diastolique (basse)',
              color: c.series2,
              dashed: true,
              points: bp.map((v) => ({ x: new Date(v.measured_at).getTime(), y: v.dia!, label: `${v.sys}/${v.dia} mmHg\n${fmtDayLabel(v.measured_at)}` })),
            },
          ]}
        />
        <T v="small" muted>
          Repère : tension inférieure à 130/80 mmHg (pointillés).
        </T>
      </Card>
    </View>
  );
}

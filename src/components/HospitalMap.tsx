// Version web (et repli) : plan schématique SVG, lisible sans tuiles de carte ni internet.
// Sur téléphone, Metro charge HospitalMap.native.tsx (react-native-maps).
import React, { useState } from 'react';
import { Pressable } from 'react-native';
import Svg, { Circle, G, Rect, Text as SvgText } from 'react-native-svg';

import type { Hospital } from '@/data/hospitals';
import { useTheme } from '@/theme/settings';
import { radius } from '@/theme/tokens';

export interface HospitalMapProps {
  hospitals: Hospital[];
  me: { lat: number; lng: number } | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function HospitalMap({ hospitals, me, selectedId, onSelect }: HospitalMapProps) {
  const { c, fs } = useTheme();
  const [width, setWidth] = useState(0);
  const height = 240;
  const pts = [...hospitals.map((h) => ({ lat: h.lat, lng: h.lng })), ...(me ? [me] : [])];
  const minLat = Math.min(...pts.map((p) => p.lat)) - 0.01;
  const maxLat = Math.max(...pts.map((p) => p.lat)) + 0.01;
  const minLng = Math.min(...pts.map((p) => p.lng)) - 0.01;
  const maxLng = Math.max(...pts.map((p) => p.lng)) + 0.01;
  const pad = 16;
  const sx = (lng: number) => pad + ((lng - minLng) / (maxLng - minLng)) * (width - pad * 2);
  const sy = (lat: number) => pad + ((maxLat - lat) / (maxLat - minLat)) * (height - pad * 2);
  const font = fs(10);

  return (
    <Pressable
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      onPress={(e) => {
        const { locationX, locationY } = e.nativeEvent;
        let best: string | null = null;
        let bestD = 28 * 28;
        for (const h of hospitals) {
          const d = (sx(h.lng) - locationX) ** 2 + (sy(h.lat) - locationY) ** 2;
          if (d < bestD) {
            bestD = d;
            best = h.id;
          }
        }
        if (best) onSelect(best);
      }}
      style={{ height, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: c.border }}
      accessibilityLabel="Plan schématique des hôpitaux">
      {width > 0 ? (
        <Svg width={width} height={height} pointerEvents="none">
          <Rect x={0} y={0} width={width} height={height} fill={c.surfaceAlt} />
          {/* Fleuve Congo, au nord : repère visuel */}
          <Rect x={0} y={0} width={width} height={10} fill={c.primarySoft} />
          <SvgText x={6} y={22} fontSize={font} fill={c.textMuted}>
            ↑ Fleuve Congo
          </SvgText>
          {hospitals.map((h) => {
            const sel = h.id === selectedId;
            return (
              <G key={h.id}>
                <Circle cx={sx(h.lng)} cy={sy(h.lat)} r={sel ? 9 : 6} fill={sel ? c.danger : c.primary} stroke={c.surface} strokeWidth={2} />
                {sel ? (
                  <SvgText x={Math.min(sx(h.lng) + 10, width - 150)} y={sy(h.lat) - 10} fontSize={font + 1} fill={c.text} fontWeight="700">
                    {h.name.length > 28 ? h.name.slice(0, 27) + '…' : h.name}
                  </SvgText>
                ) : null}
              </G>
            );
          })}
          {me ? (
            <G>
              <Circle cx={sx(me.lng)} cy={sy(me.lat)} r={8} fill={c.success} stroke={c.surface} strokeWidth={3} />
              <SvgText x={sx(me.lng) + 11} y={sy(me.lat) + 4} fontSize={font} fill={c.text} fontWeight="700">
                Vous
              </SvgText>
            </G>
          ) : null}
        </Svg>
      ) : null}
    </Pressable>
  );
}

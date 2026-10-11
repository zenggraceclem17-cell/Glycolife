// Carte réelle sur téléphone (Android / iOS). La liste reste lisible hors ligne si la carte ne charge pas.
import React from 'react';
import { View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { useTheme } from '@/theme/settings';
import { radius } from '@/theme/tokens';
import type { HospitalMapProps } from './HospitalMap';

export default function HospitalMap({ hospitals, me, selectedId, onSelect }: HospitalMapProps) {
  const { c } = useTheme();
  const center = me ?? { lat: -4.36, lng: 15.31 };
  return (
    <View style={{ height: 260, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: c.border }}>
      <MapView
        style={{ flex: 1 }}
        initialRegion={{ latitude: center.lat, longitude: center.lng, latitudeDelta: 0.18, longitudeDelta: 0.18 }}
        showsUserLocation={!!me}>
        {hospitals.map((h) => (
          <Marker
            key={h.id}
            coordinate={{ latitude: h.lat, longitude: h.lng }}
            title={h.name}
            description={h.commune}
            pinColor={h.id === selectedId ? 'red' : 'blue'}
            onPress={() => onSelect(h.id)}
          />
        ))}
      </MapView>
    </View>
  );
}

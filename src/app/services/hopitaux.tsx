import * as Location from "expo-location";
import { useEffect, useMemo, useState } from "react";
import { Linking, Pressable, View } from "react-native";

import HospitalMap from "@/components/HospitalMap";
import {
  Button,
  Card,
  Chip,
  Notice,
  Row,
  Screen,
  SectionTitle,
  T,
} from "@/components/ui";
import {
  COMMUNES,
  directionsUrl,
  distanceKm,
  HOSPITALS,
} from "@/data/hospitals";
import { fmtNumber } from "@/lib/glucose";
import { useTheme } from "@/theme/settings";
import { space } from "@/theme/tokens";

export default function Hopitaux() {
  const { c } = useTheme();
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [status, setStatus] = useState<"loading" | "gps" | "denied">("loading");
  const [commune, setCommune] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status !== "granted") throw new Error("denied");
        const last = await Location.getLastKnownPositionAsync();
        if (last && !cancelled) {
          setMe({ lat: last.coords.latitude, lng: last.coords.longitude });
          setStatus("gps");
        }
        const pos = await Promise.race([
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          }),
          new Promise<null>((r) => setTimeout(() => r(null), 12000)),
        ]);
        if (cancelled) return;
        if (pos) {
          setMe({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setStatus("gps");
        } else if (!last) setStatus("denied");
      } catch {
        if (!cancelled) setStatus("denied");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const origin = useMemo(() => {
    if (commune) {
      const k = COMMUNES.find((x) => x.name === commune);
      return k ? { lat: k.lat, lng: k.lng } : null;
    }
    return me;
  }, [me, commune]);

  const sorted = useMemo(
    () =>
      HOSPITALS.map((h) => ({
        h,
        km: origin ? distanceKm(origin.lat, origin.lng, h.lat, h.lng) : null,
      })).sort((a, b) => (a.km ?? 0) - (b.km ?? 0)),
    [origin],
  );

  return (
    <Screen>
      <Notice tone="danger" icon="warning-outline">
        Urgence grave (personne inconsciente) : allez à l’hôpital le plus proche
        ou appelez les secours. Ne donnez rien par la bouche.
      </Notice>
      <HospitalMap
        hospitals={HOSPITALS}
        me={origin}
        selectedId={selected}
        onSelect={setSelected}
      />
      {status === "loading" ? (
        <T v="small" muted>
          Recherche de votre position…
        </T>
      ) : null}
      {status === "denied" || commune ? (
        <>
          <T v="bodyBold">
            {status === "denied"
              ? "Localisation indisponible : choisissez votre commune"
              : "Votre commune"}
          </T>
          <Row style={{ flexWrap: "wrap" }}>
            {COMMUNES.map((k) => (
              <Chip
                key={k.name}
                label={k.name}
                selected={commune === k.name}
                onPress={() => setCommune(k.name)}
              />
            ))}
          </Row>
        </>
      ) : status === "gps" ? (
        <Button
          small
          variant="ghost"
          icon="location-outline"
          label="Choisir une commune à la place"
          onPress={() => setCommune(COMMUNES[0].name)}
        />
      ) : null}

      <SectionTitle>
        {origin ? "Du plus proche au plus loin" : "Hôpitaux de Kinshasa"}
      </SectionTitle>
      {sorted.map(({ h, km }) => (
        <Card
          key={h.id}
          style={
            selected === h.id
              ? { borderColor: c.primary, borderWidth: 2 }
              : undefined
          }
        >
          <Pressable
            onPress={() => setSelected(h.id)}
            accessibilityRole="button"
            accessibilityLabel={`Voir ${h.name} sur la carte`}
          >
            <Row style={{ alignItems: "flex-start" }}>
              <View style={{ flex: 1 }}>
                <T v="bodyBold">{h.name}</T>
                <T v="small" muted>
                  {h.commune} · {h.services}
                </T>
              </View>
              {km !== null ? (
                <T v="bodyBold" color={c.primary}>
                  {fmtNumber(km, 1)} km
                </T>
              ) : null}
            </Row>
          </Pressable>
          <Button
            small
            variant="secondary"
            icon="navigate"
            label="Itinéraire (Google Maps)"
            onPress={() => Linking.openURL(directionsUrl(h))}
          />
        </Card>
      ))}
      <T v="caption" muted center style={{ marginTop: space.sm }}>
        Liste disponible hors ligne. Adresses et coordonnées à vérifier sur le
        terrain.
      </T>
    </Screen>
  );
}

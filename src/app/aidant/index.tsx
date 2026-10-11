// Suivi : une carte par proche (lecture seule).
import { router } from "expo-router";
import { Linking, Pressable, View } from "react-native";

import { Sparkline } from "@/components/charts";
import { Avatar } from "@/components/Conversations";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Row,
  Screen,
  StatusPill,
  statusColor,
  T,
} from "@/components/ui";
import {
  alertsFor,
  linkedPatients,
  readingsSince,
  visibleReadings,
} from "@/data/selectors";
import { useData, useSession } from "@/data/store";
import type { LinkedPatient } from "@/data/types";
import { useT } from "@/i18n";
import { fmtDayLabel, fmtTime } from "@/lib/dates";
import { computeStats, fmtGlucose, statusOf, toUnit } from "@/lib/glucose";
import { useSettings, useTheme } from "@/theme/settings";
import { space } from "@/theme/tokens";

export default function Suivi() {
  const t = useT();
  const { db } = useData();
  const session = useSession();
  const patients = linkedPatients(db, session.userId);

  return (
    <Screen
      safeTop
      title={t("follow_title")}
      subtitle={t("read_only")}
      right={
        <Button
          small
          icon="qr-code-outline"
          label={t("link_someone")}
          onPress={() => router.push("/relier")}
        />
      }
    >
      {patients.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title={t("no_patients")}
          hint={t("no_patients_hint")}
        >
          <Button
            big
            icon="scan-outline"
            label={t("link_someone")}
            onPress={() => router.push("/relier")}
          />
        </EmptyState>
      ) : (
        patients.map((p) => <PatientCard key={p.patient_id} p={p} />)
      )}
    </Screen>
  );
}

function PatientCard({ p }: { p: LinkedPatient }) {
  const t = useT();
  const { c } = useTheme();
  const { settings } = useSettings();
  const { db } = useData();
  const session = useSession();
  const readings = visibleReadings(db, p);
  const last = readings[readings.length - 1] ?? null;
  const week = readingsSince(readings, 7);
  const st = computeStats(week, p.target_min, p.target_max);
  const unseen = alertsFor(db, session.userId).filter(
    (a) => a.patient.patient_id === p.patient_id && !a.seen,
  ).length;
  const s = last ? statusOf(last.value_mgdl, p.target_min, p.target_max) : null;

  return (
    <Card>
      <Pressable
        onPress={() => router.push(`/proche/${p.patient_id}`)}
        accessibilityRole="button"
        accessibilityLabel={`${t("open_record")} ${p.full_name}`}
        style={({ pressed }) => ({ gap: space.sm, opacity: pressed ? 0.7 : 1 })}
      >
        <Row gap={space.md}>
          <Avatar name={p.full_name} />
          <View style={{ flex: 1 }}>
            <T v="h2">{p.full_name}</T>
            {unseen > 0 ? (
              <Row gap={6}>
                <Badge count={unseen} />
                <T v="small" color={c.danger}>
                  {t("new_alerts", { n: unseen })}
                </T>
              </Row>
            ) : null}
          </View>
        </Row>

        {!p.share_readings && !p.share_alerts ? (
          <T muted>{t("not_shared", { name: p.full_name })}</T>
        ) : last && s ? (
          <>
            <Row style={{ alignItems: "flex-end", flexWrap: "wrap" }}>
              <T v="title" color={statusColor(c, s)}>
                {fmtGlucose(last.value_mgdl, settings.unit)}
              </T>
              <StatusPill status={s} />
            </Row>
            <T v="small" muted>
              {t("last_seen_reading")} · {t(`moment_${last.moment}`)} ·{" "}
              {fmtDayLabel(last.measured_at, settings.language)}{" "}
              {fmtTime(last.measured_at)}
            </T>
            {p.share_readings && week.length > 1 ? (
              <Sparkline
                values={week.map((r) => toUnit(r.value_mgdl, settings.unit))}
                band={[
                  toUnit(p.target_min, settings.unit),
                  toUnit(p.target_max, settings.unit),
                ]}
              />
            ) : null}
            {p.share_readings && st.pctInTarget !== null ? (
              <T v="small">
                <T v="bodyBold" color={c.success}>
                  {st.pctInTarget}%
                </T>{" "}
                {t("in_target").toLowerCase()} sur 7 jours · {st.count} mesures
              </T>
            ) : null}
          </>
        ) : (
          <T muted>{t("no_reading")}</T>
        )}
      </Pressable>

      <Row>
        <Button
          style={{ flex: 1 }}
          small
          variant="secondary"
          icon="chatbubble-outline"
          label={t("message")}
          onPress={() => router.push(`/chat/${p.patient_id}`)}
        />
        {p.phone ? (
          <Button
            style={{ flex: 1 }}
            small
            variant="success"
            icon="call"
            label={t("call")}
            onPress={() => Linking.openURL(`tel:${p.phone}`)}
          />
        ) : null}
      </Row>
    </Card>
  );
}

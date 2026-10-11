import { Pressable, View } from 'react-native';

import { Button, Card, Notice, Row, Screen, SectionTitle, Segmented, T, ToggleRow } from '@/components/ui';
import { useActions } from '@/data/actions';
import { useData, useSession } from '@/data/store';
import { useT } from '@/i18n';
import { fmtDayLabel, fmtTime } from '@/lib/dates';
import { confirmAsk } from '@/lib/dialog';
import { useSettings, useTheme } from '@/theme/settings';
import { ACCENTS, space } from '@/theme/tokens';

export default function Parametres() {
  const t = useT();
  const { c, scheme, fs } = useTheme();
  const { settings, update, resetDisplay } = useSettings();
  const { db, syncNow, syncing, reloadDemo } = useData();
  const session = useSession();
  const actions = useActions();

  return (
    <Screen>
      <SectionTitle>{t('appearance')}</SectionTitle>
      <Card>
        <T v="bodyBold">{t('theme')}</T>
        <Segmented
          options={[
            { value: 'auto', label: t('theme_auto') },
            { value: 'light', label: t('theme_light') },
            { value: 'dark', label: t('theme_dark') },
          ]}
          value={settings.theme}
          onChange={(theme) => update({ theme })}
        />
        <T v="bodyBold" style={{ marginTop: space.sm }}>
          {t('main_color')}
        </T>
        <View style={{ gap: space.xs }}>
          {ACCENTS.map((a) => {
            const sel = settings.accent === a.id;
            return (
              <Pressable
                key={a.id}
                onPress={() => update({ accent: a.id })}
                accessibilityRole="radio"
                accessibilityState={{ selected: sel }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 6 }}>
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor: scheme === 'dark' ? a.dark : a.light,
                    borderWidth: sel ? 3 : 0,
                    borderColor: c.text,
                  }}
                />
                <T v={sel ? 'bodyBold' : 'body'}>{a.label}</T>
              </Pressable>
            );
          })}
        </View>
        <T v="bodyBold" style={{ marginTop: space.sm }}>
          {t('text_size')}
        </T>
        <Segmented
          options={[
            { value: 'normal', label: t('text_normal') },
            { value: 'grand', label: t('text_large') },
            { value: 'tres_grand', label: t('text_xlarge') },
          ]}
          value={settings.textSize}
          onChange={(textSize) => update({ textSize })}
        />
        <ToggleRow label={t('high_contrast')} value={settings.highContrast} onChange={(highContrast) => update({ highContrast })} />
      </Card>

      <SectionTitle>{t('charts')}</SectionTitle>
      <Card style={{ paddingVertical: 4 }}>
        <ToggleRow label={t('chart_target')} value={settings.chartTarget} onChange={(chartTarget) => update({ chartTarget })} />
        <ToggleRow label={t('chart_points')} value={settings.chartPoints} onChange={(chartPoints) => update({ chartPoints })} />
        <ToggleRow label={t('chart_grid')} value={settings.chartGrid} onChange={(chartGrid) => update({ chartGrid })} />
        <T v="bodyBold">{t('default_period')}</T>
        <Segmented
          options={[
            { value: 7, label: t('period_7') },
            { value: 30, label: t('period_30') },
            { value: 90, label: t('period_90') },
          ]}
          value={settings.defaultPeriod}
          onChange={(defaultPeriod) => update({ defaultPeriod })}
        />
        <View style={{ height: space.sm }} />
      </Card>

      <SectionTitle>{t('language')}</SectionTitle>
      <Card>
        <Segmented
          options={[
            { value: 'fr', label: 'Français' },
            { value: 'ln', label: 'Lingala' },
          ]}
          value={settings.language}
          onChange={(language) => update({ language })}
        />
        {settings.language === 'ln' ? <Notice>{t('ln_review_note')}</Notice> : null}
        <T v="bodyBold" style={{ marginTop: space.sm }}>
          {t('unit')}
        </T>
        <Segmented
          options={[
            { value: 'g/L', label: 'g/L' },
            { value: 'mg/dL', label: 'mg/dL' },
          ]}
          value={settings.unit}
          onChange={(unit) => {
            update({ unit });
            if (session.role === 'patient') actions.saveMedical({ unit });
          }}
        />
      </Card>

      <SectionTitle>{t('sync')}</SectionTitle>
      <Card style={{ paddingVertical: 4 }}>
        <ToggleRow label={t('auto_sync')} value={settings.autoSync} onChange={(autoSync) => update({ autoSync })} />
        <T v="small" muted>
          {t('last_sync', { time: db.lastSyncAt ? `${fmtDayLabel(db.lastSyncAt)} ${fmtTime(db.lastSyncAt)}` : t('never') })}
        </T>
        {session.mode === 'supabase' ? (
          <Button variant="secondary" icon="sync-outline" label={t('sync_now')} onPress={syncNow} loading={syncing} style={{ marginVertical: space.sm }} />
        ) : (
          <View style={{ height: space.sm }} />
        )}
      </Card>

      <Row style={{ flexWrap: 'wrap', marginTop: space.md }}>
        <Button variant="ghost" icon="refresh" label={t('reset_display')} onPress={resetDisplay} />
        {session.mode === 'demo' ? (
          <Button
            variant="ghost"
            icon="flask-outline"
            label={t('reload_demo')}
            onPress={() => confirmAsk(t('reload_demo_q'), t('reload_demo_msg'), t('confirm'), reloadDemo, t('cancel'))}
          />
        ) : null}
      </Row>
      <T v="caption" muted center style={{ fontSize: fs(12) }}>
        GlycoLife 1.0 — Four Impact · ULC-Icam Kinshasa · {t('disclaimer')}
      </T>
    </Screen>
  );
}

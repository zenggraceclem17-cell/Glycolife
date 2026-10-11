import { useMemo, useState } from 'react';

import { ReportsView } from '@/components/glucose';
import { Button, Screen } from '@/components/ui';
import { useActions } from '@/data/actions';
import { medicalOf, readingsOf } from '@/data/selectors';
import { useData, useSession } from '@/data/store';
import { useT } from '@/i18n';
import { readingsToCsv, shareCsv } from '@/lib/csv';
import { dayKey, fmtDayLabel, fmtTime } from '@/lib/dates';
import { confirmAsk, inform } from '@/lib/dialog';
import { fmtGlucose } from '@/lib/glucose';
import { useSettings } from '@/theme/settings';

export default function Bilans() {
  const t = useT();
  const { db } = useData();
  const { settings } = useSettings();
  const session = useSession();
  const actions = useActions();
  const medical = medicalOf(db, session.userId);
  const readings = useMemo(() => readingsOf(db, session.userId), [db, session.userId]);
  const [busy, setBusy] = useState(false);

  const exportCsv = async () => {
    setBusy(true);
    try {
      await shareCsv(`glycolife_${dayKey(new Date())}.csv`, readingsToCsv(readings, medical.target_min, medical.target_max));
    } catch {
      inform('Export', "Le fichier n'a pas pu être créé.");
    }
    setBusy(false);
  };

  return (
    <Screen
      safeTop
      title={t('reports_title')}
      right={<Button small variant="secondary" icon="download-outline" label={t('export_csv')} onPress={exportCsv} loading={busy} />}>
      <ReportsView
        readings={readings}
        targetMin={medical.target_min}
        targetMax={medical.target_max}
        onDelete={(r) =>
          confirmAsk(
            t('delete_reading_q'),
            `${fmtGlucose(r.value_mgdl, settings.unit)} — ${fmtDayLabel(r.measured_at)} ${fmtTime(r.measured_at)}\n${t('delete_reading_msg')}`,
            t('delete'),
            () => actions.deleteReading(r.id),
            t('cancel'),
          )
        }
      />
    </Screen>
  );
}

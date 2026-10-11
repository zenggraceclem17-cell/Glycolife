import { ConversationList } from '@/components/Conversations';
import { Screen } from '@/components/ui';
import { caregiversOf } from '@/data/selectors';
import { useData, useSession } from '@/data/store';
import { useT } from '@/i18n';

export default function PatientMessages() {
  const t = useT();
  const { db } = useData();
  const session = useSession();
  const peers = caregiversOf(db, session.userId).map(({ link, profile }) => ({
    id: link.caregiver_id,
    name: profile?.full_name ?? 'Accompagnateur',
  }));
  return (
    <Screen safeTop title={t('messages_title')}>
      <ConversationList peers={peers} emptyText={t('no_conversations')} doctorSlot />
    </Screen>
  );
}

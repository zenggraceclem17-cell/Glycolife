import { ConversationList } from '@/components/Conversations';
import { Screen } from '@/components/ui';
import { linkedPatients } from '@/data/selectors';
import { useData, useSession } from '@/data/store';
import { useT } from '@/i18n';

export default function AidantMessages() {
  const t = useT();
  const { db } = useData();
  const session = useSession();
  const peers = linkedPatients(db, session.userId).map((p) => ({ id: p.patient_id, name: p.full_name }));
  return (
    <Screen safeTop title={t('messages_title')}>
      <ConversationList peers={peers} emptyText={t('no_conversations_cg')} />
    </Screen>
  );
}

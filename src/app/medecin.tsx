import { router } from 'expo-router';

import { Button, EmptyState, Screen } from '@/components/ui';
import { useData } from '@/data/store';

/** Emplacement de l'Espace médecin (développé séparément ; même base Supabase, rôle `medecin`). */
export default function Medecin() {
  const { signOut, session } = useData();
  return (
    <Screen>
      <EmptyState
        icon="medkit-outline"
        title="Espace médecin — bientôt"
        hint={`Bonjour ${session?.fullName ?? ''}. Cet espace sera branché ici : lecture des patients reliés (doctor_links), bilans et messagerie.`}
      />
      <Button
        label="Se déconnecter"
        variant="secondary"
        icon="log-out-outline"
        onPress={async () => {
          await signOut();
          router.replace('/');
        }}
      />
    </Screen>
  );
}

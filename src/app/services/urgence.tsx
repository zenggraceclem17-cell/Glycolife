// Carte d'urgence : QR code en TEXTE CLAIR, lisible par n'importe quel téléphone
// (appareil photo) sans internet ni application.
import { router } from 'expo-router';
import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Button, Card, Notice, Screen, T } from '@/components/ui';
import { hasMedical, medicalOf } from '@/data/selectors';
import { useData, useSession } from '@/data/store';
import { addDays, fmtDateNumeric } from '@/lib/dates';
import { space } from '@/theme/tokens';

const TYPE = { type1: 'Type 1', type2: 'Type 2', gestationnel: 'de grossesse', autre: 'autre', inconnu: 'type inconnu' } as const;

export default function Urgence() {
  const { db } = useData();
  const session = useSession();
  const m = medicalOf(db, session.userId);
  const validUntil = fmtDateNumeric(addDays(new Date(), 180));
  const allergies = [...m.allergies, ...(m.other_allergy ? [m.other_allergy] : [])];

  const lines = [
    "CARTE D'URGENCE GLYCOLIFE",
    `Nom : ${session.fullName}`,
    m.birth_year ? `Né(e) en : ${m.birth_year}` : null,
    `DIABÉTIQUE${m.diabetes_type ? ` ${TYPE[m.diabetes_type]}` : ''}${m.diagnosis_year ? ` depuis ${m.diagnosis_year}` : ''}`,
    `Traitements : ${m.treatments.length ? m.treatments.join(', ') : 'non renseigné'}`,
    `Allergies : ${allergies.length ? allergies.join(', ') : 'aucune connue'}`,
    m.blood_group ? `Groupe sanguin : ${m.blood_group}` : null,
    m.emergency_name || m.emergency_phone ? `Prévenir : ${m.emergency_name ?? ''} ${m.emergency_phone ?? ''}`.trim() : null,
    'Si malaise : mesurer la glycémie. Si basse et conscient : sucre. Si inconscient : RIEN par la bouche, appeler les secours.',
    `Valable jusqu'au : ${validUntil}`,
  ].filter((l): l is string => !!l);
  const text = lines.join('\n');

  return (
    <Screen>
      {!hasMedical(db, session.userId) ? (
        <Notice tone="warning">Complétez votre dossier médical pour une carte plus utile.</Notice>
      ) : null}
      <Card style={{ alignItems: 'center', gap: space.md }}>
        <View style={{ padding: 14, backgroundColor: '#FFFFFF', borderRadius: 12 }}>
          <QRCode value={text} size={240} ecl="M" color="#000000" backgroundColor="#FFFFFF" />
        </View>
        <T v="small" muted center>
          Montrez ce code : il se lit avec l’appareil photo de n’importe quel téléphone, sans internet.
        </T>
      </Card>
      <Card>
        {lines.map((l, i) => (
          <T key={i} v={i === 0 ? 'bodyBold' : 'body'}>
            {l}
          </T>
        ))}
      </Card>
      <Button variant="secondary" icon="document-text-outline" label="Compléter mon dossier" onPress={() => router.push('/dossier')} />
      <Notice icon="lock-closed-outline">Ce code contient vos informations en clair : ne le montrez qu’en cas de besoin.</Notice>
    </Screen>
  );
}

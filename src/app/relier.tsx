// Accompagnateur : se relier à un proche par scan du QR ou saisie du code à 6 caractères.
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, View } from 'react-native';

import { Button, Card, Field, Notice, Screen, T } from '@/components/ui';
import { linkedPatients } from '@/data/selectors';
import { useData, useSession } from '@/data/store';
import { useT } from '@/i18n';
import { normalizeCode } from '@/lib/ids';
import { useTheme } from '@/theme/settings';
import { radius, space } from '@/theme/tokens';

export default function Relier() {
  const t = useT();
  const { fs } = useTheme();
  const { redeemInvite, online, db } = useData();
  const session = useSession();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const handled = useRef(false);

  const submit = async (raw: string) => {
    const c = normalizeCode(raw);
    if (c.length !== 6) {
      setResult({ ok: false, text: t('link_invalid') });
      return;
    }
    setBusy(true);
    setResult(null);
    const r = await redeemInvite(c);
    setBusy(false);
    if (r.ok) {
      const name = linkedPatients(db, session.userId).find((p) => p.patient_id === r.patientId)?.full_name ?? 'votre proche';
      setResult({ ok: true, text: t('link_ok', { name }) });
      setTimeout(() => router.replace('/aidant'), 1200);
    } else {
      setResult({ ok: false, text: r.reason === 'network' ? t('link_need_network') : t('link_invalid') });
    }
  };

  const startScan = async () => {
    if (!permission?.granted) {
      const p = await requestPermission();
      if (!p.granted) {
        setResult({ ok: false, text: t('camera_denied') });
        return;
      }
    }
    handled.current = false;
    setScanning(true);
  };

  return (
    <Screen>
      <T muted>{t('no_patients_hint')}</T>
      {session.mode === 'supabase' && !online ? <Notice tone="warning" icon="cloud-offline-outline">{t('link_need_network')}</Notice> : null}

      {scanning ? (
        <View style={{ height: 320, borderRadius: radius.lg, overflow: 'hidden' }}>
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={({ data }) => {
              if (handled.current) return;
              handled.current = true;
              setScanning(false);
              const c = normalizeCode(data);
              setCode(c);
              submit(c);
            }}
          />
        </View>
      ) : Platform.OS !== 'web' ? (
        <Button big icon="scan-outline" label={t('scan_qr')} onPress={startScan} />
      ) : null}
      {scanning ? <Button variant="secondary" label={t('cancel')} onPress={() => setScanning(false)} /> : null}

      <Card>
        <T v="bodyBold">{t('or_type_code')}</T>
        <Field
          value={code}
          onChangeText={(v) => setCode(normalizeCode(v))}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
          placeholder="ABC123"
          style={{ fontSize: fs(30), letterSpacing: 8, textAlign: 'center', fontWeight: '800' }}
          accessibilityLabel={t('invite_code')}
        />
        <Button big label={t('link_button')} icon="link" disabled={code.length !== 6} loading={busy} onPress={() => submit(code)} />
      </Card>
      {result ? (
        <Notice tone={result.ok ? 'success' : 'danger'} icon={result.ok ? 'checkmark-circle-outline' : 'alert-circle-outline'}>
          {result.text}
        </Notice>
      ) : null}
      {session.mode === 'demo' ? (
        <T v="small" muted style={{ marginTop: space.sm }}>
          Démo : générez un code dans la vue patient (Profil › Inviter un accompagnateur), puis tapez-le ici.
        </T>
      ) : null}
    </Screen>
  );
}

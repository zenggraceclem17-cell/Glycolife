import { router } from 'expo-router';
import { useState } from 'react';

import { Button, Card, Field, Notice, Screen, T } from '@/components/ui';
import { useData } from '@/data/store';
import { useT } from '@/i18n';
import { hasBackend } from '@/lib/supabase';
import { space } from '@/theme/tokens';

export default function Connexion() {
  const t = useT();
  const { chosenRole, signIn, signUp, startDemo, chooseRole } = useData();
  const role = chosenRole ?? 'patient';
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const roleLabel = { patient: t('role_patient'), accompagnateur: t('role_caregiver'), medecin: t('role_doctor') }[role];

  const submit = async () => {
    setError(null);
    setInfo(null);
    if (!email.includes('@') || password.length < 6) {
      setError('Vérifiez l’e-mail et utilisez un mot de passe d’au moins 6 caractères.');
      return;
    }
    if (mode === 'signup' && fullName.trim().length < 2) {
      setError('Indiquez votre nom.');
      return;
    }
    setBusy(true);
    const err =
      mode === 'login'
        ? await signIn(email, password)
        : await signUp({ email, password, fullName, phone, role });
    setBusy(false);
    if (err === 'confirm_email') {
      setInfo(t('check_email'));
      setMode('login');
    } else if (err) setError(err === 'no_backend' ? t('no_backend') : err);
    else router.replace('/');
  };

  const demo = async () => {
    await startDemo(role);
    router.replace('/');
  };

  return (
    <Screen title={mode === 'login' ? t('login_title') : t('signup_title')} subtitle={roleLabel}>
      {!hasBackend ? <Notice>{t('no_backend')}</Notice> : null}

      {hasBackend ? (
        <Card>
          {mode === 'signup' ? (
            <>
              <Field label={t('full_name')} value={fullName} onChangeText={setFullName} autoComplete="name" />
              <Field label={t('phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+243…" />
            </>
          ) : null}
          <Field label={t('email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          <Field label={t('password')} value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode === 'login' ? 'password' : 'new-password'} />
          {error ? <Notice tone="danger" icon="alert-circle-outline">{error}</Notice> : null}
          {info ? <Notice tone="success" icon="mail-outline">{info}</Notice> : null}
          <Button label={mode === 'login' ? t('login') : t('signup')} onPress={submit} loading={busy} big />
          <Button
            variant="ghost"
            label={mode === 'login' ? t('no_account') : t('have_account')}
            onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}
          />
        </Card>
      ) : null}

      {role !== 'medecin' ? (
        <Card tone="primary">
          <T v="bodyBold">{t('try_demo')}</T>
          <T muted>{t('demo_explain')}</T>
          <Button label={t('try_demo')} icon="flask-outline" variant={hasBackend ? 'secondary' : 'primary'} onPress={demo} big={!hasBackend} />
        </Card>
      ) : (
        <Notice>L’Espace médecin est développé par une autre partie de l’équipe : connectez-vous avec un compte médecin.</Notice>
      )}

      <Button
        variant="ghost"
        icon="swap-horizontal"
        label={t('change_role')}
        onPress={() => {
          chooseRole(null);
          router.replace('/bienvenue');
        }}
        style={{ marginTop: space.sm }}
      />
    </Screen>
  );
}

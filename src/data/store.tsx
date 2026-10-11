// Magasin de données « hors ligne d'abord ».
// 1. Toute écriture va dans la base locale (AsyncStorage) puis dans la file d'attente (outbox).
// 2. Au retour du réseau : on pousse la file dans l'ordre, puis on tire ce que les règles RLS autorisent.
// 3. Les éléments non encore envoyés restent prioritaires lors de la fusion.
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { uuid } from '@/lib/ids';
import { nowIso } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/theme/settings';
import { buildDemoDb, DEMO_CAREGIVER, DEMO_PATIENT } from './demo';
import {
  emptyDb,
  KEY,
  TABLES,
  type LinkedPatient,
  type LocalDb,
  type OutboxOp,
  type Role,
  type Session,
  type TableName,
  type Tables,
} from './types';

const SESSION_KEY = 'glycolife:session';
const ROLE_KEY = 'glycolife:chosen-role';
const dbKey = (s: Session) => `glycolife:db:${s.mode === 'demo' ? 'demo' : s.userId}`;

const SYNC_INTERVAL_MS = 20000;
const MAX_ATTEMPTS = 5;

export interface SignUpInput {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  role: Role;
}

interface DataCtx {
  ready: boolean;
  session: Session | null;
  chosenRole: Role | null;
  db: LocalDb;
  online: boolean;
  syncing: boolean;
  pending: number;
  chooseRole: (role: Role | null) => void;
  startDemo: (role: Role) => Promise<void>;
  switchDemoRole: () => Promise<void>;
  reloadDemo: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (input: SignUpInput) => Promise<string | null>;
  signOut: () => Promise<void>;
  upsert: <T extends TableName>(table: T, row: Tables[T]) => void;
  insert: <T extends TableName>(table: T, row: Tables[T]) => void;
  update: <T extends TableName>(table: T, key: string, patch: Partial<Tables[T]>) => void;
  syncNow: () => Promise<void>;
  redeemInvite: (code: string) => Promise<{ ok: true; patientId: string } | { ok: false; reason: 'network' | 'invalid' }>;
  markAlertsSeen: (ids: string[]) => void;
  markLessonRead: (lessonId: string) => void;
}

const DataContext = createContext<DataCtx | null>(null);

function isNetworkError(err: { message?: string; code?: string } | null | undefined): boolean {
  const m = (err?.message ?? '').toLowerCase();
  return m.includes('fetch') || m.includes('network') || m.includes('timeout') || m.includes('failed to');
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [chosenRole, setChosenRole] = useState<Role | null>(null);
  const [db, setDbState] = useState<LocalDb>(emptyDb);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const dbRef = useRef(db);
  const sessionRef = useRef(session);
  const syncingRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  /** Applique une modification à la base locale et la persiste (écriture groupée). */
  const commit = useCallback((fn: (d: LocalDb) => LocalDb) => {
    const next = fn(dbRef.current);
    dbRef.current = next;
    setDbState(next);
    const s = sessionRef.current;
    if (!s) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      AsyncStorage.setItem(dbKey(s), JSON.stringify(dbRef.current)).catch(() => {});
    }, 250);
  }, []);

  const loadDbFor = useCallback(async (s: Session): Promise<LocalDb> => {
    try {
      const raw = await AsyncStorage.getItem(dbKey(s));
      if (raw) return { ...emptyDb(), ...(JSON.parse(raw) as LocalDb) };
    } catch {
      // base illisible : on repart d'une base vide (ou de la démo)
    }
    return s.mode === 'demo' ? buildDemoDb() : emptyDb();
  }, []);

  const openSession = useCallback(
    async (s: Session) => {
      const local = await loadDbFor(s);
      dbRef.current = local;
      setDbState(local);
      sessionRef.current = s;
      setSession(s);
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(s));
      await AsyncStorage.setItem(dbKey(s), JSON.stringify(local));
    },
    [loadDbFor],
  );

  // Démarrage : session et rôle mémorisés
  useEffect(() => {
    (async () => {
      try {
        const [rawS, rawR] = await Promise.all([AsyncStorage.getItem(SESSION_KEY), AsyncStorage.getItem(ROLE_KEY)]);
        if (rawR) setChosenRole(rawR as Role);
        if (rawS) {
          const s = JSON.parse(rawS) as Session;
          if (s.mode === 'demo' || supabase) await openSession(s);
        }
      } catch {
        // première ouverture
      }
      setReady(true);
    })();
  }, [openSession]);

  // Réseau
  useEffect(() => {
    const unsub = NetInfo.addEventListener((st) => {
      setOnline(st.isConnected !== false && st.isInternetReachable !== false);
    });
    return () => unsub();
  }, []);

  // ---------- Synchronisation ----------

  const push = useCallback(async (): Promise<boolean> => {
    if (!supabase) return true;
    const ops = [...dbRef.current.outbox];
    for (const op of ops) {
      let error: { message?: string; code?: string } | null = null;
      if (op.kind === 'upsert') {
        ({ error } = await supabase.from(op.table).upsert(op.row, { onConflict: KEY[op.table] }));
      } else if (op.kind === 'insert') {
        ({ error } = await supabase.from(op.table).upsert(op.row, { onConflict: KEY[op.table], ignoreDuplicates: true }));
      } else {
        ({ error } = await supabase.from(op.table).update(op.patch).eq(KEY[op.table], op.key));
      }
      if (error && isNetworkError(error)) return false;
      commit((d) => ({
        ...d,
        outbox: error
          ? d.outbox
              .map((o) => (o.opId === op.opId ? { ...o, attempts: o.attempts + 1 } : o))
              .filter((o) => {
                if (o.attempts < MAX_ATTEMPTS) return true;
                // Aucune donnée médicale dans les journaux : table et code d'erreur seulement.
                console.warn(`[sync] opération abandonnée sur ${o.table} (${error?.code ?? 'erreur'})`);
                return false;
              })
          : d.outbox.filter((o) => o.opId !== op.opId),
      }));
    }
    return true;
  }, [commit]);

  const pull = useCallback(async () => {
    const s = sessionRef.current;
    if (!supabase || !s) return;
    const fetched: Partial<Record<TableName, Record<string, unknown>[]>> = {};
    for (const t of TABLES) {
      const { data, error } = await supabase.from(t).select('*').limit(5000);
      if (error) {
        if (isNetworkError(error)) return;
        continue;
      }
      fetched[t] = data ?? [];
    }
    let linked: LinkedPatient[] | null = dbRef.current.linkedPatients;
    if (s.role === 'accompagnateur') {
      const { data, error } = await supabase.rpc('linked_patients');
      if (!error) linked = (data ?? []) as LinkedPatient[];
    }
    commit((d) => {
      const pendingKeys = new Set<string>();
      for (const o of d.outbox) {
        pendingKeys.add(`${o.table}:${o.kind === 'update' ? o.key : String(o.row[KEY[o.table]])}`);
      }
      const tables = { ...d.tables };
      for (const t of TABLES) {
        const rows = fetched[t];
        if (!rows) continue;
        const k = KEY[t];
        const merged: Record<string, unknown> = {};
        for (const row of rows) merged[String(row[k])] = row;
        // Les modifications locales en attente gardent la priorité.
        for (const [key, row] of Object.entries(d.tables[t])) {
          if (pendingKeys.has(`${t}:${key}`)) merged[key] = row;
        }
        (tables as Record<string, unknown>)[t] = merged;
      }
      return { ...d, tables, linkedPatients: linked, lastSyncAt: nowIso() };
    });
  }, [commit]);

  const syncNow = useCallback(async () => {
    const s = sessionRef.current;
    if (!supabase || !s || s.mode !== 'supabase' || syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      const pushed = await push();
      if (pushed) await pull();
    } catch {
      // réseau instable : on réessaiera
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [push, pull]);

  // Synchro automatique : retour du réseau, ouverture de session, puis toutes les 20 s
  useEffect(() => {
    if (!session || session.mode !== 'supabase' || !online || !settings.autoSync) return;
    syncNow();
    const id = setInterval(syncNow, SYNC_INTERVAL_MS);
    return () => clearInterval(id);
  }, [session, online, settings.autoSync, syncNow]);

  const scheduleSync = useCallback(() => {
    if (settings.autoSync && online) setTimeout(() => syncNow(), 300);
  }, [settings.autoSync, online, syncNow]);

  // ---------- Écritures ----------

  const enqueue = useCallback(
    (op: OutboxOp, apply: (d: LocalDb) => LocalDb) => {
      const isDemo = sessionRef.current?.mode !== 'supabase';
      commit((d) => {
        const next = apply(d);
        return isDemo ? next : { ...next, outbox: [...next.outbox, op] };
      });
      if (!isDemo) scheduleSync();
    },
    [commit, scheduleSync],
  );

  const putRow = <T extends TableName>(d: LocalDb, table: T, key: string, row: Tables[T]): LocalDb => ({
    ...d,
    tables: { ...d.tables, [table]: { ...d.tables[table], [key]: row } },
  });

  const upsert = useCallback(
    <T extends TableName>(table: T, row: Tables[T]) => {
      const key = String((row as unknown as Record<string, unknown>)[KEY[table]]);
      enqueue({ opId: uuid(), table, kind: 'upsert', row: row as unknown as Record<string, unknown>, attempts: 0 }, (d) =>
        putRow(d, table, key, row),
      );
    },
    [enqueue],
  );

  const insert = useCallback(
    <T extends TableName>(table: T, row: Tables[T]) => {
      const key = String((row as unknown as Record<string, unknown>)[KEY[table]]);
      enqueue({ opId: uuid(), table, kind: 'insert', row: row as unknown as Record<string, unknown>, attempts: 0 }, (d) =>
        putRow(d, table, key, row),
      );
    },
    [enqueue],
  );

  const update = useCallback(
    <T extends TableName>(table: T, key: string, patch: Partial<Tables[T]>) => {
      enqueue(
        { opId: uuid(), table, kind: 'update', key, patch: patch as Record<string, unknown>, attempts: 0 },
        (d) => {
          const cur = d.tables[table][key];
          if (!cur) return d;
          return putRow(d, table, key, { ...cur, ...patch });
        },
      );
    },
    [enqueue],
  );

  // ---------- Session ----------

  const chooseRole = useCallback((role: Role | null) => {
    setChosenRole(role);
    if (role) AsyncStorage.setItem(ROLE_KEY, role).catch(() => {});
    else AsyncStorage.removeItem(ROLE_KEY).catch(() => {});
  }, []);

  const demoSession = (role: Role): Session => ({
    mode: 'demo',
    role,
    userId: role === 'accompagnateur' ? DEMO_CAREGIVER : DEMO_PATIENT,
    fullName: role === 'accompagnateur' ? 'Patrick Mbuyi' : 'Maman Thérèse Mbuyi',
    email: null,
  });

  const startDemo = useCallback(
    async (role: Role) => {
      chooseRole(role);
      await openSession(demoSession(role === 'medecin' ? 'patient' : role));
    },
    [chooseRole, openSession],
  );

  const switchDemoRole = useCallback(async () => {
    const s = sessionRef.current;
    if (!s || s.mode !== 'demo') return;
    await startDemo(s.role === 'patient' ? 'accompagnateur' : 'patient');
  }, [startDemo]);

  const reloadDemo = useCallback(async () => {
    const s = sessionRef.current;
    if (!s || s.mode !== 'demo') return;
    const fresh = buildDemoDb();
    dbRef.current = fresh;
    setDbState(fresh);
    await AsyncStorage.setItem(dbKey(s), JSON.stringify(fresh));
  }, []);

  const sessionFromUser = useCallback(async (userId: string, email: string | null, fallbackRole: Role, fallbackName: string) => {
    let role = fallbackRole;
    let fullName = fallbackName;
    if (supabase) {
      const { data } = await supabase.from('profiles').select('role, full_name').eq('id', userId).maybeSingle();
      if (data) {
        role = data.role as Role;
        fullName = data.full_name as string;
      }
    }
    return { mode: 'supabase', userId, role, fullName, email } satisfies Session;
  }, []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      if (!supabase) return 'no_backend';
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error || !data.user) return error?.message ?? 'Connexion impossible';
      const s = await sessionFromUser(data.user.id, data.user.email ?? null, chosenRole ?? 'patient', '');
      chooseRole(s.role);
      await openSession(s);
      return null;
    },
    [chosenRole, chooseRole, openSession, sessionFromUser],
  );

  const signUp = useCallback(
    async (input: SignUpInput): Promise<string | null> => {
      if (!supabase) return 'no_backend';
      const { data, error } = await supabase.auth.signUp({
        email: input.email.trim(),
        password: input.password,
        options: { data: { full_name: input.fullName.trim(), phone: input.phone.trim(), role: input.role } },
      });
      if (error) return error.message;
      if (!data.session || !data.user) return 'confirm_email';
      const s = await sessionFromUser(data.user.id, data.user.email ?? null, input.role, input.fullName.trim());
      await openSession(s);
      return null;
    },
    [openSession, sessionFromUser],
  );

  const signOut = useCallback(async () => {
    const s = sessionRef.current;
    if (s?.mode === 'supabase' && supabase) {
      await syncNow();
      await supabase.auth.signOut().catch(() => {});
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (s) await AsyncStorage.setItem(dbKey(s), JSON.stringify(dbRef.current)).catch(() => {});
    await AsyncStorage.removeItem(SESSION_KEY);
    sessionRef.current = null;
    setSession(null);
    const blank = emptyDb();
    dbRef.current = blank;
    setDbState(blank);
  }, [syncNow]);

  // ---------- Liens accompagnateur ----------

  const redeemInvite = useCallback<DataCtx['redeemInvite']>(
    async (code) => {
      const s = sessionRef.current;
      if (!s) return { ok: false, reason: 'invalid' };
      if (s.mode === 'demo') {
        const inv = Object.values(dbRef.current.tables.invites).find(
          (i) => i.code === code && !i.used_at && new Date(i.expires_at) > new Date(),
        );
        if (!inv) return { ok: false, reason: 'invalid' };
        const t = nowIso();
        commit((d) => {
          const existing = Object.values(d.tables.care_links).find(
            (l) => l.patient_id === inv.patient_id && l.caregiver_id === s.userId,
          );
          const link = existing
            ? { ...existing, status: 'active' as const, updated_at: t }
            : { id: uuid(), patient_id: inv.patient_id, caregiver_id: s.userId, status: 'active' as const, created_at: t, updated_at: t };
          return {
            ...d,
            tables: {
              ...d.tables,
              care_links: { ...d.tables.care_links, [link.id]: link },
              invites: { ...d.tables.invites, [inv.id]: { ...inv, used_at: t, used_by: s.userId } },
            },
          };
        });
        return { ok: true, patientId: inv.patient_id };
      }
      if (!supabase) return { ok: false, reason: 'invalid' };
      const { data, error } = await supabase.rpc('redeem_invite', { p_code: code });
      if (error) return { ok: false, reason: isNetworkError(error) ? 'network' : 'invalid' };
      await syncNow();
      return { ok: true, patientId: String(data) };
    },
    [commit, syncNow],
  );

  // Préférences locales (non synchronisées)
  const markAlertsSeen = useCallback(
    (ids: string[]) => {
      const uid = sessionRef.current?.userId;
      if (!uid || ids.length === 0) return;
      commit((d) => {
        const prev = new Set(d.seenAlerts[uid] ?? []);
        ids.forEach((i) => prev.add(i));
        return { ...d, seenAlerts: { ...d.seenAlerts, [uid]: [...prev] } };
      });
    },
    [commit],
  );

  const markLessonRead = useCallback(
    (lessonId: string) => {
      const uid = sessionRef.current?.userId;
      if (!uid) return;
      commit((d) => {
        const prev = new Set(d.readLessons[uid] ?? []);
        prev.add(lessonId);
        return { ...d, readLessons: { ...d.readLessons, [uid]: [...prev] } };
      });
    },
    [commit],
  );

  const value = useMemo<DataCtx>(
    () => ({
      ready,
      session,
      chosenRole,
      db,
      online,
      syncing,
      pending: db.outbox.length,
      chooseRole,
      startDemo,
      switchDemoRole,
      reloadDemo,
      signIn,
      signUp,
      signOut,
      upsert,
      insert,
      update,
      syncNow,
      redeemInvite,
      markAlertsSeen,
      markLessonRead,
    }),
    [ready, session, chosenRole, db, online, syncing, chooseRole, startDemo, switchDemoRole, reloadDemo, signIn, signUp, signOut, upsert, insert, update, syncNow, redeemInvite, markAlertsSeen, markLessonRead],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataCtx {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData hors DataProvider');
  return ctx;
}

const NO_SESSION: Session = { mode: 'demo', userId: '', role: 'patient', fullName: '', email: null };

/** Session courante (écrans réservés aux utilisateurs connectés ; valeur neutre pendant la déconnexion). */
export function useSession(): Session {
  const { session } = useData();
  return session ?? NO_SESSION;
}

-- =====================================================================
-- GlycoLife — schéma Supabase (PostgreSQL)
-- À exécuter dans Supabase › SQL Editor (une seule fois, sur un projet vide).
-- RLS activée sur TOUTES les tables. La clé service_role ne va JAMAIS dans l'app.
-- Les glycémies sont stockées en mg/dL.
-- =====================================================================

-- sha256() et gen_random_uuid() sont natifs (PostgreSQL 13+) : aucune extension requise.

-- ---------------------------------------------------------------------
-- Profils (créés automatiquement à l'inscription)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('patient', 'accompagnateur', 'medecin')),
  full_name text not null default '',
  phone text,
  language text not null default 'fr' check (language in ('fr', 'ln')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r text := coalesce(new.raw_user_meta_data ->> 'role', 'patient');
begin
  -- Le rôle « medecin » n'est jamais attribué par auto-inscription : il est validé côté administration.
  if r not in ('patient', 'accompagnateur') then r := 'patient'; end if;
  insert into public.profiles (id, role, full_name, phone)
  values (new.id, r, coalesce(new.raw_user_meta_data ->> 'full_name', ''), new.raw_user_meta_data ->> 'phone');
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Liens patient ↔ accompagnateur / médecin
-- ---------------------------------------------------------------------
create table if not exists public.care_links (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  caregiver_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (patient_id, caregiver_id)
);

create table if not exists public.doctor_links (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  doctor_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (patient_id, doctor_id)
);

create table if not exists public.invites (
  id uuid primary key,
  patient_id uuid not null references public.profiles (id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  check (expires_at <= created_at + interval '25 hours')
);

-- ---------------------------------------------------------------------
-- Données médicales (écrites UNIQUEMENT par le patient)
-- ---------------------------------------------------------------------
create table if not exists public.medical_profiles (
  patient_id uuid primary key references public.profiles (id) on delete cascade,
  birth_year int check (birth_year between 1900 and 2100),
  sex text check (sex in ('F', 'M')),
  diabetes_type text check (diabetes_type in ('type1', 'type2', 'gestationnel', 'autre', 'inconnu')),
  diagnosis_year int check (diagnosis_year between 1900 and 2100),
  treatments text[] not null default '{}',
  allergies text[] not null default '{}',
  other_allergy text,
  meals_per_day int,
  usual_foods text[] not null default '{}',
  activity text check (activity in ('faible', 'moderee', 'elevee')),
  blood_group text,
  emergency_name text,
  emergency_phone text,
  target_min int not null default 70 check (target_min >= 54),
  target_max int not null default 180 check (target_max <= 250),
  unit text not null default 'g/L' check (unit in ('g/L', 'mg/dL')),
  share_readings boolean not null default true,
  share_alerts boolean not null default true,
  share_profile boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (target_min < target_max)
);

create table if not exists public.glucose_readings (
  id uuid primary key,
  patient_id uuid not null references public.profiles (id) on delete cascade,
  value_mgdl int not null check (value_mgdl between 20 and 600),
  moment text not null check (moment in ('a_jeun', 'avant_repas', 'apres_repas', 'coucher', 'autre')),
  feelings text[] not null default '{}',
  meal text,
  note text,
  measured_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists glucose_patient_time on public.glucose_readings (patient_id, measured_at desc);

create table if not exists public.meals (
  id uuid primary key,
  patient_id uuid not null references public.profiles (id) on delete cascade,
  eaten_at timestamptz not null,
  items jsonb not null default '[]',
  carbs_total int not null default 0,
  note text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.medications (
  id uuid primary key,
  patient_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  dose text not null default '',
  times text[] not null default '{}',
  active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.medication_logs (
  id uuid primary key,
  patient_id uuid not null references public.profiles (id) on delete cascade,
  medication_id uuid not null references public.medications (id) on delete cascade,
  day date not null,
  slot text not null check (slot ~ '^[0-2][0-9]:[0-5][0-9]$'),
  taken_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key,
  patient_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('consultation', 'labo')),
  title text not null,
  at timestamptz not null,
  place text,
  doctor text,
  note text,
  done boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vitals (
  id uuid primary key,
  patient_id uuid not null references public.profiles (id) on delete cascade,
  measured_at timestamptz not null,
  weight_kg numeric(5, 1) check (weight_kg between 20 and 300),
  sys int check (sys between 60 and 260),
  dia int check (dia between 30 and 160),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Messagerie (uniquement entre personnes reliées)
-- ---------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists messages_pair on public.messages (sender_id, recipient_id, created_at);

-- ---------------------------------------------------------------------
-- Fonctions d'autorisation (security definer : évitent la récursion RLS)
-- ---------------------------------------------------------------------
create or replace function public.is_caregiver_of(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from care_links where patient_id = p and caregiver_id = auth.uid() and status = 'active');
$$;

create or replace function public.is_doctor_of(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from doctor_links where patient_id = p and doctor_id = auth.uid() and status = 'active');
$$;

create or replace function public.share_flag(p uuid, flag text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select case flag when 'readings' then share_readings when 'alerts' then share_alerts else share_profile end
    from medical_profiles where patient_id = p
  ), case flag when 'profile' then false else true end);
$$;

create or replace function public.patient_target(p uuid, out tmin int, out tmax int)
language sql stable security definer set search_path = public as $$
  select coalesce((select target_min from medical_profiles where patient_id = p), 70),
         coalesce((select target_max from medical_profiles where patient_id = p), 180);
$$;

/** L'accompagnateur voit une mesure si : lien actif ET (partage des mesures OU (partage des alertes ET hors cible)). */
create or replace function public.caregiver_can_see_reading(p uuid, v int)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_caregiver_of(p) and (
    public.share_flag(p, 'readings')
    or (public.share_flag(p, 'alerts') and (v < (public.patient_target(p)).tmin or v > (public.patient_target(p)).tmax))
  );
$$;

create or replace function public.are_connected(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from care_links
    where status = 'active' and ((patient_id = a and caregiver_id = b) or (patient_id = b and caregiver_id = a))
  ) or exists (
    select 1 from doctor_links
    where status = 'active' and ((patient_id = a and doctor_id = b) or (patient_id = b and doctor_id = a))
  );
$$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.care_links enable row level security;
alter table public.doctor_links enable row level security;
alter table public.invites enable row level security;
alter table public.medical_profiles enable row level security;
alter table public.glucose_readings enable row level security;
alter table public.meals enable row level security;
alter table public.medications enable row level security;
alter table public.medication_logs enable row level security;
alter table public.appointments enable row level security;
alter table public.vitals enable row level security;
alter table public.messages enable row level security;

-- profiles : soi-même, ou une personne reliée
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.are_connected(id, auth.uid()));
create policy profiles_update on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
-- Le rôle ne peut pas être changé par l'utilisateur.
revoke update on public.profiles from authenticated;
grant update (full_name, phone, language, updated_at) on public.profiles to authenticated;

-- care_links : lecture par les deux parties ; seul le patient peut révoquer (création via redeem_invite)
create policy care_links_select on public.care_links for select
  using (patient_id = auth.uid() or caregiver_id = auth.uid());
create policy care_links_update on public.care_links for update
  using (patient_id = auth.uid()) with check (patient_id = auth.uid());
revoke update on public.care_links from authenticated;
grant update (status, updated_at) on public.care_links to authenticated;

-- doctor_links : lecture par les deux parties ; le patient peut révoquer. Création : app médecin / administration.
create policy doctor_links_select on public.doctor_links for select
  using (patient_id = auth.uid() or doctor_id = auth.uid());
create policy doctor_links_update on public.doctor_links for update
  using (patient_id = auth.uid()) with check (patient_id = auth.uid());
revoke update on public.doctor_links from authenticated;
grant update (status, updated_at) on public.doctor_links to authenticated;

-- invites : le patient crée et voit les siennes (l'accompagnateur passe par redeem_invite)
create policy invites_select on public.invites for select using (patient_id = auth.uid());
create policy invites_insert on public.invites for insert
  with check (patient_id = auth.uid() and used_at is null and used_by is null
              and exists (select 1 from profiles where id = auth.uid() and role = 'patient'));

-- Tables médicales : écriture par le patient seul (D7), lecture selon liens et partage.
create policy medical_select on public.medical_profiles for select
  using (patient_id = auth.uid() or public.is_doctor_of(patient_id)
         or (public.is_caregiver_of(patient_id) and share_profile));
create policy medical_insert on public.medical_profiles for insert with check (patient_id = auth.uid());
create policy medical_update on public.medical_profiles for update using (patient_id = auth.uid()) with check (patient_id = auth.uid());

create policy readings_select on public.glucose_readings for select
  using (patient_id = auth.uid() or public.is_doctor_of(patient_id) or public.caregiver_can_see_reading(patient_id, value_mgdl));
create policy readings_insert on public.glucose_readings for insert with check (patient_id = auth.uid());
create policy readings_update on public.glucose_readings for update using (patient_id = auth.uid()) with check (patient_id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['meals', 'medications', 'medication_logs', 'appointments', 'vitals'] loop
    execute format($f$
      create policy %1$s_select on public.%1$s for select
        using (patient_id = auth.uid() or public.is_doctor_of(patient_id)
               or (public.is_caregiver_of(patient_id) and public.share_flag(patient_id, 'profile')));
      create policy %1$s_insert on public.%1$s for insert with check (patient_id = auth.uid());
      create policy %1$s_update on public.%1$s for update using (patient_id = auth.uid()) with check (patient_id = auth.uid());
    $f$, t);
  end loop;
end $$;
-- Pas de policy DELETE : suppression logique (deleted_at) uniquement, la trace reste.

-- messages : uniquement entre personnes reliées ; le destinataire peut seulement marquer « lu »
create policy messages_select on public.messages for select
  using (sender_id = auth.uid() or recipient_id = auth.uid());
create policy messages_insert on public.messages for insert
  with check (sender_id = auth.uid() and public.are_connected(sender_id, recipient_id));
create policy messages_update on public.messages for update
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
revoke update on public.messages from authenticated;
grant update (read_at) on public.messages to authenticated;

-- ---------------------------------------------------------------------
-- RPC : invitation (code 6 caractères, 24 h, usage unique)
-- ---------------------------------------------------------------------
create or replace function public.redeem_invite(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  inv invites%rowtype;
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'accompagnateur') then
    raise exception 'Seul un accompagnateur peut utiliser un code';
  end if;
  select * into inv from invites
    where code = upper(p_code) and used_at is null and expires_at > now()
    for update;
  if not found then raise exception 'Code invalide, expiré ou déjà utilisé'; end if;
  if inv.patient_id = auth.uid() then raise exception 'Code invalide'; end if;

  insert into care_links (patient_id, caregiver_id, status)
  values (inv.patient_id, auth.uid(), 'active')
  on conflict (patient_id, caregiver_id) do update set status = 'active', updated_at = now();

  update invites set used_at = now(), used_by = auth.uid() where id = inv.id;
  return inv.patient_id;
end $$;

-- RPC : résumé des proches suivis (nom, cible, choix de partage) — sans exposer le dossier médical.
create or replace function public.linked_patients()
returns table (
  patient_id uuid, full_name text, phone text, target_min int, target_max int,
  share_readings boolean, share_alerts boolean, share_profile boolean
) language sql stable security definer set search_path = public as $$
  select l.patient_id, p.full_name, p.phone,
         coalesce(m.target_min, 70), coalesce(m.target_max, 180),
         coalesce(m.share_readings, true), coalesce(m.share_alerts, true), coalesce(m.share_profile, false)
  from care_links l
  join profiles p on p.id = l.patient_id
  left join medical_profiles m on m.patient_id = l.patient_id
  where l.caregiver_id = auth.uid() and l.status = 'active';
$$;

-- ---------------------------------------------------------------------
-- Journal chaîné « type blockchain » (intégrité des modifications médicales)
-- hash = SHA-256(hash_précédent + table + action + données)
-- ---------------------------------------------------------------------
create table if not exists public.audit_chain (
  id bigserial primary key,
  patient_id uuid not null,
  table_name text not null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  row_data jsonb not null,
  actor uuid,
  prev_hash text not null,
  hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists audit_patient on public.audit_chain (patient_id, id);
alter table public.audit_chain enable row level security;
-- Lecture : le patient et son médecin. AUCUNE écriture directe possible (pas de policy insert/update/delete).
create policy audit_select on public.audit_chain for select
  using (patient_id = auth.uid() or public.is_doctor_of(patient_id));
revoke insert, update, delete on public.audit_chain from authenticated, anon;

create or replace function public.audit_write()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  rec jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  pid uuid := (rec ->> 'patient_id')::uuid;
  prev text;
begin
  -- Sérialise les écritures d'un même patient pour garder une chaîne linéaire.
  perform pg_advisory_xact_lock(hashtext(pid::text));
  select hash into prev from audit_chain where patient_id = pid order by id desc limit 1;
  prev := coalesce(prev, repeat('0', 64));
  insert into audit_chain (patient_id, table_name, action, row_data, actor, prev_hash, hash)
  values (pid, tg_table_name, tg_op, rec, auth.uid(), prev,
          encode(sha256(convert_to(prev || tg_table_name || tg_op || rec::text, 'UTF8')), 'hex'));
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['medical_profiles', 'glucose_readings', 'meals', 'medications', 'medication_logs', 'appointments', 'vitals'] loop
    execute format('drop trigger if exists audit_%1$s on public.%1$s', t);
    execute format('create trigger audit_%1$s after insert or update or delete on public.%1$s
                    for each row execute function public.audit_write()', t);
  end loop;
end $$;

/** Recalcule toute la chaîne d'un patient. Renvoie l'id de la première ligne altérée, ou null si intacte. */
create or replace function public.verify_chain(p_patient uuid)
returns table (ok boolean, first_broken_id bigint, checked int)
language plpgsql stable security definer set search_path = public as $$
declare
  r audit_chain%rowtype;
  prev text := repeat('0', 64);
  n int := 0;
begin
  if p_patient <> auth.uid() and not public.is_doctor_of(p_patient) then
    raise exception 'Accès refusé';
  end if;
  for r in select * from audit_chain where patient_id = p_patient order by id loop
    n := n + 1;
    if r.prev_hash <> prev
       or r.hash <> encode(sha256(convert_to(prev || r.table_name || r.action || r.row_data::text, 'UTF8')), 'hex') then
      return query select false, r.id, n;
      return;
    end if;
    prev := r.hash;
  end loop;
  return query select true, null::bigint, n;
end $$;

-- ---------------------------------------------------------------------
-- updated_at automatique
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles', 'care_links', 'doctor_links', 'medical_profiles', 'glucose_readings', 'meals', 'medications', 'medication_logs', 'appointments', 'vitals'] loop
    execute format('drop trigger if exists touch_%1$s on public.%1$s', t);
    execute format('create trigger touch_%1$s before update on public.%1$s for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

grant execute on function public.redeem_invite(text) to authenticated;
grant execute on function public.linked_patients() to authenticated;
grant execute on function public.verify_chain(uuid) to authenticated;

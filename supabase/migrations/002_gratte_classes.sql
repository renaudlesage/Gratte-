-- Gratte : rôles super admin / prof / élève, classes, activations et partitions poussées.
-- Toutes les tables sont préfixées gratte_ (le projet Supabase peut héberger d'autres applis).
-- Super admins et profs se connectent par e-mail (Supabase Auth). Les élèves n'ont pas de compte :
-- code de classe + prénom + code secret à 4 chiffres, via des fonctions RPC qui vérifient un jeton.

create table if not exists public.gratte_admins (
  email text primary key check (email = lower(email))
);

create table if not exists public.gratte_teachers (
  email text primary key check (email = lower(email)),
  name text,
  added_at timestamptz not null default now()
);

create or replace function public.gratte_email() returns text
language sql stable set search_path = '' as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) $$;

create or replace function public.gratte_is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.gratte_admins where email = public.gratte_email())
$$;

create or replace function public.gratte_is_teacher() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.gratte_is_admin() or exists (select 1 from public.gratte_teachers where email = public.gratte_email())
$$;

-- Rôle de l'utilisateur connecté : 'admin', 'prof' ou null
create or replace function public.gratte_role() returns text
language sql stable security definer set search_path = '' as $$
  select case when public.gratte_is_admin() then 'admin' when public.gratte_is_teacher() then 'prof' end
$$;

-- Code de classe : 6 caractères sans ambiguïté (pas de 0/O, 1/I/L)
create or replace function public.gratte_new_code() returns text
language plpgsql volatile set search_path = '' as $$
declare
  abc constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  c text;
begin
  loop
    c := '';
    for i in 1..6 loop
      c := c || substr(abc, 1 + floor(random() * length(abc))::int, 1);
    end loop;
    exit when not exists (select 1 from public.gratte_classes where code = c);
  end loop;
  return c;
end $$;

create table if not exists public.gratte_classes (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(name) between 1 and 80),
  code text not null unique,
  exit_pin text not null default lpad(floor(random() * 10000)::int::text, 4, '0') check (exit_pin ~ '^[0-9]{4}$'),
  created_at timestamptz not null default now()
);
alter table public.gratte_classes alter column code set default public.gratte_new_code();

create table if not exists public.gratte_students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.gratte_classes (id) on delete cascade,
  prenom text not null check (length(prenom) between 1 and 40),
  pin_hash text not null,
  token uuid not null unique default gen_random_uuid(),
  fails int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  last_seen timestamptz
);
create unique index if not exists gratte_students_prenom on public.gratte_students (class_id, lower(prenom));

-- Activations : pour toute la classe (student_id null) ou pour un élève
create table if not exists public.gratte_unlocks (
  id bigint generated always as identity primary key,
  class_id uuid not null references public.gratte_classes (id) on delete cascade,
  student_id uuid references public.gratte_students (id) on delete cascade,
  item text not null check (length(item) between 3 and 80),
  created_at timestamptz not null default now()
);
create unique index if not exists gratte_unlocks_one on public.gratte_unlocks (class_id, coalesce(student_id, '00000000-0000-0000-0000-000000000000'::uuid), item);
create index if not exists gratte_unlocks_student on public.gratte_unlocks (student_id);

-- Partitions poussées par le super admin (pages photographiées ou tablature au format de l'appli)
create table if not exists public.gratte_scores (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 120),
  folder text not null default 'Partitions' check (length(folder) between 1 and 60),
  num int,
  kind text not null default 'scan' check (kind in ('scan', 'tab')),
  tab jsonb,
  page_count int not null default 0,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists gratte_scores_created_by on public.gratte_scores (created_by);

create table if not exists public.gratte_score_pages (
  score_id uuid not null references public.gratte_scores (id) on delete cascade,
  page int not null,
  mime text not null default 'image/jpeg' check (mime in ('image/jpeg', 'image/png', 'image/webp')),
  data text not null check (length(data) < 4000000), -- image en base64 (≈ 3 Mo max)
  primary key (score_id, page)
);

-- Une nouvelle classe démarre avec l'accordeur et le métronome
create or replace function public.gratte_class_defaults() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.gratte_unlocks (class_id, item) values (new.id, 'outils.accordeur'), (new.id, 'outils.metronome');
  return new;
end $$;
drop trigger if exists gratte_class_defaults on public.gratte_classes;
create trigger gratte_class_defaults after insert on public.gratte_classes for each row execute function public.gratte_class_defaults();

-- ---------- Sécurité (RLS) ----------
alter table public.gratte_admins enable row level security;
alter table public.gratte_teachers enable row level security;
alter table public.gratte_classes enable row level security;
alter table public.gratte_students enable row level security;
alter table public.gratte_unlocks enable row level security;
alter table public.gratte_scores enable row level security;
alter table public.gratte_score_pages enable row level security;

create policy gratte_admins_read on public.gratte_admins for select to authenticated using ((select public.gratte_is_admin()));

create policy gratte_teachers_read on public.gratte_teachers for select to authenticated
  using ((select public.gratte_is_admin()) or email = (select public.gratte_email()));
create policy gratte_teachers_insert on public.gratte_teachers for insert to authenticated with check ((select public.gratte_is_admin()));
create policy gratte_teachers_update on public.gratte_teachers for update to authenticated using ((select public.gratte_is_admin())) with check ((select public.gratte_is_admin()));
create policy gratte_teachers_delete on public.gratte_teachers for delete to authenticated using ((select public.gratte_is_admin()));

create or replace function public.gratte_owns_class(c uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.gratte_is_admin() or (public.gratte_is_teacher() and exists (select 1 from public.gratte_classes where id = c and owner = auth.uid()))
$$;

create policy gratte_classes_read on public.gratte_classes for select to authenticated
  using ((select public.gratte_is_admin()) or (owner = (select auth.uid()) and (select public.gratte_is_teacher())));
create policy gratte_classes_insert on public.gratte_classes for insert to authenticated
  with check (owner = (select auth.uid()) and (select public.gratte_is_teacher()));
create policy gratte_classes_update on public.gratte_classes for update to authenticated
  using ((select public.gratte_owns_class(id))) with check ((select public.gratte_owns_class(id)));
create policy gratte_classes_delete on public.gratte_classes for delete to authenticated using ((select public.gratte_owns_class(id)));

create policy gratte_students_read on public.gratte_students for select to authenticated using ((select public.gratte_owns_class(class_id)));
create policy gratte_students_update on public.gratte_students for update to authenticated
  using ((select public.gratte_owns_class(class_id))) with check ((select public.gratte_owns_class(class_id)));
create policy gratte_students_delete on public.gratte_students for delete to authenticated using ((select public.gratte_owns_class(class_id)));

create policy gratte_unlocks_read on public.gratte_unlocks for select to authenticated using ((select public.gratte_owns_class(class_id)));
create policy gratte_unlocks_insert on public.gratte_unlocks for insert to authenticated with check ((select public.gratte_owns_class(class_id)));
create policy gratte_unlocks_delete on public.gratte_unlocks for delete to authenticated using ((select public.gratte_owns_class(class_id)));

create policy gratte_scores_read on public.gratte_scores for select to authenticated using ((select public.gratte_is_teacher()));
create policy gratte_scores_insert on public.gratte_scores for insert to authenticated with check ((select public.gratte_is_admin()));
create policy gratte_scores_update on public.gratte_scores for update to authenticated using ((select public.gratte_is_admin())) with check ((select public.gratte_is_admin()));
create policy gratte_scores_delete on public.gratte_scores for delete to authenticated using ((select public.gratte_is_admin()));

create policy gratte_pages_read on public.gratte_score_pages for select to authenticated using ((select public.gratte_is_teacher()));
create policy gratte_pages_insert on public.gratte_score_pages for insert to authenticated with check ((select public.gratte_is_admin()));
create policy gratte_pages_delete on public.gratte_score_pages for delete to authenticated using ((select public.gratte_is_admin()));

-- ---------- Accès élève (sans compte) ----------
-- Rejoindre une classe ou se reconnecter : prénom + code secret à 4 chiffres. 5 erreurs → 15 minutes de blocage.
create or replace function public.gratte_student_join(p_code text, p_prenom text, p_pin text) returns json
language plpgsql security definer set search_path = '' as $$
declare
  cl public.gratte_classes;
  st public.gratte_students;
  nm text := btrim(regexp_replace(coalesce(p_prenom, ''), '\s+', ' ', 'g'));
begin
  if coalesce(p_pin, '') !~ '^[0-9]{4}$' then raise exception 'Le code secret doit avoir 4 chiffres.'; end if;
  if length(nm) < 1 or length(nm) > 40 then raise exception 'Prénom invalide.'; end if;
  select * into cl from public.gratte_classes where code = upper(btrim(coalesce(p_code, '')));
  if not found then raise exception 'Code de classe inconnu.'; end if;
  select * into st from public.gratte_students where class_id = cl.id and lower(prenom) = lower(nm);
  if not found then
    insert into public.gratte_students (class_id, prenom, pin_hash)
      values (cl.id, nm, extensions.crypt(p_pin, extensions.gen_salt('bf'))) returning * into st;
  else
    if st.locked_until is not null and st.locked_until > now() then
      raise exception 'Trop d''essais : réessayez dans quelques minutes.';
    end if;
    if st.pin_hash <> extensions.crypt(p_pin, st.pin_hash) then
      update public.gratte_students set fails = fails + 1,
        locked_until = case when fails + 1 >= 5 then now() + interval '15 minutes' end where id = st.id;
      raise exception 'Ce prénom existe déjà dans la classe avec un autre code secret.';
    end if;
    update public.gratte_students set fails = 0, locked_until = null where id = st.id;
  end if;
  return json_build_object('token', st.token, 'prenom', st.prenom, 'classe', cl.name);
end $$;

-- Ce que l'élève a le droit de voir (activations de la classe et personnelles, partitions poussées activées)
create or replace function public.gratte_student_state(p_token uuid) returns json
language plpgsql security definer set search_path = '' as $$
declare
  st public.gratte_students;
  cl public.gratte_classes;
  its text[];
begin
  select * into st from public.gratte_students where token = p_token;
  if not found then return null; end if;
  select * into cl from public.gratte_classes where id = st.class_id;
  update public.gratte_students set last_seen = now() where id = st.id;
  select coalesce(array_agg(distinct item), '{}') into its from public.gratte_unlocks
    where class_id = st.class_id and (student_id is null or student_id = st.id);
  return json_build_object(
    'prenom', st.prenom,
    'classe', cl.name,
    'items', its,
    'scores', coalesce((select json_agg(json_build_object('id', s.id, 'title', s.title, 'folder', s.folder, 'num', s.num,
        'kind', s.kind, 'tab', s.tab, 'page_count', s.page_count) order by s.folder, s.num, s.title)
      from public.gratte_scores s where 'score:' || s.id::text = any (its)), '[]'::json)
  );
end $$;

create or replace function public.gratte_student_page(p_token uuid, p_score uuid, p_page int) returns json
language plpgsql security definer set search_path = '' as $$
declare st public.gratte_students;
begin
  select * into st from public.gratte_students where token = p_token;
  if not found then return null; end if;
  if not exists (select 1 from public.gratte_unlocks where class_id = st.class_id
      and (student_id is null or student_id = st.id) and item = 'score:' || p_score::text) then
    return null;
  end if;
  return (select json_build_object('mime', mime, 'data', data) from public.gratte_score_pages where score_id = p_score and page = p_page);
end $$;

-- Quitter le mode élève : code de sortie de la classe (connu du prof)
create or replace function public.gratte_student_leave(p_token uuid, p_exit_pin text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.gratte_students s join public.gratte_classes c on c.id = s.class_id
    where s.token = p_token and c.exit_pin = p_exit_pin)
$$;

revoke execute on function public.gratte_student_join(text, text, text), public.gratte_student_state(uuid),
  public.gratte_student_page(uuid, uuid, int), public.gratte_student_leave(uuid, text) from public;
grant execute on function public.gratte_student_join(text, text, text), public.gratte_student_state(uuid),
  public.gratte_student_page(uuid, uuid, int), public.gratte_student_leave(uuid, text) to anon, authenticated;
revoke execute on function public.gratte_class_defaults() from public, anon, authenticated;

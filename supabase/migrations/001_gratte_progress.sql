-- Gratte : progression synchronisée entre appareils (une ligne par utilisateur)
create table if not exists public.gratte_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.gratte_progress enable row level security;

-- Chacun ne voit et ne modifie que sa propre progression
create policy "gratte_progress_select_own" on public.gratte_progress
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "gratte_progress_insert_own" on public.gratte_progress
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "gratte_progress_update_own" on public.gratte_progress
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "gratte_progress_delete_own" on public.gratte_progress
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Gratte : suivi des progrès des élèves par leur prof.
-- L'élève (sans compte) garde sa progression sur son appareil et en envoie un résumé compact
-- (objectifs atteints par leçon, records, jours de pratique) via une fonction RPC qui vérifie son jeton.
-- Le prof le lit avec la règle existante gratte_students_read (select sur gratte_students de ses classes).

alter table public.gratte_students add column if not exists progress jsonb;
alter table public.gratte_students add column if not exists progress_at timestamptz;

-- Résumé : un objet JSON de moins de 20 ko
alter table public.gratte_students drop constraint if exists gratte_students_progress_size;
alter table public.gratte_students add constraint gratte_students_progress_size
  check (progress is null or (jsonb_typeof(progress) = 'object' and octet_length(progress::text) < 20000));

-- Envoi du résumé par l'élève : false si le jeton est inconnu ou le résumé invalide
create or replace function public.gratte_student_push(p_token uuid, p_summary jsonb) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if p_token is null or p_summary is null or jsonb_typeof(p_summary) <> 'object'
     or octet_length(p_summary::text) >= 20000 then
    return false;
  end if;
  update public.gratte_students
    set progress = p_summary, progress_at = now(), last_seen = now()
    where token = p_token;
  return found;
end $$;

revoke execute on function public.gratte_student_push(uuid, jsonb) from public;
grant execute on function public.gratte_student_push(uuid, jsonb) to anon, authenticated;

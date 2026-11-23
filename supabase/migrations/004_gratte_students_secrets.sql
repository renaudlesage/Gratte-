-- Gratte : le jeton de connexion et l'empreinte du code secret des élèves ne sont plus lisibles par les profs.
-- Avant : la règle gratte_students_read filtrait les lignes mais pas les colonnes, et gratte_students_update
-- permettait de réécrire token / pin_hash. Un prof pouvait donc se connecter à la place d'un élève.
-- Les élèves eux-mêmes passent par les fonctions RPC (security definer), qui ne dépendent pas de ces droits.

-- Lecture : seulement les colonnes utiles au prof (privilèges par colonne)
revoke select, insert, update, truncate, references, trigger on public.gratte_students from anon, authenticated;
revoke select on public.gratte_students from anon;
grant select (id, class_id, prenom, fails, locked_until, created_at, last_seen, progress, progress_at)
  on public.gratte_students to authenticated;

-- Modification : l'appli n'en fait aucune côté prof ; on supprime la règle qui permettait de changer token / pin_hash
drop policy if exists gratte_students_update on public.gratte_students;

-- La suppression d'un élève par son prof reste possible (règle gratte_students_delete)
revoke delete on public.gratte_students from anon;
grant delete on public.gratte_students to authenticated;

-- get_my_role() body references `profiles` unqualified, but an earlier
-- hardening migration set search_path to '' — that empty path makes the
-- unqualified reference unresolvable, so every call (and every RLS check
-- that depends on it) errors out. Scope the table reference instead.

create or replace function public.get_my_role()
returns text
language sql
security definer
set search_path to ''
as $function$
  select role from public.profiles where id = auth.uid();
$function$;

-- Lists every RLS policy on profiles/invites so we can see exactly which
-- ones call get_my_role() and for which roles (anon vs authenticated).
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'invites')
order by tablename, policyname;

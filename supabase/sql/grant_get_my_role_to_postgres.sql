-- handle_new_user() runs SECURITY DEFINER as `postgres` (the SQL Editor's
-- role), so its insert into public.profiles evaluates that table's RLS
-- policies as `postgres`. The earlier hardening revoked EXECUTE on
-- get_my_role() from PUBLIC and only re-granted `authenticated`, so the
-- trigger's insert fails with "permission denied for function get_my_role".
-- Re-grant to the privileged roles that need to bypass RLS internally.

grant execute on function public.get_my_role() to postgres, service_role;

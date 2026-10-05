-- These policies check get_my_role() = 'admin', but are scoped TO public,
-- meaning they also apply to the `anon` role. Postgres must evaluate every
-- applicable permissive policy's qual to OR them together, so any anon
-- request to these tables (e.g. the pre-signup invite-code lookup) tries to
-- call get_my_role() and fails with "permission denied" since anon has no
-- EXECUTE on it. Scoping these to `authenticated` removes anon from needing
-- to satisfy them at all — no change to admin/authenticated behavior.

alter policy "Admin full access invites" on public.invites to authenticated;
alter policy "Admin full access profiles" on public.profiles to authenticated;
alter policy "Admins can read all profiles" on public.profiles to authenticated;

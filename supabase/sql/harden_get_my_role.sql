-- Fixes for Supabase security linter findings:
--   anon_security_definer_function_executable
--   authenticated_security_definer_function_executable
--
-- get_my_role() must stay callable by `authenticated` because RLS policies
-- on profiles/invites call it to avoid recursive policy evaluation.
-- `anon` never needs it (this app requires sign-in), so that grant is removed.
-- Pinning search_path also closes the function_search_path_mutable finding
-- for this SECURITY DEFINER function.

revoke execute on function public.get_my_role() from anon, public;
grant execute on function public.get_my_role() to authenticated;
alter function public.get_my_role() set search_path = '';

-- Run in the Supabase SQL Editor (or via `supabase db execute`), then re-run
-- the Security Advisor to confirm both findings clear.

-- One-off fix for a user whose profiles row was never created because
-- Supabase's "Confirm email" setting makes auth.signUp() return a null
-- session immediately, so SignupScreen.js bailed out before the insert.

-- 1. Check what role/email his invite was for:
select * from public.invites where email = 'tristin@heirloomstairandiron.com';

-- 2. Create his missing profile row (edit name/role as needed — he can
--    fix name/username himself later from "My Account" once logged in):
insert into public.profiles (id, name, username, email, role)
values (
  'a199c0e2-764f-45d2-ad98-c58823ddc59b',
  'Tristin',
  'tristin',
  'tristin@heirloomstairandiron.com',
  'viewer' -- match the role from his invite row above
);

-- 3. Mark his invite as used:
update public.invites
set used = true
where email = 'tristin@heirloomstairandiron.com';

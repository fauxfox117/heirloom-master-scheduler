-- Makes profile creation atomic with auth user creation, so a dropped
-- connection, bad username, or retried signup can never again leave an
-- auth.users row with no matching profiles row (what happened to Tristin).
--
-- SignupScreen.js must pass name/username/invite_token via
-- supabase.auth.signUp({ options: { data: { ... } } }) — see accompanying
-- code change. The update-returning pattern below also closes a race
-- condition where two people redeeming the same invite code at the same
-- moment could both succeed.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  update public.invites
  set used = true
  where token = new.raw_user_meta_data ->> 'invite_token'
    and used = false
  returning role into v_role;

  if v_role is null then
    raise exception 'Invalid or already-used invite code';
  end if;

  insert into public.profiles (id, name, username, email, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'name',
    lower(new.raw_user_meta_data ->> 'username'),
    new.email,
    v_role
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

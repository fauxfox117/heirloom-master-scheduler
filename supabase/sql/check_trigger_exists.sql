-- Confirms whether the signup trigger actually exists in the database.
select tgname, tgrelid::regclass as table_name, tgenabled
from pg_trigger
where tgname = 'on_auth_user_created';

-- Also confirm whether a profiles row now exists for the account you just
-- tried (swap in the real email):
select * from public.profiles where email = 'PUT_THE_TEST_EMAIL_HERE';

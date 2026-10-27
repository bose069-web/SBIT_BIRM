-- Solo para un proyecto que ya tenía las cuentas demo de alumno, profe y empresa.
-- Ejecutar DESPUÉS de la migración 20261027010000_cinco_roles.sql:
--   npx supabase db query --linked -f supabase/scripts/demo-cinco-roles.sql
-- Crea instituto@kampus.test y generalitat@kampus.test (contraseña kampus) y asigna el alumno al profe.

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token,
  email_change, email_change_token_new)
values
  ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated',
   'instituto@kampus.test', extensions.crypt('kampus', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"nombre":"Institut Demo (dirección)"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '55555555-5555-5555-5555-555555555555', 'authenticated', 'authenticated',
   'generalitat@kampus.test', extensions.crypt('kampus', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"nombre":"Generalitat Demo"}', now(), now(), '', '', '', '')
on conflict (id) do nothing;

update public.perfiles set rol = 'generalitat' where id = '55555555-5555-5555-5555-555555555555';
update public.perfiles set rol = 'instituto', centro_id = 'aaaaaaaa-0000-0000-0000-000000000001'
where id = '44444444-4444-4444-4444-444444444444';
update public.perfiles set profe_id = '22222222-2222-2222-2222-222222222222'
where id = '11111111-1111-1111-1111-111111111111';

-- Solo para un proyecto que ya tenía el seed antiguo (alumno, profe y admin, sin empresa).
-- Ejecutar DESPUÉS de las migraciones 20261026020000_roles_valoraciones y 20261027000000_seguridad_indices.
-- Crea empresa@kampus.test (contraseña kampus) y lo pone de tutor de empresa del dossier demo.
-- El admin demo sigue siendo admin y el alumno demo queda asignado al profe demo.

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token,
  email_change, email_change_token_new)
values ('00000000-0000-0000-0000-000000000000', '55555555-5555-5555-5555-555555555555', 'authenticated',
  'authenticated', 'empresa@kampus.test', extensions.crypt('kampus', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{"nombre":"Tutor Empresa Demo"}', now(), now(),
  '', '', '', '')
on conflict (id) do nothing;

update public.perfiles set rol = 'empresa' where id = '55555555-5555-5555-5555-555555555555';

update public.perfiles set profe_id = '22222222-2222-2222-2222-222222222222'
where id = '11111111-1111-1111-1111-111111111111';

update public.dossiers set tutor_empresa_id = '55555555-5555-5555-5555-555555555555'
where id = 'cccccccc-0000-0000-0000-000000000001';

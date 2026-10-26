-- Datos de prueba para `supabase db reset` en local. Contraseña de los tres: kampus
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token,
  email_change, email_change_token_new)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated',
   'alumno@kampus.test', crypt('kampus', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}',
   '{"nombre":"Alumno Demo"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated',
   'profe@kampus.test', crypt('kampus', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}',
   '{"nombre":"Profe Demo"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated',
   'admin@kampus.test', crypt('kampus', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}',
   '{"nombre":"Admin Demo"}', now(), now(), '', '', '', '');

update public.perfiles set rol = 'profe' where id = '22222222-2222-2222-2222-222222222222';
update public.perfiles set rol = 'admin' where id = '33333333-3333-3333-3333-333333333333';

insert into public.centros (id, nombre, codigo) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Institut Demo', '08000000');
insert into public.empresas (id, nombre, cif) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Empresa Demo SL', 'B00000000');

insert into public.dossiers (id, alumno_id, tutor_id, centro_id, empresa_id, ciclo, fecha_inicio, fecha_fin, horas_totales)
values ('cccccccc-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222', 'aaaaaaaa-0000-0000-0000-000000000001',
  'bbbbbbbb-0000-0000-0000-000000000001', 'DAM', '2026-09-15', '2027-03-15', 400);

insert into public.actividades_formativas (dossier_id, descripcion, orden) values
  ('cccccccc-0000-0000-0000-000000000001', 'Desarrollo de interfaces', 1),
  ('cccccccc-0000-0000-0000-000000000001', 'Acceso a datos', 2),
  ('cccccccc-0000-0000-0000-000000000001', 'Pruebas y documentación', 3);

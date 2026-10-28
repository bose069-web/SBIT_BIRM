-- Datos de prueba para `supabase db reset` en local. Contraseña de todos: kampus
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
   'empresa@kampus.test', crypt('kampus', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}',
   '{"nombre":"Tutor Empresa Demo"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated',
   'instituto@kampus.test', crypt('kampus', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}',
   '{"nombre":"Institut Demo (dirección)"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '55555555-5555-5555-5555-555555555555', 'authenticated', 'authenticated',
   'generalitat@kampus.test', crypt('kampus', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}',
   '{"nombre":"Generalitat Demo"}', now(), now(), '', '', '', '');


insert into public.centros (id, nombre, codigo) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Institut Demo', '08000000');
insert into public.empresas (id, nombre, cif) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Empresa Demo SL', 'B00000000');
insert into public.convenios (centro_id, empresa_id, firmado_en) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '2026-06-30');

-- Instituto, profe y alumno son del centro (el alumno asignado al profe); el tutor de empresa
-- trabaja en la empresa; la generalitat no pertenece a ninguno.
update public.perfiles set rol = 'generalitat' where id = '55555555-5555-5555-5555-555555555555';
update public.perfiles set rol = 'instituto', centro_id = 'aaaaaaaa-0000-0000-0000-000000000001'
where id = '44444444-4444-4444-4444-444444444444';
update public.perfiles set rol = 'profe', centro_id = 'aaaaaaaa-0000-0000-0000-000000000001'
where id = '22222222-2222-2222-2222-222222222222';
update public.perfiles set centro_id = 'aaaaaaaa-0000-0000-0000-000000000001',
  profe_id = '22222222-2222-2222-2222-222222222222'
where id = '11111111-1111-1111-1111-111111111111';
update public.perfiles set rol = 'empresa', empresa_id = 'bbbbbbbb-0000-0000-0000-000000000001'
where id = '33333333-3333-3333-3333-333333333333';

insert into public.dossiers (id, alumno_id, tutor_id, tutor_empresa_id, centro_id, empresa_id, ciclo,
  fecha_inicio, fecha_fin, horas_totales)
values ('cccccccc-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333',
  'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001',
  'DAM', '2026-09-15', '2027-03-15', 400);

insert into public.actividades_formativas (id, dossier_id, descripcion, orden) values
  ('dddddddd-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', 'Desarrollo de interfaces', 1),
  ('dddddddd-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000001', 'Acceso a datos', 2),
  ('dddddddd-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000001', 'Pruebas y documentación', 3);

-- Un día de septiembre (ya valorado por la empresa) y uno de octubre (abierto).
insert into public.registros_diarios (id, dossier_id, fecha, tipo) values
  ('eeeeeeee-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', '2026-09-15', 'trabajo'),
  ('eeeeeeee-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000001', '2026-10-01', 'trabajo');
insert into public.horas_actividad (registro_id, actividad_id, dossier_id, horas) values
  ('eeeeeeee-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', 6),
  ('eeeeeeee-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000001', 4),
  ('eeeeeeee-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000001', 2);

insert into public.valoraciones_mensuales (dossier_id, mes, valoracion, comentario, valorada_por) values
  ('cccccccc-0000-0000-0000-000000000001', '2026-09-01', 'positiva', 'Buen inicio, se adapta rápido al equipo.',
   '33333333-3333-3333-3333-333333333333');

-- Clases del centro de ejemplo; el alumno de prueba va a DAM 2 A.
insert into public.grupos (id, centro_id, ciclo, curso, letra) values
  ('ffffffff-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'DAM', 2, 'A'),
  ('ffffffff-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'DAM', 1, 'A'),
  ('ffffffff-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'ASIX', 2, 'A');
update public.perfiles set grupo_id = 'ffffffff-0000-0000-0000-000000000001'
where id = '11111111-1111-1111-1111-111111111111';

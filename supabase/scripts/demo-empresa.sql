-- Solo para un proyecto que ya tenía el seed antiguo (alumno, profe, admin).
-- Ejecutar DESPUÉS de las migraciones 20261026020000 (roles) y 20261027000000 (centros y empresas):
--   npx supabase db query --linked -f supabase/scripts/demo-empresa.sql
-- Convierte admin@kampus.test en empresa@kampus.test (tutor de empresa del dossier demo).

update auth.users
set email = 'empresa@kampus.test',
    raw_user_meta_data = '{"nombre":"Tutor Empresa Demo"}'
where id = '33333333-3333-3333-3333-333333333333';

update public.perfiles
set email = 'empresa@kampus.test', nombre = 'Tutor Empresa Demo', rol = 'empresa',
    centro_id = null, empresa_id = 'bbbbbbbb-0000-0000-0000-000000000001'
where id = '33333333-3333-3333-3333-333333333333';

update public.dossiers
set tutor_empresa_id = '33333333-3333-3333-3333-333333333333'
where id = 'cccccccc-0000-0000-0000-000000000001';

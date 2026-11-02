-- Comprueba en LOCAL (tras `npm run db:reset`) el historial y su RLS. No deja nada: acaba en rollback.
--   docker exec -i supabase_db_kampus psql -U postgres -v ON_ERROR_STOP=1 < supabase/scripts/comprobar-historial.sql
begin;

create function pg_temp.entrar(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
end $$;

create function pg_temp.salir() returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', '', true);
end $$;

-- Un dossier ajeno y un tutor de empresa que no pinta nada en el demo.
insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
values ('00000000-0000-0000-0000-000000000000', '66666666-6666-6666-6666-666666666666', 'authenticated', 'authenticated', 'otra@kampus.test', '{"nombre":"Otra"}', now(), now(), '', '', '', ''),
       ('00000000-0000-0000-0000-000000000000', '77777777-7777-7777-7777-777777777777', 'authenticated', 'authenticated', 'otro-alumno@kampus.test', '{"nombre":"Otro"}', now(), now(), '', '', '', '');
update public.perfiles set rol = 'empresa', empresa_id = 'bbbbbbbb-0000-0000-0000-000000000001' where id = '66666666-6666-6666-6666-666666666666';
update public.perfiles set centro_id = 'aaaaaaaa-0000-0000-0000-000000000001' where id = '77777777-7777-7777-7777-777777777777';

create function pg_temp.visibles() returns bigint language sql as $$
  select count(*) from public.historial_dossier where dossier_id = 'cccccccc-0000-0000-0000-000000000001'
$$;

do $$
declare n bigint; base bigint;
begin
  select count(*) into base from public.historial_dossier where dossier_id = 'cccccccc-0000-0000-0000-000000000001';

  -- 1. La empresa valora: el trigger anota quién, sin el comentario.
  perform pg_temp.entrar('33333333-3333-3333-3333-333333333333');
  insert into public.valoraciones_mensuales (dossier_id, mes, valoracion, comentario, valorada_por)
  values ('cccccccc-0000-0000-0000-000000000001', '2026-10-01', 'negativa', 'TEXTO-PRIVADO', '33333333-3333-3333-3333-333333333333');
  perform pg_temp.salir();
  select count(*) into n from public.historial_dossier
  where dossier_id = 'cccccccc-0000-0000-0000-000000000001' and entidad = 'valoracion_mensual'
    and accion = 'crear' and actor_id = '33333333-3333-3333-3333-333333333333' and actor_rol = 'empresa'
    and detalle = '{"mes": "2026-10", "valoracion": "negativa"}';
  assert n = 1, 'la valoración no se ha anotado bien';
  assert not exists (select 1 from public.historial_dossier where detalle::text like '%TEXTO-PRIVADO%'), 'el comentario se ha colado';

  -- 2. Un segundo insert del mismo mes choca (lo que usa `crearMensual` para no pisar).
  perform pg_temp.entrar('33333333-3333-3333-3333-333333333333');
  begin
    insert into public.valoraciones_mensuales (dossier_id, mes, valoracion, valorada_por)
    values ('cccccccc-0000-0000-0000-000000000001', '2026-10-01', 'positiva', '33333333-3333-3333-3333-333333333333');
    raise exception 'FALLO: se ha podido pisar un mes';
  exception when unique_violation then null;
  end;
  perform pg_temp.salir();

  -- 3. Quién lee: los cinco del dossier sí; empresa y alumno ajenos no.
  perform pg_temp.entrar('11111111-1111-1111-1111-111111111111'); assert pg_temp.visibles() > base, 'alumno no ve'; perform pg_temp.salir();
  perform pg_temp.entrar('22222222-2222-2222-2222-222222222222'); assert pg_temp.visibles() > base, 'profe no ve'; perform pg_temp.salir();
  perform pg_temp.entrar('33333333-3333-3333-3333-333333333333'); assert pg_temp.visibles() > base, 'empresa no ve'; perform pg_temp.salir();
  perform pg_temp.entrar('44444444-4444-4444-4444-444444444444'); assert pg_temp.visibles() > base, 'instituto no ve'; perform pg_temp.salir();
  perform pg_temp.entrar('55555555-5555-5555-5555-555555555555'); assert pg_temp.visibles() > base, 'generalitat no ve'; perform pg_temp.salir();
  perform pg_temp.entrar('66666666-6666-6666-6666-666666666666'); assert pg_temp.visibles() = 0, 'otra empresa ve'; perform pg_temp.salir();
  perform pg_temp.entrar('77777777-7777-7777-7777-777777777777'); assert pg_temp.visibles() = 0, 'otro alumno ve'; perform pg_temp.salir();

  -- 4. Nadie escribe por la API, ni siquiera quien gestiona el dossier.
  perform pg_temp.entrar('22222222-2222-2222-2222-222222222222');
  begin
    insert into public.historial_dossier (dossier_id, entidad, accion) values ('cccccccc-0000-0000-0000-000000000001', 'dossier', 'crear');
    raise exception 'FALLO: insert permitido';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.historial_dossier set accion = 'borrar';
    raise exception 'FALLO: update permitido';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.historial_dossier;
    raise exception 'FALLO: delete permitido';
  exception when insufficient_privilege then null;
  end;
  perform pg_temp.salir();

  -- 5. Tampoco con privilegios de dueño.
  begin
    update public.historial_dossier set accion = 'borrar';
    raise exception 'FALLO: el dueño ha podido editar';
  exception when raise_exception then
    if sqlerrm like 'FALLO%' then raise; end if;
  end;
  begin
    truncate public.historial_dossier;
    raise exception 'FALLO: el dueño ha podido vaciar';
  exception when raise_exception then
    if sqlerrm like 'FALLO%' then raise; end if;
  end;

  -- 6. Borrar el dossier conserva el rastro, visible solo para la generalitat.
  delete from public.dossiers where id = 'cccccccc-0000-0000-0000-000000000001';
  select count(*) into n from public.historial_dossier
  where dossier_id = 'cccccccc-0000-0000-0000-000000000001' and entidad = 'dossier' and accion = 'borrar';
  assert n = 1, 'el borrado del dossier no se ha anotado';
  perform pg_temp.entrar('11111111-1111-1111-1111-111111111111'); assert pg_temp.visibles() = 0, 'alumno ve lo borrado'; perform pg_temp.salir();
  perform pg_temp.entrar('55555555-5555-5555-5555-555555555555'); assert pg_temp.visibles() > 0, 'generalitat pierde el rastro'; perform pg_temp.salir();

  raise notice 'TODO CORRECTO';
end $$;

rollback;

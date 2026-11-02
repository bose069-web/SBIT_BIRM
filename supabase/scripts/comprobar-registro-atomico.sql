-- Prueba LOCAL: se deshace al terminar y no choca con el seed. No modifica datos remotos.
-- Comprueba permisos, conflicto, reintento y rollback de horas e historial.
begin;
insert into public.centros(id,nombre,codigo) values ('7aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','Centro prueba','99999999');
insert into public.empresas(id,nombre) values ('7bbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','Empresa prueba');
insert into public.convenios(centro_id,empresa_id) values ('7aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','7bbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
insert into auth.users(id,email,raw_user_meta_data) values
 ('71111111-1111-1111-1111-111111111111','alumno-prueba@kampus.test','{"nombre":"Alumno"}'),
 ('72222222-2222-2222-2222-222222222222','profe-prueba@kampus.test','{"nombre":"Profe"}');
update public.perfiles set rol='profe',centro_id='7aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' where id='72222222-2222-2222-2222-222222222222';
update public.perfiles set centro_id='7aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',profe_id='72222222-2222-2222-2222-222222222222' where id='71111111-1111-1111-1111-111111111111';
insert into public.dossiers(id,alumno_id,centro_id,empresa_id,ciclo,fecha_inicio,fecha_fin,horas_totales) values
 ('7ccccccc-cccc-cccc-cccc-cccccccccccc','71111111-1111-1111-1111-111111111111','7aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','7bbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','DAM','2026-10-01','2026-12-31',400);
insert into public.actividades_formativas(id,dossier_id,descripcion,orden) values ('7ddddddd-dddd-dddd-dddd-dddddddddddd','7ccccccc-cccc-cccc-cccc-cccccccccccc','Desarrollo',1);

set local role authenticated;
select set_config('request.jwt.claim.sub', '71111111-1111-1111-1111-111111111111', true);
select set_config('request.jwt.claims', '{"sub":"71111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
do $$
declare
  respuesta jsonb;
  n bigint;
  base jsonb := '{"tipo":"trabajo","observaciones":"","horas":[["7ddddddd-dddd-dddd-dddd-dddddddddddd",4]]}';
  horas jsonb := '[{"actividadId":"7ddddddd-dddd-dddd-dddd-dddddddddddd","horas":4}]';
begin
  respuesta := public.guardar_registro_atomico('7ccccccc-cccc-cccc-cccc-cccccccccccc','2026-10-20','trabajo','',horas,null);
  assert respuesta->>'resultado' = 'guardado', 'No guarda';
  select count(*) into n from public.historial_dossier where entidad='registro';
  respuesta := public.guardar_registro_atomico('7ccccccc-cccc-cccc-cccc-cccccccccccc','2026-10-20','trabajo','',horas,null);
  assert (select count(*) from public.historial_dossier where entidad='registro') = n, 'Reintento duplica historial';
  respuesta := public.guardar_registro_atomico('7ccccccc-cccc-cccc-cccc-cccccccccccc','2026-10-20','trabajo','Otro',horas,null);
  assert respuesta->>'resultado' = 'conflicto', 'No detecta versión obsoleta';
  begin
    perform public.guardar_registro_atomico('7ccccccc-cccc-cccc-cccc-cccccccccccc','2026-10-20','trabajo','Cambio parcial','[{"actividadId":"eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee","horas":2}]',base);
    raise exception 'FALLO: aceptó actividad ajena';
  exception when foreign_key_violation then null;
  end;
  assert (select sum(h.horas) from public.horas_actividad h) = 4, 'Ha perdido horas tras fallo';
  assert (select observaciones is null from public.registros_diarios where fecha='2026-10-20'), 'Guardado parcial';
  assert (select count(*) from public.historial_dossier where entidad='registro') = n, 'Historial parcial';
  perform set_config('request.jwt.claim.sub','72222222-2222-2222-2222-222222222222',true);
  perform set_config('request.jwt.claims','{"sub":"72222222-2222-2222-2222-222222222222","role":"authenticated"}',true);
  begin
    perform public.guardar_registro_atomico('7ccccccc-cccc-cccc-cccc-cccccccccccc','2026-10-20','trabajo','Otro',horas,base);
    raise exception 'FALLO: aceptó usuario ajeno';
  exception when insufficient_privilege then null;
  end;
end $$;

rollback;

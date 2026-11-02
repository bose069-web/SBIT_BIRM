-- Una petición guarda el día y todas sus horas, o no guarda nada.
-- SECURITY INVOKER mantiene las políticas RLS del usuario autenticado.
create function public.guardar_registro_atomico(
  p_dossier uuid, p_fecha date, p_tipo public.tipo_dia,
  p_observaciones text, p_horas jsonb, p_base jsonb
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  r public.registros_diarios;
  actual jsonb;
  comparable jsonb;
  deseado jsonb;
  horas jsonb;
begin
  -- Incluye el caso de un día aún inexistente: SELECT FOR UPDATE no bastaría.
  perform pg_advisory_xact_lock(hashtextextended(p_dossier::text || '/' || p_fecha::text, 0));
  if not public.es_alumno_de(p_dossier) then
    raise exception 'No tienes permiso para registrar este día' using errcode = '42501';
  end if;
  if public.mes_cerrado(p_dossier, p_fecha) then
    raise exception 'Este mes ya está valorado y no se puede cambiar';
  end if;
  if not exists (select 1 from public.dossiers d where d.id = p_dossier
    and p_fecha between d.fecha_inicio and d.fecha_fin) then
    raise exception 'Fecha fuera del periodo';
  end if;
  if jsonb_typeof(p_horas) <> 'array' or p_horas is null then
    raise exception 'Horas no válidas';
  end if;
  if exists (select 1 from jsonb_array_elements(p_horas) h
    where (h->>'horas')::numeric <= 0 or (h->>'horas')::numeric * 4 <> trunc((h->>'horas')::numeric * 4)
      or h->>'horas' is null or h->>'actividadId' is null)
    or (select coalesce(sum((h->>'horas')::numeric), 0) from jsonb_array_elements(p_horas) h) > 12
    or (p_tipo <> 'trabajo' and jsonb_array_length(p_horas) <> 0)
    or (p_tipo = 'trabajo' and jsonb_array_length(p_horas) = 0) then
    raise exception 'Horas no válidas';
  end if;
  select * into r from public.registros_diarios where dossier_id = p_dossier and fecha = p_fecha for update;
  if found then
    select coalesce(jsonb_agg(jsonb_build_object('actividad_id', actividad_id, 'horas', h.horas) order by actividad_id), '[]')
      into horas from public.horas_actividad h where registro_id = r.id;
    actual := to_jsonb(r) || jsonb_build_object('horas_actividad', horas);
    select jsonb_build_object('tipo', r.tipo, 'observaciones', btrim(coalesce(r.observaciones, '')),
      'horas', coalesce(jsonb_agg(jsonb_build_array(actividad_id, h.horas) order by actividad_id), '[]'))
      into comparable from public.horas_actividad h where registro_id = r.id;
  end if;
  select jsonb_build_object('tipo', p_tipo, 'observaciones', btrim(coalesce(p_observaciones, '')),
    'horas', coalesce(jsonb_agg(jsonb_build_array(h->>'actividadId', (h->>'horas')::numeric) order by h->>'actividadId'), '[]'))
    into deseado from jsonb_array_elements(p_horas) h;
  -- Reintento tras perder una respuesta: no repite escrituras ni entradas de historial.
  if comparable = deseado then
    return jsonb_build_object('resultado', 'guardado', 'registro', actual);
  end if;
  if comparable is distinct from nullif(p_base, 'null'::jsonb) then
    return jsonb_build_object('resultado', 'conflicto', 'servidor', actual);
  end if;
  insert into public.registros_diarios (dossier_id, fecha, tipo, observaciones)
    values (p_dossier, p_fecha, p_tipo, nullif(btrim(p_observaciones), ''))
    on conflict (dossier_id, fecha) do update set tipo = excluded.tipo, observaciones = excluded.observaciones
    returning * into r;
  delete from public.horas_actividad where registro_id = r.id;
  insert into public.horas_actividad (registro_id, dossier_id, actividad_id, horas)
    select r.id, p_dossier, (h->>'actividadId')::uuid, (h->>'horas')::numeric
    from jsonb_array_elements(p_horas) h;
  select coalesce(jsonb_agg(jsonb_build_object('actividad_id', actividad_id, 'horas', h.horas) order by actividad_id), '[]')
    into horas from public.horas_actividad h where registro_id = r.id;
  return jsonb_build_object('resultado', 'guardado', 'registro', to_jsonb(r) || jsonb_build_object('horas_actividad', horas));
end $$;
revoke all on function public.guardar_registro_atomico(uuid, date, public.tipo_dia, text, jsonb, jsonb) from public, anon;
grant execute on function public.guardar_registro_atomico(uuid, date, public.tipo_dia, text, jsonb, jsonb) to authenticated;

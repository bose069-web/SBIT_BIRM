-- El profe tutor corrige las horas de sus alumnos desde Seguimiento.
-- Un mes confirmado por el tutor, o con valoración final, queda bloqueado para todos: para
-- corregirlo, el tutor retira antes su confirmación. Un mes valorado por la empresa y sin confirmar
-- sí lo puede corregir el tutor. Al alumno se le sigue cerrando el mes en cuanto se valora.

create or replace function public.guardar_registro_atomico(
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
  if public.es_alumno_de(p_dossier) then
    if public.mes_cerrado(p_dossier, p_fecha) then
      raise exception 'Este mes ya está valorado y no se puede cambiar';
    end if;
  elsif not exists (select 1 from public.dossiers d
    where d.id = p_dossier and d.tutor_id = (select auth.uid())) then
    raise exception 'No tienes permiso para registrar este día' using errcode = '42501';
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

create function public.mes_bloqueado(d uuid, f date) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.valoraciones_finales v where v.dossier_id = d)
    or exists (
      select 1 from public.valoraciones_mensuales v
      where v.dossier_id = d and v.confirmada_en is not null
        and v.mes = date_trunc('month', f)::date
    )
$$;
revoke execute on function public.mes_bloqueado(uuid, date) from public, anon;
grant execute on function public.mes_bloqueado(uuid, date) to authenticated;

create function public.proteger_dia_bloqueado() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  fila public.registros_diarios := coalesce(new, old);
begin
  -- Sin usuario (sistema) o en cascada (al borrar el dossier): se deja.
  if (select auth.uid()) is null or pg_trigger_depth() > 1 then
    return coalesce(new, old);
  end if;
  if public.mes_bloqueado(fila.dossier_id, fila.fecha)
     or (tg_op = 'UPDATE' and public.mes_bloqueado(old.dossier_id, old.fecha)) then
    raise exception 'Este mes ya está confirmado: quita antes la confirmación';
  end if;
  return coalesce(new, old);
end $$;
create trigger proteger_dia_bloqueado before insert or update or delete
on public.registros_diarios for each row execute function public.proteger_dia_bloqueado();

create function public.proteger_horas_bloqueadas() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  fila_registro uuid := case when tg_op = 'DELETE' then old.registro_id else new.registro_id end;
  dia public.registros_diarios;
begin
  if (select auth.uid()) is null or pg_trigger_depth() > 1 then
    return coalesce(new, old);
  end if;
  select * into dia from public.registros_diarios where id = fila_registro;
  if found and public.mes_bloqueado(dia.dossier_id, dia.fecha) then
    raise exception 'Este mes ya está confirmado: quita antes la confirmación';
  end if;
  return coalesce(new, old);
end $$;
create trigger proteger_horas_bloqueadas before insert or update or delete
on public.horas_actividad for each row execute function public.proteger_horas_bloqueadas();

revoke execute on function public.proteger_dia_bloqueado() from public, anon, authenticated;
revoke execute on function public.proteger_horas_bloqueadas() from public, anon, authenticated;

-- El toque se resuelve cuando apunta el alumno, no cuando le corrige el tutor.
create or replace function public.resolver_toques() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null and not public.es_alumno_de(new.dossier_id) then
    return null;
  end if;
  update public.toques set resuelto_en = now()
  where dossier_id = new.dossier_id and resuelto_en is null;
  return null;
end $$;

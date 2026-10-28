-- Crear y editar un dossier con sus actividades en una sola operación.
-- security invoker: se aplican las políticas RLS y el trigger comprobar_roles_dossier de
-- siempre; esta función solo evita que el dossier se quede a medias (sin actividades) y
-- protege las actividades que ya tienen horas registradas.
--
-- datos = {
--   id (null = nuevo), alumno_id, centro_id, empresa_id, tutor_empresa_id, ciclo,
--   fecha_inicio, fecha_fin, horas_totales,
--   actividades: [{ id (null = nueva), descripcion }]   -- en el orden en que se muestran
-- }
create function public.guardar_dossier(datos jsonb) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  el_dossier uuid := nullif(datos ->> 'id', '')::uuid;
  actividad jsonb;
  actividad_id uuid;
  conservadas uuid[] := '{}';
  posicion int := 0;
begin
  if jsonb_array_length(coalesce(datos -> 'actividades', '[]'::jsonb)) = 0 then
    raise exception 'El dossier necesita al menos una actividad formativa';
  end if;

  if el_dossier is null then
    insert into public.dossiers (
      alumno_id, centro_id, empresa_id, tutor_empresa_id, ciclo, fecha_inicio, fecha_fin,
      horas_totales
    ) values (
      (datos ->> 'alumno_id')::uuid,
      (datos ->> 'centro_id')::uuid,
      (datos ->> 'empresa_id')::uuid,
      nullif(datos ->> 'tutor_empresa_id', '')::uuid,
      datos ->> 'ciclo',
      (datos ->> 'fecha_inicio')::date,
      (datos ->> 'fecha_fin')::date,
      (datos ->> 'horas_totales')::int
    )
    returning id into el_dossier;
  else
    -- El alumno y el centro de un dossier no cambian.
    update public.dossiers set
      empresa_id = (datos ->> 'empresa_id')::uuid,
      tutor_empresa_id = nullif(datos ->> 'tutor_empresa_id', '')::uuid,
      ciclo = datos ->> 'ciclo',
      fecha_inicio = (datos ->> 'fecha_inicio')::date,
      fecha_fin = (datos ->> 'fecha_fin')::date,
      horas_totales = (datos ->> 'horas_totales')::int
    where id = el_dossier;
    if not found then
      raise exception 'El dossier no existe o no tienes permiso para editarlo';
    end if;
  end if;

  for actividad in select value from jsonb_array_elements(datos -> 'actividades') loop
    posicion := posicion + 1;
    actividad_id := nullif(actividad ->> 'id', '')::uuid;
    if actividad_id is null then
      insert into public.actividades_formativas (dossier_id, descripcion, orden)
      values (el_dossier, actividad ->> 'descripcion', posicion)
      returning id into actividad_id;
    else
      update public.actividades_formativas
      set descripcion = actividad ->> 'descripcion', orden = posicion
      where id = actividad_id and actividades_formativas.dossier_id = el_dossier;
      if not found then
        raise exception 'La actividad % no es de este dossier', actividad_id;
      end if;
    end if;
    conservadas := conservadas || actividad_id;
  end loop;

  if exists (
    select 1
    from public.horas_actividad h
    join public.actividades_formativas a on a.id = h.actividad_id
    where a.dossier_id = el_dossier and a.id <> all (conservadas)
  ) then
    raise exception 'No se puede quitar una actividad que ya tiene horas registradas';
  end if;

  delete from public.actividades_formativas
  where actividades_formativas.dossier_id = el_dossier
    and id <> all (conservadas);

  return el_dossier;
end $$;

revoke execute on function public.guardar_dossier(jsonb) from public, anon;
grant execute on function public.guardar_dossier(jsonb) to authenticated;

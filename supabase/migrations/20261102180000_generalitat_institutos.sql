-- La Generalitat gestiona los institutos de la red: los da de alta (ya podía), los edita, los da
-- de baja y los reactiva, y ve las cifras de cada uno en una sola consulta.
--
-- Un instituto no se borra: si tiene dossiers la base no lo deja, y si no, se llevaría sus
-- convenios y clases. Se da de baja: queda en la lista, en solo lectura para crear dossiers
-- nuevos, con todo su historial.

alter table public.centros
  add column dado_de_baja_en timestamptz,
  add column motivo_baja text check (motivo_baja is null or char_length(btrim(motivo_baja)) between 1 and 300),
  add constraint baja_con_motivo check ((dado_de_baja_en is null) = (motivo_baja is null));

-- Solo la generalitat da de baja o reactiva. El instituto sigue pudiendo editar su centro (la
-- política "cambiar centros"), pero no su estado.
create function public.proteger_baja_centro() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or public.es_generalitat() then
    if new.dado_de_baja_en is not null and old.dado_de_baja_en is null then
      new.dado_de_baja_en := now();
    end if;
    return new;
  end if;
  if (new.dado_de_baja_en, new.motivo_baja) is distinct from (old.dado_de_baja_en, old.motivo_baja) then
    raise exception 'Solo la generalitat da de baja o reactiva un instituto';
  end if;
  return new;
end $$;

create trigger proteger_baja_centro before update on public.centros
for each row execute function public.proteger_baja_centro();

-- En un instituto de baja no se crean dossiers nuevos (los que tiene siguen como estaban).
create function public.dossier_en_centro_activo() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (
    select 1 from public.centros c where c.id = new.centro_id and c.dado_de_baja_en is not null
  ) then
    raise exception 'Este instituto está de baja: no se pueden crear dossiers nuevos';
  end if;
  return new;
end $$;

create trigger dossier_en_centro_activo before insert on public.dossiers
for each row execute function public.dossier_en_centro_activo();

revoke execute on function public.proteger_baja_centro() from public, anon, authenticated;
revoke execute on function public.dossier_en_centro_activo() from public, anon, authenticated;

-- Cifras de cada instituto para el panel de la generalitat, en una sola llamada
-- (`rpc('cifras_centros')`). A cualquier otro rol le devuelve una lista vacía.
create function public.cifras_centros()
returns table (
  centro_id uuid,
  alumnos int,
  profes int,
  dossiers_activos int,
  empresas_convenio int,
  horas_hechas numeric,
  horas_previstas int
)
language sql stable security definer set search_path = '' as $$
  select
    c.id,
    (select count(*)::int from public.perfiles p where p.centro_id = c.id and p.rol = 'alumno'),
    (select count(*)::int from public.perfiles p where p.centro_id = c.id and p.rol = 'profe'),
    (select count(*)::int from public.dossiers d
       where d.centro_id = c.id and current_date between d.fecha_inicio and d.fecha_fin),
    (select count(*)::int from public.convenios v where v.centro_id = c.id),
    coalesce((select sum(h.horas) from public.horas_actividad h
       join public.dossiers d on d.id = h.dossier_id where d.centro_id = c.id), 0),
    coalesce((select sum(d.horas_totales)::int from public.dossiers d where d.centro_id = c.id), 0)
  from public.centros c
  where public.es_generalitat()
$$;

revoke execute on function public.cifras_centros() from public, anon;
grant execute on function public.cifras_centros() to authenticated;

-- Incidencias: cualquiera avisa de un problema (con las prácticas, la empresa, la app...).
-- Las atiende el instituto de su centro; si el problema le supera, la escala a la
-- generalitat, que ve y gestiona todas (es el superadmin: problemas a gran escala).

create type public.categoria_incidencia as enum ('practicas', 'empresa', 'convenio', 'app', 'otra');
create type public.prioridad_incidencia as enum ('baja', 'media', 'alta');
create type public.estado_incidencia as enum ('abierta', 'en_curso', 'resuelta');

create table public.incidencias (
  id uuid primary key default gen_random_uuid(),
  -- Centro que la atiende: lo pone el trigger (el del dossier o el de quien la abre).
  -- null = sin centro (empresa o generalitat sin dossier): la atiende la generalitat.
  centro_id uuid references public.centros (id) on delete set null,
  dossier_id uuid references public.dossiers (id) on delete set null,
  creada_por uuid not null default auth.uid() references public.perfiles (id) on delete cascade,
  titulo text not null check (length(trim(titulo)) between 1 and 120),
  descripcion text not null check (length(trim(descripcion)) between 1 and 4000),
  categoria public.categoria_incidencia not null default 'otra',
  prioridad public.prioridad_incidencia not null default 'media',
  estado public.estado_incidencia not null default 'abierta',
  escalada boolean not null default false,
  respuesta text,
  atendida_por uuid references public.perfiles (id) on delete set null,
  creada_en timestamptz not null default now(),
  actualizada_en timestamptz not null default now(),
  resuelta_en timestamptz
);
create index on public.incidencias (centro_id);
create index on public.incidencias (dossier_id);
create index on public.incidencias (creada_por);
create index on public.incidencias (atendida_por);
create index on public.incidencias (estado);

-- Quién la atiende: la generalitat siempre; el instituto de su centro.
create function public.atiende_incidencia(i public.incidencias) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.es_generalitat() or public.administra_centro(i.centro_id)
$$;

-- Al crear: centro por el dossier o por quien la abre; nadie se salta el flujo.
create function public.preparar_incidencia() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.dossier_id is not null then
    if not public.puede_ver_dossier(new.dossier_id) then
      raise exception 'No puedes abrir una incidencia sobre ese dossier';
    end if;
    select centro_id into new.centro_id from public.dossiers where id = new.dossier_id;
  else
    new.centro_id := public.centro_actual();
  end if;
  new.creada_por := auth.uid();
  new.estado := 'abierta';
  new.escalada := false;
  new.respuesta := null;
  new.atendida_por := null;
  new.resuelta_en := null;
  new.creada_en := now();
  new.actualizada_en := now();
  return new;
end $$;

create trigger preparar_incidencia before insert on public.incidencias
for each row execute function public.preparar_incidencia();

-- Al cambiarla: quien la abrió solo puede editar título y descripción mientras esté abierta;
-- quien la atiende cambia estado, prioridad, respuesta y escalado. Datos de origen fijos.
create function public.proteger_incidencia() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (new.id, new.centro_id, new.dossier_id, new.creada_por, new.creada_en)
     is distinct from (old.id, old.centro_id, old.dossier_id, old.creada_por, old.creada_en) then
    raise exception 'No se puede cambiar el origen de una incidencia';
  end if;

  if public.atiende_incidencia(old) then
    -- Solo el instituto escala; la generalitat ya es el último nivel.
    if new.escalada and not old.escalada and public.es_generalitat() then
      raise exception 'La generalitat no puede escalar una incidencia';
    end if;
    if new.estado is distinct from old.estado
       or new.respuesta is distinct from old.respuesta
       or new.prioridad is distinct from old.prioridad then
      new.atendida_por := auth.uid();
    end if;
    new.resuelta_en := case when new.estado = 'resuelta' then coalesce(old.resuelta_en, now()) end;
  else
    if old.creada_por is distinct from auth.uid() or old.estado <> 'abierta' then
      raise exception 'No puedes cambiar esta incidencia';
    end if;
    if (new.categoria, new.prioridad, new.estado, new.escalada, new.respuesta, new.atendida_por,
        new.resuelta_en)
       is distinct from (old.categoria, old.prioridad, old.estado, old.escalada, old.respuesta,
        old.atendida_por, old.resuelta_en) then
      raise exception 'Solo puedes corregir el título y la descripción';
    end if;
  end if;
  new.actualizada_en := now();
  return new;
end $$;

create trigger proteger_incidencia before update on public.incidencias
for each row execute function public.proteger_incidencia();

revoke execute on function public.preparar_incidencia() from authenticated;
revoke execute on function public.proteger_incidencia() from authenticated;
revoke execute on function public.atiende_incidencia(public.incidencias) from public, anon;
grant execute on function public.atiende_incidencia(public.incidencias) to authenticated;

alter table public.incidencias enable row level security;

-- Ven una incidencia quien la abrió y quien la atiende.
create policy "ver incidencias" on public.incidencias for select to authenticated
  using (creada_por = (select auth.uid()) or public.atiende_incidencia(incidencias));
create policy "abrir incidencias" on public.incidencias for insert to authenticated
  with check (true);
create policy "cambiar incidencias" on public.incidencias for update to authenticated
  using (creada_por = (select auth.uid()) or public.atiende_incidencia(incidencias))
  with check (creada_por = (select auth.uid()) or public.atiende_incidencia(incidencias));
-- Borrar solo la generalitat (para spam o duplicados); el resto las resuelve.
create policy "generalitat borra incidencias" on public.incidencias for delete to authenticated
  using (public.es_generalitat());

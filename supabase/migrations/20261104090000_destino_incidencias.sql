-- A quién le llega una incidencia lo decide SOBRE QUÉ va, no quien la abre.
--
--   prácticas, convenio, otra -> profe tutor del dossier
--   empresa                   -> la empresa la ve y responde; la gestiona el profe tutor
--   app                       -> generalitat (es su web)
--
-- Si el destinatario no existe (una incidencia sin dossier no tiene profe tutor) cae en el
-- instituto del centro, y sin centro en la generalitat.
--
-- Escalar deja de ser un sí/no "escalada a la generalitat" y pasa a ser un nivel que solo sube:
-- destinatario -> instituto -> generalitat. Quien la lleva en cada momento es quien la escala.

create type public.nivel_incidencia as enum ('destinatario', 'instituto', 'generalitat');

alter table public.incidencias
  add column nivel public.nivel_incidencia not null default 'destinatario';

-- Lo que estaba escalado ya lo llevaba la generalitat.
update public.incidencias set nivel = 'generalitat' where escalada;
alter table public.incidencias drop column escalada;

create index on public.incidencias (nivel);

-- Quién la gestiona: cambia estado, prioridad, respuesta y nivel, y la cierra.
create or replace function public.atiende_incidencia(i public.incidencias) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.es_generalitat() or case
    when i.nivel = 'generalitat' then false
    when i.nivel = 'instituto' then public.administra_centro(i.centro_id)
    -- Nivel inicial: manda la categoría. Lo de la app es cosa de la generalitat.
    when i.categoria = 'app' then false
    -- El resto lo lleva el profe tutor del dossier; si no hay, el instituto del centro.
    when exists (
      select 1 from public.dossiers d where d.id = i.dossier_id and d.tutor_id is not null
    ) then exists (
      select 1 from public.dossiers d
      where d.id = i.dossier_id and d.tutor_id = (select auth.uid())
    )
    else public.administra_centro(i.centro_id)
  end
$$;

-- La empresa del dossier ve y responde lo que va sobre ella, pero no la cierra ni la escala.
create function public.responde_empresa_incidencia(i public.incidencias) returns boolean
language sql stable security definer set search_path = '' as $$
  select i.categoria = 'empresa' and exists (
    select 1 from public.dossiers d
    where d.id = i.dossier_id and d.tutor_empresa_id = (select auth.uid())
  )
$$;

-- La siguen sin gestionarla: el profe tutor todo lo de sus alumnos, la empresa lo que va sobre
-- ella y el instituto todo lo de su centro. Importa para que, al escalarla, quien la llevaba la
-- siga viendo en vez de perderla de vista en el mismo update que la escala.
create function public.sigue_incidencia(i public.incidencias) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.responde_empresa_incidencia(i)
    or public.administra_centro(i.centro_id)
    or exists (
      select 1 from public.dossiers d
      where d.id = i.dossier_id and d.tutor_id = (select auth.uid())
    )
$$;

-- Participan: quien la abrió, quien la gestiona y quien la sigue.
create or replace function public.participa_incidencia(i public.incidencias) returns boolean
language sql stable security definer set search_path = '' as $$
  select i.creada_por = (select auth.uid())
    or public.atiende_incidencia(i)
    or public.sigue_incidencia(i)
$$;

-- Al crear, siempre empieza en su destinatario.
create or replace function public.preparar_incidencia() returns trigger
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
  new.nivel := 'destinatario';
  new.respuesta := null;
  new.atendida_por := null;
  new.resuelta_en := null;
  new.creada_en := now();
  new.actualizada_en := now();
  return new;
end $$;

-- Igual que antes, pero con el nivel: solo sube, y solo lo sube quien la lleva ahora mismo.
create or replace function public.proteger_incidencia() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (new.id, new.centro_id, new.dossier_id, new.creada_por, new.creada_en)
     is distinct from (old.id, old.centro_id, old.dossier_id, old.creada_por, old.creada_en) then
    raise exception 'No se puede cambiar el origen de una incidencia';
  end if;
  -- Un mensaje nuevo solo toca actualizada_en: eso lo puede provocar cualquier participante.
  if (new.titulo, new.descripcion, new.categoria, new.prioridad, new.estado, new.nivel,
      new.respuesta, new.atendida_por, new.resuelta_en)
     is not distinct from (old.titulo, old.descripcion, old.categoria, old.prioridad, old.estado,
      old.nivel, old.respuesta, old.atendida_por, old.resuelta_en) then
    return new;
  end if;

  if public.atiende_incidencia(old) then
    -- Los enums se comparan en el orden en que están declarados: una incidencia nunca baja.
    if new.nivel < old.nivel then
      raise exception 'Una incidencia solo sube de nivel';
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
    if (new.categoria, new.prioridad, new.estado, new.nivel, new.respuesta, new.atendida_por,
        new.resuelta_en)
       is distinct from (old.categoria, old.prioridad, old.estado, old.nivel, old.respuesta,
        old.atendida_por, old.resuelta_en) then
      raise exception 'Solo puedes corregir el título y la descripción';
    end if;
  end if;
  new.actualizada_en := now();
  return new;
end $$;

revoke execute on function public.responde_empresa_incidencia(public.incidencias) from public, anon;
grant execute on function public.responde_empresa_incidencia(public.incidencias) to authenticated;
revoke execute on function public.sigue_incidencia(public.incidencias) from public, anon;
grant execute on function public.sigue_incidencia(public.incidencias) to authenticated;

-- Quién puede tocarla lo decide la fila ANTES del cambio (using); qué puede cambiar de ella lo
-- decide el trigger proteger_incidencia. El with check de antes miraba la fila YA cambiada, así
-- que al escalar una incidencia el propio update se rechazaba: quien la escalaba dejaba de
-- gestionarla en la fila nueva.
drop policy "cambiar incidencias" on public.incidencias;
create policy "cambiar incidencias" on public.incidencias for update to authenticated
  using (creada_por = (select auth.uid()) or public.atiende_incidencia(incidencias))
  with check (true);

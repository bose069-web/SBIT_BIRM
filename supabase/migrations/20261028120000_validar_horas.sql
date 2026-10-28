-- Validación de cada día de prácticas en dos pasos: primero el tutor de empresa del dossier
-- y después el profe tutor. Un día validado ya no se puede editar ni borrar, ni sus horas.
--
-- Para validar, la app pone validado_empresa_en (o validado_profe_en) a cualquier valor no
-- nulo; el trigger pone la hora real y quién lo ha hecho. Ponerlo a null quita la validación.

alter table public.registros_diarios
  add column validado_empresa_por uuid references public.perfiles(id) on delete set null,
  add column validado_empresa_en timestamptz,
  add column validado_profe_por uuid references public.perfiles(id) on delete set null,
  add column validado_profe_en timestamptz,
  add constraint profe_valida_despues_de_empresa
    check (validado_profe_en is null or validado_empresa_en is not null);

create index registros_diarios_validado_empresa_por_idx on public.registros_diarios (validado_empresa_por);
create index registros_diarios_validado_profe_por_idx on public.registros_diarios (validado_profe_por);

-- El tutor de empresa necesita poder hacer update para validar; el trigger le limita a eso.
create policy "empresa valida registros" on public.registros_diarios for update to authenticated
  using (public.es_empresa_de(dossier_id)) with check (public.es_empresa_de(dossier_id));

create function public.validar_registro() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  yo uuid := (select auth.uid());
  dossier public.dossiers;
  cambia_datos boolean;
  cambia_empresa boolean;
  cambia_profe boolean;
begin
  -- Sin usuario: lo hace el sistema (migraciones, seed).
  if yo is null then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    -- Si se borra el dossier entero (cascada), el dossier ya no existe y se deja borrar.
    if old.validado_empresa_en is not null
       and exists (select 1 from public.dossiers where id = old.dossier_id) then
      raise exception 'No se puede borrar un día ya validado';
    end if;
    return old;
  end if;

  select * into dossier from public.dossiers where id = old.dossier_id;
  cambia_datos := (new.id, new.dossier_id, new.fecha, new.tipo, new.observaciones, new.creado_en)
    is distinct from (old.id, old.dossier_id, old.fecha, old.tipo, old.observaciones, old.creado_en);
  cambia_empresa := (new.validado_empresa_en is null) <> (old.validado_empresa_en is null)
    or new.validado_empresa_por is distinct from old.validado_empresa_por;
  cambia_profe := (new.validado_profe_en is null) <> (old.validado_profe_en is null)
    or new.validado_profe_por is distinct from old.validado_profe_por;

  if cambia_datos then
    if old.validado_empresa_en is not null then
      raise exception 'No se puede editar un día ya validado';
    end if;
    if public.es_empresa_de(old.dossier_id) and not public.gestiona_dossier(old.dossier_id) then
      raise exception 'El tutor de empresa solo puede validar el día';
    end if;
  end if;

  if cambia_empresa then
    if dossier.tutor_empresa_id is distinct from yo then
      raise exception 'Solo el tutor de empresa del dossier valida como empresa';
    end if;
    if old.validado_profe_en is not null then
      raise exception 'El profe ya ha validado este día: primero tiene que quitar su validación';
    end if;
    if new.validado_empresa_en is null then
      new.validado_empresa_por := null;
    else
      new.validado_empresa_por := yo;
      new.validado_empresa_en := now();
    end if;
  else
    new.validado_empresa_por := old.validado_empresa_por;
    new.validado_empresa_en := old.validado_empresa_en;
  end if;

  if cambia_profe then
    if dossier.tutor_id is distinct from yo then
      raise exception 'Solo el profe tutor del dossier valida como profe';
    end if;
    if new.validado_profe_en is not null and new.validado_empresa_en is null then
      raise exception 'El tutor de empresa tiene que validar el día antes que el profe';
    end if;
    if new.validado_profe_en is null then
      new.validado_profe_por := null;
    else
      new.validado_profe_por := yo;
      new.validado_profe_en := now();
    end if;
  else
    new.validado_profe_por := old.validado_profe_por;
    new.validado_profe_en := old.validado_profe_en;
  end if;

  return new;
end $$;

create trigger validar_registro before update or delete on public.registros_diarios
for each row execute function public.validar_registro();

-- Un día nuevo nace sin validar.
create function public.registro_sin_validar() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null then
    new.validado_empresa_por := null;
    new.validado_empresa_en := null;
    new.validado_profe_por := null;
    new.validado_profe_en := null;
  end if;
  return new;
end $$;

create trigger registro_sin_validar before insert on public.registros_diarios
for each row execute function public.registro_sin_validar();

-- Las horas de un día validado tampoco se tocan.
create function public.proteger_horas_validadas() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null and exists (
    select 1 from public.registros_diarios r
    where r.id in (old.registro_id, new.registro_id) and r.validado_empresa_en is not null
  ) and exists (select 1 from public.dossiers d where d.id = coalesce(new.dossier_id, old.dossier_id))
  then
    raise exception 'No se pueden cambiar las horas de un día ya validado';
  end if;
  return coalesce(new, old);
end $$;

create trigger proteger_horas_validadas before insert or update or delete on public.horas_actividad
for each row execute function public.proteger_horas_validadas();

revoke execute on function public.validar_registro() from authenticated;
revoke execute on function public.registro_sin_validar() from authenticated;
revoke execute on function public.proteger_horas_validadas() from authenticated;

-- Doble validación mensual de las horas (ver "Cuentas, datos y validación" en el vault):
--   1. el alumno apunta sus días;
--   2. al acabar el mes, la empresa lo valida (la valoración mensual que ya existe; desde ese
--      momento el alumno no puede tocar las horas de ese mes, ver mes_cerrado);
--   3. el profe tutor confirma el mes.
-- Este archivo añade el paso 3. Un mes confirmado por el profe ya no lo cambia ni borra la
-- empresa: si hay un error, el profe quita su confirmación y se lo comunica.

alter table public.valoraciones_mensuales
  add column confirmada_por uuid references public.perfiles (id) on delete set null,
  add column confirmada_en timestamptz,
  add constraint confirmacion_completa
    check ((confirmada_por is null) = (confirmada_en is null));

create index valoraciones_mensuales_confirmada_por_idx
  on public.valoraciones_mensuales (confirmada_por);

-- Para listar rápido lo que tiene pendiente de confirmar cada profe.
create index valoraciones_mensuales_sin_confirmar_idx
  on public.valoraciones_mensuales (dossier_id) where confirmada_en is null;

create function public.confirmar_mes() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  yo uuid := (select auth.uid());
  tutor uuid;
  cambia_valoracion boolean;
  cambia_confirmacion boolean;
begin
  -- Sin usuario: lo hace el sistema (migraciones, seed).
  if yo is null then
    return coalesce(new, old);
  end if;

  -- Un mes nace siempre sin confirmar.
  if tg_op = 'INSERT' then
    new.confirmada_por := null;
    new.confirmada_en := null;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.confirmada_en is not null and not public.gestiona_dossier(old.dossier_id) then
      raise exception 'El profe ya ha confirmado este mes: no se puede borrar';
    end if;
    return old;
  end if;

  select d.tutor_id into tutor from public.dossiers d where d.id = old.dossier_id;
  cambia_valoracion := (new.id, new.dossier_id, new.mes, new.valoracion, new.comentario,
      new.valorada_por, new.valorada_en)
    is distinct from (old.id, old.dossier_id, old.mes, old.valoracion, old.comentario,
      old.valorada_por, old.valorada_en);
  cambia_confirmacion := (new.confirmada_en is null) <> (old.confirmada_en is null)
    or new.confirmada_por is distinct from old.confirmada_por;

  -- La empresa no toca un mes que el profe ya ha confirmado.
  if cambia_valoracion and old.confirmada_en is not null
     and not public.gestiona_dossier(old.dossier_id) then
    raise exception 'El profe ya ha confirmado este mes: no se puede cambiar';
  end if;

  -- Quien no valoró el mes (el profe al confirmar) no reescribe la valoración de la empresa.
  if cambia_valoracion and old.valorada_por is distinct from yo
     and new.valorada_por is distinct from yo then
    raise exception 'Solo quien valoró el mes puede cambiar su valoración';
  end if;

  if cambia_confirmacion then
    if tutor is distinct from yo then
      raise exception 'Solo el profe tutor del dossier confirma el mes';
    end if;
    if new.confirmada_en is null then
      new.confirmada_por := null;
    else
      new.confirmada_por := yo;
      new.confirmada_en := now();
    end if;
  else
    new.confirmada_por := old.confirmada_por;
    new.confirmada_en := old.confirmada_en;
  end if;
  return new;
end $$;

create trigger confirmar_mes before insert or update or delete on public.valoraciones_mensuales
for each row execute function public.confirmar_mes();

revoke execute on function public.confirmar_mes() from public, anon, authenticated;

-- La política "tutor valora el mes" exige valorada_por = el propio usuario, así que el profe no
-- podría tocar un mes que valoró la empresa. Esta le deja hacer update para confirmarlo; el
-- trigger se asegura de que solo cambie la confirmación (o lo que ya podía cambiar).
create policy "profe confirma el mes" on public.valoraciones_mensuales for update to authenticated
  using (exists (
    select 1 from public.dossiers d where d.id = dossier_id and d.tutor_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.dossiers d where d.id = dossier_id and d.tutor_id = (select auth.uid())
  ));

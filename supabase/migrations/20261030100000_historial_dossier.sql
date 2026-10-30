-- Historial de cada dossier: quién hizo qué y cuándo. Lo escriben solo los triggers de la base de
-- datos, nunca la app, y es de solo añadir. No se rellena con lo anterior: empieza vacío.
--
-- Sin claves foráneas a propósito: el rastro debe sobrevivir a que se borre el dossier o la cuenta.
-- Tras borrar un dossier, sus filas solo las ve la generalitat (ver `puede_ver_dossier`).
-- El detalle guarda lo mínimo para entender el cambio: ni observaciones ni comentarios.

create table public.historial_dossier (
  id bigint generated always as identity primary key,
  dossier_id uuid not null,
  entidad text not null check (entidad in ('dossier', 'registro', 'valoracion_mensual', 'valoracion_final')),
  accion text not null check (accion in ('crear', 'editar', 'borrar')),
  -- Null si no hay sesión: lo ha hecho el sistema (seed, scripts de administración).
  actor_id uuid,
  -- Texto y no el enum `rol`, que ya se ha recreado otras veces: es una foto de ese momento.
  actor_rol text,
  detalle jsonb not null default '{}',
  ocurrido_en timestamptz not null default now()
);

create index historial_dossier_dossier_idx on public.historial_dossier (dossier_id, ocurrido_en desc);

alter table public.historial_dossier enable row level security;

-- Solo lectura por la API, y solo de los dossiers que ya se pueden ver.
revoke all on public.historial_dossier from anon, authenticated, service_role;
grant select on public.historial_dossier to authenticated, service_role;
create policy "ver historial del dossier" on public.historial_dossier for select to authenticated
  using (public.puede_ver_dossier(dossier_id));

-- Tampoco se puede alterar con otros privilegios sin quitar antes estos triggers.
create function public.historial_solo_anadir() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'El historial no se puede modificar ni borrar';
end $$;

create trigger historial_sin_cambios before update or delete on public.historial_dossier
for each row execute function public.historial_solo_anadir();
create trigger historial_sin_vaciar before truncate on public.historial_dossier
for each statement execute function public.historial_solo_anadir();

create function public.anotar_historial() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  fila jsonb := case tg_op when 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  entidad text;
  detalle jsonb := '{}';
begin
  case tg_table_name
    when 'dossiers' then
      entidad := 'dossier';
    when 'registros_diarios' then
      entidad := 'registro';
      detalle := jsonb_build_object('fecha', fila->>'fecha');
    when 'valoraciones_mensuales' then
      entidad := 'valoracion_mensual';
      detalle := jsonb_build_object('mes', left(fila->>'mes', 7), 'valoracion', fila->>'valoracion');
    when 'valoraciones_finales' then
      entidad := 'valoracion_final';
      detalle := jsonb_build_object('resultado', fila->>'resultado');
  end case;

  insert into public.historial_dossier (dossier_id, entidad, accion, actor_id, actor_rol, detalle)
  values (
    (case when tg_table_name = 'dossiers' then fila->>'id' else fila->>'dossier_id' end)::uuid,
    entidad,
    case tg_op when 'INSERT' then 'crear' when 'UPDATE' then 'editar' else 'borrar' end,
    (select auth.uid()),
    public.rol_actual()::text,
    detalle
  );
  return null;
end $$;

-- Editar un día guarda sus horas en otra tabla, pero siempre pasa por `registros_diarios`: por eso
-- `horas_actividad` no se anota aparte (serían varias filas por cada guardado).
create trigger anotar_historial after insert or update or delete on public.dossiers
for each row execute function public.anotar_historial();
create trigger anotar_historial after insert or update or delete on public.registros_diarios
for each row execute function public.anotar_historial();
create trigger anotar_historial after insert or update or delete on public.valoraciones_mensuales
for each row execute function public.anotar_historial();
create trigger anotar_historial after insert or update or delete on public.valoraciones_finales
for each row execute function public.anotar_historial();

revoke execute on function public.anotar_historial() from public, anon, authenticated;
revoke execute on function public.historial_solo_anadir() from public, anon, authenticated;

-- Toques de atención: el profe tutor avisa con un clic al alumno que lleva días sin apuntar
-- horas. El alumno lo ve en su Inicio hasta que apunta un día (entonces se resuelve solo).
-- Como mucho un toque al día por dossier.

create table public.toques (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.dossiers(id) on delete cascade,
  dado_por uuid not null default auth.uid() references public.perfiles(id) on delete cascade,
  -- Días laborables sin apuntar cuando se dio el toque (lo calcula la app, solo para el texto).
  dias_sin_apuntar smallint not null default 0 check (dias_sin_apuntar between 0 and 365),
  fecha date not null default (now() at time zone 'Europe/Madrid')::date,
  creado_en timestamptz not null default now(),
  visto_en timestamptz,
  resuelto_en timestamptz,
  unique (dossier_id, fecha)
);

create index toques_dado_por_idx on public.toques (dado_por);
create index toques_pendientes_idx on public.toques (dossier_id) where resuelto_en is null;

-- Al darlo: quién, cuándo y el día los pone la base; nace sin ver ni resolver.
create function public.preparar_toque() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null then
    new.dado_por := auth.uid();
    new.creado_en := now();
    new.fecha := (now() at time zone 'Europe/Madrid')::date;
    new.visto_en := null;
    new.resuelto_en := null;
  end if;
  return new;
end $$;

create trigger preparar_toque before insert on public.toques
for each row execute function public.preparar_toque();

-- Después solo cambia visto_en, y solo lo marca el alumno (una vez).
create function public.proteger_toque() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Sin usuario (sistema) o desde otro trigger (resolver_toques al apuntar un día): se deja.
  if (select auth.uid()) is null or pg_trigger_depth() > 1 then
    return new;
  end if;
  if (new.id, new.dossier_id, new.dado_por, new.dias_sin_apuntar, new.fecha, new.creado_en,
      new.resuelto_en)
     is distinct from (old.id, old.dossier_id, old.dado_por, old.dias_sin_apuntar, old.fecha,
      old.creado_en, old.resuelto_en) then
    raise exception 'De un toque solo se puede marcar que lo has visto';
  end if;
  if new.visto_en is distinct from old.visto_en then
    if not public.es_alumno_de(old.dossier_id) then
      raise exception 'Solo el alumno marca el toque como visto';
    end if;
    new.visto_en := coalesce(old.visto_en, now());
  end if;
  return new;
end $$;

create trigger proteger_toque before update on public.toques
for each row execute function public.proteger_toque();

-- Cuando el alumno apunta un día, sus toques pendientes quedan resueltos.
create function public.resolver_toques() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.toques set resuelto_en = now()
  where dossier_id = new.dossier_id and resuelto_en is null;
  return null;
end $$;

create trigger resolver_toques after insert on public.registros_diarios
for each row execute function public.resolver_toques();

revoke execute on function public.preparar_toque() from authenticated;
revoke execute on function public.proteger_toque() from authenticated;
revoke execute on function public.resolver_toques() from authenticated;

alter table public.toques enable row level security;

-- Lo ven el alumno, quien gestiona el dossier (profe tutor e instituto) y la generalitat.
create policy "ver toques" on public.toques for select to authenticated
  using (
    public.es_alumno_de(dossier_id) or public.gestiona_dossier(dossier_id)
    or public.es_generalitat()
  );
-- Solo el profe tutor del dossier da toques.
create policy "dar toques" on public.toques for insert to authenticated
  with check (
    exists (
      select 1 from public.dossiers d
      where d.id = dossier_id and d.tutor_id = (select auth.uid())
    )
  );
create policy "alumno ve toques" on public.toques for update to authenticated
  using (public.es_alumno_de(dossier_id)) with check (public.es_alumno_de(dossier_id));
create policy "generalitat borra toques" on public.toques for delete to authenticated
  using (public.es_generalitat());

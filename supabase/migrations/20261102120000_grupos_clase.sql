-- Clases (grupos) de cada centro, p. ej. "DAM 2 A", y la clase de cada alumno.
-- El instituto gestiona las de su centro y la generalitat todas; profes y alumnos las ven.

create table public.grupos (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centros(id) on delete cascade,
  ciclo text not null check (char_length(btrim(ciclo)) between 1 and 20),
  curso smallint not null check (curso between 1 and 4),
  letra text not null default 'A' check (letra ~ '^[A-Z]$'),
  creado_en timestamptz not null default now(),
  unique (centro_id, ciclo, curso, letra)
);

alter table public.perfiles
  add column grupo_id uuid references public.grupos(id) on delete set null;
create index perfiles_grupo_id_idx on public.perfiles (grupo_id);

-- Solo los alumnos tienen clase, y debe ser de su centro. Cambiarla es cosa del instituto
-- del centro o de la generalitat (el alumno no se cambia de clase a sí mismo).
create function public.comprobar_grupo_perfil() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.grupo_id is null then
    return new;
  end if;
  if new.rol <> 'alumno' then
    raise exception 'Solo los alumnos tienen clase';
  end if;
  if not exists (
    select 1 from public.grupos g where g.id = new.grupo_id and g.centro_id = new.centro_id
  ) then
    raise exception 'La clase debe ser del centro del alumno';
  end if;
  if tg_op = 'UPDATE' and new.grupo_id is distinct from old.grupo_id
     and (select auth.uid()) is not null
     and not public.administra_centro(new.centro_id) then
    raise exception 'Solo el instituto del centro puede cambiar la clase de un alumno';
  end if;
  return new;
end $$;

-- También al quitar la clase: solo el instituto o la generalitat.
create function public.proteger_grupo_perfil() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.grupo_id is null and old.grupo_id is not null
     and (select auth.uid()) is not null
     and not public.administra_centro(old.centro_id) then
    raise exception 'Solo el instituto del centro puede cambiar la clase de un alumno';
  end if;
  return new;
end $$;

create trigger comprobar_grupo_perfil before insert or update of grupo_id, rol, centro_id
on public.perfiles for each row execute function public.comprobar_grupo_perfil();
create trigger proteger_grupo_perfil before update of grupo_id on public.perfiles
for each row execute function public.proteger_grupo_perfil();

revoke execute on function public.comprobar_grupo_perfil() from authenticated;
revoke execute on function public.proteger_grupo_perfil() from authenticated;

alter table public.grupos enable row level security;

create policy "ver grupos" on public.grupos for select to authenticated
  using (public.administra_centro(centro_id) or centro_id = public.centro_actual());
create policy "crear grupos" on public.grupos for insert to authenticated
  with check (public.administra_centro(centro_id));
create policy "cambiar grupos" on public.grupos for update to authenticated
  using (public.administra_centro(centro_id))
  with check (public.administra_centro(centro_id));
create policy "borrar grupos" on public.grupos for delete to authenticated
  using (public.administra_centro(centro_id));

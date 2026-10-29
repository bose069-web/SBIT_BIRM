-- Datos personales que cada usuario gestiona desde su perfil: contacto, preferencias y lo
-- propio de su rol. Nada sensible (ni DNI, ni NUSS, ni salud). Van aparte de perfiles para
-- que su RLS sea más estricta: los ve su dueño y, en el caso de un alumno, quien gestiona su
-- dossier (profe tutor, instituto, generalitat). La empresa no.

create table public.datos_personales (
  id uuid primary key references public.perfiles (id) on delete cascade,
  telefono text check (telefono ~ '^\+?[0-9 ]{9,20}$'),
  idioma text not null default 'es' check (idioma in ('es', 'ca')),
  notificaciones boolean not null default true,
  emergencia_nombre text check (length(emergencia_nombre) <= 120),
  emergencia_telefono text check (emergencia_telefono ~ '^\+?[0-9 ]{9,20}$'),
  departamento text check (length(departamento) <= 120),
  horario_tutoria text check (length(horario_tutoria) <= 120),
  cargo text check (length(cargo) <= 120),
  telefono_trabajo text check (telefono_trabajo ~ '^\+?[0-9 ]{9,20}$'),
  centro_trabajo text check (length(centro_trabajo) <= 120),
  actualizado_en timestamptz not null default now()
);

create function public.tocar_datos_personales() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.actualizado_en := now();
  return new;
end $$;

create trigger tocar_datos_personales before insert or update on public.datos_personales
for each row execute function public.tocar_datos_personales();

alter table public.datos_personales enable row level security;

create policy "ver datos personales" on public.datos_personales for select to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1 from public.dossiers d
      where d.alumno_id = datos_personales.id and public.gestiona_dossier(d.id)
    )
  );
create policy "crear mis datos personales" on public.datos_personales for insert to authenticated
  with check (id = (select auth.uid()));
create policy "cambiar mis datos personales" on public.datos_personales for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- El nombre vive en perfiles, donde el usuario no puede escribir (cambiaría su rol o su
-- centro). Esta función solo le deja cambiar su propio nombre. El del alumno lo gestionan su
-- tutor y su instituto, para que nadie use la cuenta de otro sin pasar por ellos.
create function public.cambiar_mi_nombre(nuevo text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  limpio text := regexp_replace(trim(nuevo), '\s+', ' ', 'g');
begin
  if auth.uid() is null then
    raise exception 'No hay sesión';
  end if;
  if public.rol_actual() = 'alumno' then
    raise exception 'Tu nombre lo cambia tu tutor';
  end if;
  if length(limpio) not between 2 and 80 then
    raise exception 'Nombre no válido';
  end if;
  update public.perfiles set nombre = limpio where id = auth.uid();
end $$;

revoke execute on function public.cambiar_mi_nombre(text) from public, anon;
grant execute on function public.cambiar_mi_nombre(text) to authenticated;

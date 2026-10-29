-- Identidad del alumno (DNI/NIE). Dato sensible: va en su propia tabla. La crean y corrigen
-- quienes gestionan su dossier (profe tutor e instituto); el alumno solo la consulta para
-- avisar si hay un error. La empresa no la ve. Pendiente de confirmar con el DPD del centro.

create table public.identidad_alumno (
  alumno_id uuid primary key references public.perfiles (id) on delete cascade,
  dni text check (dni ~ '^[0-9XYZ][0-9]{7}[A-Z]$'),
  actualizado_en timestamptz not null default now()
);

create trigger tocar_identidad_alumno before insert or update on public.identidad_alumno
for each row execute function public.tocar_datos_personales();

alter table public.identidad_alumno enable row level security;

create function public.gestiona_alumno(a uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.dossiers d where d.alumno_id = a and public.gestiona_dossier(d.id)
  )
$$;

create policy "ver identidad" on public.identidad_alumno for select to authenticated
  using (alumno_id = (select auth.uid()) or public.gestiona_alumno(alumno_id));
create policy "crear identidad" on public.identidad_alumno for insert to authenticated
  with check (public.gestiona_alumno(alumno_id));
create policy "corregir identidad" on public.identidad_alumno for update to authenticated
  using (public.gestiona_alumno(alumno_id))
  with check (public.gestiona_alumno(alumno_id));

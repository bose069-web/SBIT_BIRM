-- El alumno que olvida su contraseña avisa a su profe, que le genera un enlace de un solo uso.
-- La tabla solo se escribe desde las Edge Functions: queda constancia de qué profe atendió cada una.
create table public.solicitudes_contrasena (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references public.perfiles(id) on delete cascade,
  profe_id uuid not null references public.perfiles(id) on delete cascade,
  creada_en timestamptz not null default now(),
  atendida_en timestamptz
);
-- Pedirla muchas veces no llena la lista del profe.
create unique index solicitudes_contrasena_una_pendiente
  on public.solicitudes_contrasena (alumno_id) where atendida_en is null;
create index solicitudes_contrasena_profe on public.solicitudes_contrasena (profe_id)
  where atendida_en is null;

alter table public.solicitudes_contrasena enable row level security;
revoke all on public.solicitudes_contrasena from public, anon, authenticated;
grant select on public.solicitudes_contrasena to authenticated;
grant all on public.solicitudes_contrasena to service_role;

-- Solo mientras siga siendo su profe.
create policy "profe ve solicitudes de sus alumnos" on public.solicitudes_contrasena
for select to authenticated using (
  profe_id = (select auth.uid())
  and exists (select 1 from public.perfiles p
    where p.id = alumno_id and p.profe_id = (select auth.uid()))
);

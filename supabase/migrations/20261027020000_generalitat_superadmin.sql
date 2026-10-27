-- La generalitat es el superadmin: gestiona todos los institutos, resuelve incidencias a gran
-- escala y puede hacer todo lo que hace cualquier instituto o profe, en cualquier centro.

-- Administra cualquier centro (y por tanto gestiona cualquier dossier vía gestiona_dossier).
create or replace function public.administra_centro(c uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.es_generalitat()
    or (public.es_instituto() and c is not null and c = public.centro_actual())
$$;

-- Puede crear y cambiar dossiers de cualquier centro (el check de "cambiar dossiers" ya usa
-- administra_centro); además puede borrar perfiles, centros y empresas para limpiar incidencias.
create policy "generalitat borra perfiles" on public.perfiles for delete to authenticated
  using (public.es_generalitat());
create policy "generalitat borra centros" on public.centros for delete to authenticated
  using (public.es_generalitat());
create policy "generalitat borra empresas" on public.empresas for delete to authenticated
  using (public.es_generalitat());

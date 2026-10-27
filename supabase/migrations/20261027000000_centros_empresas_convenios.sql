-- Modelo entidad-relación del equipo (pizarra):
--
--   centro  1:N  profes y alumnos        (perfiles.centro_id)
--   empresa 1:N  tutores de empresa      (perfiles.empresa_id)
--   centro  N:M  empresa                 (convenios)
--   dossier = "asigna": alumno + profe tutor + empresa (+ su tutor), solo si hay convenio.
--
-- Cada profe ve y gestiona solo lo de su centro. Ejecutar DESPUÉS de 20261026020000_roles_valoraciones.sql.

-- 1. Pertenencia: cada perfil a su centro o a su empresa ---------------------
alter table public.perfiles
  add column centro_id uuid references public.centros (id) on delete set null,
  add column empresa_id uuid references public.empresas (id) on delete set null,
  add constraint perfil_centro_o_empresa check (
    (rol = 'empresa' and centro_id is null) or (rol <> 'empresa' and empresa_id is null)
  );
create index on public.perfiles (centro_id);
create index on public.perfiles (empresa_id);

-- Rellena con lo que ya dicen los dossiers existentes.
update public.perfiles p set centro_id = d.centro_id
from public.dossiers d
where p.rol <> 'empresa' and p.centro_id is null and d.centro_id is not null
  and p.id in (d.alumno_id, d.tutor_id);
update public.perfiles p set empresa_id = d.empresa_id
from public.dossiers d
where p.rol = 'empresa' and p.empresa_id is null and p.id = d.tutor_empresa_id;

-- 2. Convenios centro-empresa (N:M) ------------------------------------------
create table public.convenios (
  centro_id uuid not null references public.centros (id) on delete cascade,
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  firmado_en date,
  creado_en timestamptz not null default now(),
  primary key (centro_id, empresa_id)
);
create index on public.convenios (empresa_id);
alter table public.convenios enable row level security;

insert into public.convenios (centro_id, empresa_id)
select distinct centro_id, empresa_id from public.dossiers
where centro_id is not null and empresa_id is not null
on conflict do nothing;

-- 3. Dossier: siempre de un centro y una empresa con convenio ----------------
alter table public.dossiers
  alter column centro_id set not null,
  alter column empresa_id set not null,
  add foreign key (centro_id, empresa_id) references public.convenios (centro_id, empresa_id);
create index on public.dossiers (centro_id);
create index on public.dossiers (empresa_id);

create or replace function public.comprobar_roles_dossier() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  alumno public.perfiles;
  tutor public.perfiles;
  tutor_empresa public.perfiles;
begin
  select * into alumno from public.perfiles where id = new.alumno_id;
  if alumno.rol is distinct from 'alumno' then
    raise exception 'El alumno del dossier debe tener rol alumno';
  end if;
  if alumno.centro_id is distinct from new.centro_id then
    raise exception 'El alumno debe ser del centro del dossier';
  end if;
  if new.tutor_id is not null then
    select * into tutor from public.perfiles where id = new.tutor_id;
    if tutor.rol is distinct from 'profe' or tutor.centro_id is distinct from new.centro_id then
      raise exception 'El tutor del centro debe ser un profe del centro del dossier';
    end if;
  end if;
  if new.tutor_empresa_id is not null then
    select * into tutor_empresa from public.perfiles where id = new.tutor_empresa_id;
    if tutor_empresa.rol is distinct from 'empresa' or tutor_empresa.empresa_id is distinct from new.empresa_id then
      raise exception 'El tutor de empresa debe trabajar en la empresa del dossier';
    end if;
  end if;
  return new;
end $$;

-- 4. Funciones de acceso por centro ------------------------------------------
create function public.centro_actual() returns uuid
language sql stable security definer set search_path = '' as $$
  select centro_id from public.perfiles where id = auth.uid()
$$;

-- Profe del mismo centro que el dossier.
create function public.es_profe_de(d uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.es_profe() and exists (
    select 1 from public.dossiers where id = d and centro_id = public.centro_actual()
  )
$$;

create or replace function public.puede_ver_dossier(d uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.es_profe_de(d) or public.es_alumno_de(d) or public.es_empresa_de(d)
$$;

-- 5. Políticas: lo que antes era "cualquier profe" pasa a "profe del centro" --
drop policy "ver perfiles" on public.perfiles;
drop policy "profe gestiona perfiles" on public.perfiles;
drop policy "profe centros" on public.centros;
drop policy "profe empresas" on public.empresas;
drop policy "profe dossiers" on public.dossiers;
drop policy "profe actividades" on public.actividades_formativas;
drop policy "profe registros" on public.registros_diarios;
drop policy "profe horas" on public.horas_actividad;
drop policy "profe valoraciones mensuales" on public.valoraciones_mensuales;
drop policy "profe valoracion final" on public.valoraciones_finales;
drop policy "profe tareas" on public.tareas;
drop policy "ver eventos" on public.eventos;
drop policy "profe eventos" on public.eventos;

-- Perfiles: el propio, los de sus dossiers y, para el profe, los de su centro
-- y los tutores de las empresas con convenio.
create policy "ver perfiles" on public.perfiles for select to authenticated using (
  id = auth.uid()
  or exists (
    select 1 from public.dossiers d
    where (d.alumno_id = auth.uid() or d.tutor_empresa_id = auth.uid())
      and perfiles.id in (d.alumno_id, d.tutor_id, d.tutor_empresa_id)
  )
  or (public.es_profe() and (
    centro_id = public.centro_actual()
    or empresa_id in (select empresa_id from public.convenios where centro_id = public.centro_actual())
  ))
);
-- El profe gestiona los perfiles de su centro (alumnos y profes).
create policy "profe gestiona perfiles" on public.perfiles for update to authenticated
  using (public.es_profe() and centro_id = public.centro_actual())
  with check (public.es_profe() and centro_id = public.centro_actual());

-- Centros: cada profe cambia solo el suyo. Empresas: las crea o cambia cualquier profe.
create policy "profe su centro" on public.centros for update to authenticated
  using (public.es_profe() and id = public.centro_actual())
  with check (public.es_profe() and id = public.centro_actual());
create policy "profe empresas" on public.empresas for all to authenticated
  using (public.es_profe()) with check (public.es_profe());

-- Convenios: los ve cualquiera autenticado; el profe gestiona los de su centro.
create policy "leer convenios" on public.convenios for select to authenticated using (true);
create policy "profe convenios" on public.convenios for all to authenticated
  using (public.es_profe() and centro_id = public.centro_actual())
  with check (public.es_profe() and centro_id = public.centro_actual());

create policy "profe dossiers" on public.dossiers for all to authenticated
  using (public.es_profe() and centro_id = public.centro_actual())
  with check (public.es_profe() and centro_id = public.centro_actual());
create policy "profe actividades" on public.actividades_formativas for all to authenticated
  using (public.es_profe_de(dossier_id)) with check (public.es_profe_de(dossier_id));
create policy "profe registros" on public.registros_diarios for all to authenticated
  using (public.es_profe_de(dossier_id)) with check (public.es_profe_de(dossier_id));
create policy "profe horas" on public.horas_actividad for all to authenticated
  using (public.es_profe_de(dossier_id)) with check (public.es_profe_de(dossier_id));
create policy "profe valoraciones mensuales" on public.valoraciones_mensuales for all to authenticated
  using (public.es_profe_de(dossier_id))
  with check (public.es_profe_de(dossier_id) and valorada_por = auth.uid());
create policy "profe valoracion final" on public.valoraciones_finales for all to authenticated
  using (public.es_profe_de(dossier_id))
  with check (public.es_profe_de(dossier_id) and valorada_por = auth.uid());
create policy "profe tareas" on public.tareas for all to authenticated
  using (public.es_profe_de(dossier_id)) with check (public.es_profe_de(dossier_id));

-- Eventos generales (sin dossier): los ve todo el mundo y los gestiona cualquier profe.
create policy "ver eventos" on public.eventos for select to authenticated
  using (dossier_id is null or public.puede_ver_dossier(dossier_id));
create policy "profe eventos" on public.eventos for all to authenticated
  using (public.es_profe() and (dossier_id is null or public.es_profe_de(dossier_id)))
  with check (public.es_profe() and (dossier_id is null or public.es_profe_de(dossier_id)));

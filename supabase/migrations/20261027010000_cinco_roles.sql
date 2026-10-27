-- Cinco roles y sus relaciones, según el modelo entidad-relación del equipo:
--
--   generalitat → ve todos los institutos (solo lectura) y da de alta institutos y sus cuentas.
--   instituto   → administra su centro: profes y alumnos, convenios con empresas, asigna cada
--                 alumno a su profe y crea los dossiers.
--   profe       → tutor del centro: solo ve a los alumnos que le asigna su instituto;
--                 prepara sus dossiers y pone la valoración final.
--   empresa     → tutor de empresa: valora cada mes a sus alumnos.
--   alumno      → apunta cada día lo que ha hecho.
--
-- Relaciones: generalitat 1:N institutos (centros) · centro 1:N profes y alumnos ·
-- centro N:M empresa (convenios) · profe 1:N alumnos (perfiles.profe_id) ·
-- dossier = "asigna" (alumno + su profe + empresa con convenio + tutor de empresa).
--
-- Recoge también la PR 2 de Bouba: profe asignado por alumno, tutor del dossier automático
-- y funciones que no se pueden llamar sin sesión.

-- 1. Fuera todas las políticas (se recrean al final, una sola fuente de verdad) ----
do $$
declare p record;
begin
  for p in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

drop function public.rol_actual();
drop function public.es_profe_de(uuid);

-- 2. Roles -------------------------------------------------------------------------
alter table public.perfiles drop constraint perfil_centro_o_empresa;
alter table public.perfiles alter column rol drop default;
alter table public.perfiles alter column rol type text using rol::text;
drop type public.rol;
create type public.rol as enum ('alumno', 'empresa', 'profe', 'instituto', 'generalitat');
alter table public.perfiles alter column rol type public.rol using rol::public.rol;
alter table public.perfiles alter column rol set default 'alumno';

-- Cada perfil pertenece a un centro (alumno, profe, instituto), a una empresa (empresa)
-- o a ninguno (generalitat y cuentas nuevas aún sin asignar).
alter table public.perfiles
  add column profe_id uuid references public.perfiles (id) on delete set null,
  add constraint perfil_pertenencia check (
    case rol
      when 'empresa' then centro_id is null
      when 'generalitat' then centro_id is null and empresa_id is null
      else empresa_id is null
    end
  ),
  add constraint perfil_profe_solo_alumno check (profe_id is null or rol = 'alumno');
create index on public.perfiles (profe_id);

-- Los alumnos que ya tienen dossier quedan asignados a su tutor actual.
update public.perfiles p set profe_id = d.tutor_id
from public.dossiers d
where d.alumno_id = p.id and p.rol = 'alumno' and p.profe_id is null and d.tutor_id is not null;

-- 3. Funciones de acceso -------------------------------------------------------------
create function public.rol_actual() returns public.rol
language sql stable security definer set search_path = '' as $$
  select rol from public.perfiles where id = (select auth.uid())
$$;

create or replace function public.centro_actual() returns uuid
language sql stable security definer set search_path = '' as $$
  select centro_id from public.perfiles where id = (select auth.uid())
$$;

create function public.es_generalitat() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.rol_actual() = 'generalitat', false)
$$;

create function public.es_instituto() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.rol_actual() = 'instituto', false)
$$;

create or replace function public.es_profe() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.rol_actual() = 'profe', false)
$$;

-- Instituto que administra el centro c.
create function public.administra_centro(c uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.es_instituto() and c is not null and c = public.centro_actual()
$$;

-- Gestionan un dossier su profe tutor y el instituto de su centro.
create function public.gestiona_dossier(d uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.dossiers
    where id = d and (tutor_id = (select auth.uid()) or public.administra_centro(centro_id))
  )
$$;

-- Ven un dossier quienes lo gestionan, su alumno, su tutor de empresa y la generalitat.
create or replace function public.puede_ver_dossier(d uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.gestiona_dossier(d) or public.es_alumno_de(d) or public.es_empresa_de(d)
    or public.es_generalitat()
$$;

-- 4. Perfiles: quién puede cambiar roles y asignaciones -------------------------------
-- RLS decide QUÉ filas puede tocar cada uno; este trigger, QUÉ valores puede dejar.
create function public.proteger_perfil() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  profe public.perfiles;
begin
  if new.profe_id is not null then
    select * into profe from public.perfiles where id = new.profe_id;
    if profe.rol is distinct from 'profe' or profe.centro_id is distinct from new.centro_id then
      raise exception 'El profe asignado debe ser un profe del centro del alumno';
    end if;
  end if;

  -- auth.uid() es null cuando cambia algo el sistema (alta de usuario, migraciones, seed).
  if tg_op = 'INSERT' or (select auth.uid()) is null or public.es_generalitat() then
    return new;
  end if;

  -- Nadie se cambia a sí mismo el rol ni las asignaciones.
  if new.id <> (select auth.uid()) and public.es_instituto() then
    -- El instituto reparte cuentas de su centro: alumnos, profes y tutores de empresas con convenio.
    if new.rol = 'empresa' then
      if new.empresa_id is null or not exists (
        select 1 from public.convenios
        where centro_id = public.centro_actual() and empresa_id = new.empresa_id
      ) then
        raise exception 'El tutor de empresa debe ser de una empresa con convenio con tu centro';
      end if;
    elsif new.rol not in ('alumno', 'profe') or new.centro_id is distinct from public.centro_actual() then
      raise exception 'Solo puedes dar de alta alumnos y profes de tu centro';
    end if;
    return new;
  end if;

  -- El resto (y cualquiera sobre su propio perfil) solo puede cambiar el nombre.
  if (new.id, new.email, new.rol, new.centro_id, new.empresa_id, new.profe_id)
     is distinct from (old.id, old.email, old.rol, old.centro_id, old.empresa_id, old.profe_id) then
    raise exception 'No puedes cambiar el rol ni las asignaciones de este perfil';
  end if;
  return new;
end $$;

create trigger proteger_perfil before insert or update on public.perfiles
for each row execute function public.proteger_perfil();

-- Si el instituto cambia el profe de un alumno, sus dossiers pasan al nuevo profe.
create function public.sincronizar_tutor() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.dossiers set tutor_id = new.profe_id where alumno_id = new.id;
  return null;
end $$;

create trigger sincronizar_tutor after update of profe_id on public.perfiles
for each row when (new.profe_id is distinct from old.profe_id)
execute function public.sincronizar_tutor();

-- 5. Dossier: el tutor del centro es siempre el profe asignado al alumno --------------
create or replace function public.comprobar_roles_dossier() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  alumno public.perfiles;
  tutor_empresa public.perfiles;
begin
  select * into alumno from public.perfiles where id = new.alumno_id;
  if alumno.rol is distinct from 'alumno' then
    raise exception 'El alumno del dossier debe tener rol alumno';
  end if;
  if alumno.centro_id is distinct from new.centro_id then
    raise exception 'El alumno debe ser del centro del dossier';
  end if;
  if alumno.profe_id is null and tg_op = 'INSERT' then
    raise exception 'El instituto tiene que asignar un profe al alumno antes de crear su dossier';
  end if;
  new.tutor_id := alumno.profe_id;
  if new.tutor_empresa_id is not null then
    select * into tutor_empresa from public.perfiles where id = new.tutor_empresa_id;
    if tutor_empresa.rol is distinct from 'empresa' or tutor_empresa.empresa_id is distinct from new.empresa_id then
      raise exception 'El tutor de empresa debe trabajar en la empresa del dossier';
    end if;
  end if;
  return new;
end $$;

-- 6. Tareas: el alumno solo las marca como hechas ------------------------------------
create or replace function public.proteger_tarea() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not public.gestiona_dossier(old.dossier_id) and (
    new.dossier_id, new.titulo, new.descripcion, new.fecha_limite, new.creada_por
  ) is distinct from (
    old.dossier_id, old.titulo, old.descripcion, old.fecha_limite, old.creada_por
  ) then
    raise exception 'Solo el profe o el instituto pueden cambiar los datos de una tarea';
  end if;
  return new;
end $$;

-- 7. Políticas (RLS) -------------------------------------------------------------------
-- Perfiles: el propio, los de sus dossiers, los de su centro (instituto), sus alumnos (profe),
-- las cuentas nuevas y los tutores de empresas con convenio (instituto); la generalitat, todos.
create policy "ver perfiles" on public.perfiles for select to authenticated using (
  id = (select auth.uid())
  or public.es_generalitat()
  or profe_id = (select auth.uid())
  or public.administra_centro(centro_id)
  or (public.es_instituto() and (
    (rol = 'alumno' and centro_id is null)
    or empresa_id in (select empresa_id from public.convenios where centro_id = public.centro_actual())
  ))
  or exists (
    select 1 from public.dossiers d
    where (select auth.uid()) in (d.alumno_id, d.tutor_id, d.tutor_empresa_id)
      and perfiles.id in (d.alumno_id, d.tutor_id, d.tutor_empresa_id)
  )
);
-- Cambian perfiles: cada uno el suyo, el instituto los de su centro y las cuentas nuevas,
-- y la generalitat todos. El trigger proteger_perfil limita los valores.
create policy "cambiar perfiles" on public.perfiles for update to authenticated
  using (
    id = (select auth.uid()) or public.es_generalitat() or public.administra_centro(centro_id)
    or (public.es_instituto() and rol = 'alumno' and centro_id is null and empresa_id is null)
  )
  with check (
    id = (select auth.uid()) or public.es_generalitat() or public.administra_centro(centro_id)
    or (public.es_instituto() and rol = 'empresa')
  );

-- Centros: los ve cualquiera; los crea la generalitat; cada instituto cambia el suyo.
create policy "ver centros" on public.centros for select to authenticated using (true);
create policy "generalitat crea centros" on public.centros for insert to authenticated
  with check (public.es_generalitat());
create policy "cambiar centros" on public.centros for update to authenticated
  using (public.es_generalitat() or public.administra_centro(id))
  with check (public.es_generalitat() or public.administra_centro(id));

-- Empresas: las ve cualquiera; las dan de alta y cambian los institutos y la generalitat.
create policy "ver empresas" on public.empresas for select to authenticated using (true);
create policy "dar de alta empresas" on public.empresas for insert to authenticated
  with check (public.es_instituto() or public.es_generalitat());
create policy "cambiar empresas" on public.empresas for update to authenticated
  using (public.es_instituto() or public.es_generalitat())
  with check (public.es_instituto() or public.es_generalitat());

-- Convenios: los ve cualquiera; cada instituto gestiona los de su centro.
create policy "ver convenios" on public.convenios for select to authenticated using (true);
create policy "instituto gestiona convenios" on public.convenios for all to authenticated
  using (public.administra_centro(centro_id)) with check (public.administra_centro(centro_id));

-- Dossiers: los crean el instituto y el profe para alumnos de su centro (el tutor lo pone el trigger).
-- La lectura mira la propia fila (no puede_ver_dossier): así un insert ... returning ve la fila nueva.
create policy "ver dossiers" on public.dossiers for select to authenticated using (
  (select auth.uid()) in (alumno_id, tutor_id, tutor_empresa_id)
  or public.administra_centro(centro_id) or public.es_generalitat()
);
create policy "crear dossiers" on public.dossiers for insert to authenticated
  with check (
    public.administra_centro(centro_id)
    or (public.es_profe() and centro_id = public.centro_actual())
  );
create policy "cambiar dossiers" on public.dossiers for update to authenticated
  using (public.gestiona_dossier(id))
  with check (
    public.administra_centro(centro_id)
    or (public.es_profe() and centro_id = public.centro_actual())
  );
create policy "instituto borra dossiers" on public.dossiers for delete to authenticated
  using (public.administra_centro(centro_id));

create policy "ver actividades" on public.actividades_formativas for select to authenticated
  using (public.puede_ver_dossier(dossier_id));
create policy "gestionar actividades" on public.actividades_formativas for all to authenticated
  using (public.gestiona_dossier(dossier_id)) with check (public.gestiona_dossier(dossier_id));

-- Registros: el alumno gestiona los suyos mientras el mes no esté valorado; su profe e
-- instituto pueden corregirlos.
create policy "ver registros" on public.registros_diarios for select to authenticated
  using (public.puede_ver_dossier(dossier_id));
create policy "alumno gestiona registros" on public.registros_diarios for all to authenticated
  using (public.es_alumno_de(dossier_id) and not public.mes_cerrado(dossier_id, fecha))
  with check (public.es_alumno_de(dossier_id) and not public.mes_cerrado(dossier_id, fecha));
create policy "tutor corrige registros" on public.registros_diarios for all to authenticated
  using (public.gestiona_dossier(dossier_id)) with check (public.gestiona_dossier(dossier_id));

create policy "ver horas" on public.horas_actividad for select to authenticated
  using (public.puede_ver_dossier(dossier_id));
create policy "alumno gestiona horas" on public.horas_actividad for all to authenticated
using (
  public.es_alumno_de(dossier_id) and not exists (
    select 1 from public.registros_diarios r
    where r.id = registro_id and public.mes_cerrado(r.dossier_id, r.fecha)
  )
) with check (
  public.es_alumno_de(dossier_id) and not exists (
    select 1 from public.registros_diarios r
    where r.id = registro_id and public.mes_cerrado(r.dossier_id, r.fecha)
  )
);
create policy "tutor corrige horas" on public.horas_actividad for all to authenticated
  using (public.gestiona_dossier(dossier_id)) with check (public.gestiona_dossier(dossier_id));

-- Valoración mensual: la pone su tutor de empresa hasta la valoración final; su profe e
-- instituto también pueden.
create policy "ver valoraciones mensuales" on public.valoraciones_mensuales for select to authenticated
  using (public.puede_ver_dossier(dossier_id));
create policy "empresa valora el mes" on public.valoraciones_mensuales for all to authenticated
  using (public.es_empresa_de(dossier_id) and not public.tiene_valoracion_final(dossier_id))
  with check (
    public.es_empresa_de(dossier_id) and not public.tiene_valoracion_final(dossier_id)
    and valorada_por = (select auth.uid())
  );
create policy "tutor valora el mes" on public.valoraciones_mensuales for all to authenticated
  using (public.gestiona_dossier(dossier_id))
  with check (public.gestiona_dossier(dossier_id) and valorada_por = (select auth.uid()));

-- Valoración final: la ponen su profe o su instituto.
create policy "ver valoracion final" on public.valoraciones_finales for select to authenticated
  using (public.puede_ver_dossier(dossier_id));
create policy "tutor valoracion final" on public.valoraciones_finales for all to authenticated
  using (public.gestiona_dossier(dossier_id))
  with check (public.gestiona_dossier(dossier_id) and valorada_por = (select auth.uid()));

-- Tareas: las crean su profe o instituto; el alumno solo las marca (ver trigger).
create policy "ver tareas" on public.tareas for select to authenticated
  using (public.puede_ver_dossier(dossier_id));
create policy "gestionar tareas" on public.tareas for all to authenticated
  using (public.gestiona_dossier(dossier_id)) with check (public.gestiona_dossier(dossier_id));
create policy "alumno completa tareas" on public.tareas for update to authenticated
  using (public.es_alumno_de(dossier_id)) with check (public.es_alumno_de(dossier_id));

-- Eventos: los generales (sin dossier) los ve todo el mundo y los crean institutos y generalitat.
create policy "ver eventos" on public.eventos for select to authenticated
  using (dossier_id is null or public.puede_ver_dossier(dossier_id));
create policy "gestionar eventos" on public.eventos for all to authenticated
  using (
    (dossier_id is null and (public.es_instituto() or public.es_generalitat()))
    or public.gestiona_dossier(dossier_id)
  )
  with check (
    (dossier_id is null and (public.es_instituto() or public.es_generalitat()))
    or public.gestiona_dossier(dossier_id)
  );

-- 8. Seguridad: nadie sin sesión llama a las funciones por /rest/v1/rpc (PR 2 de Bouba) --
revoke execute on all functions in schema public from public, anon;
-- Con sesión sí: las políticas RLS las usan (explícito, no depender del privilegio de `public`).
grant execute on all functions in schema public to authenticated;
revoke execute on function public.crear_perfil() from authenticated;
revoke execute on function public.proteger_perfil() from authenticated;
revoke execute on function public.sincronizar_tutor() from authenticated;
revoke execute on function public.comprobar_roles_dossier() from authenticated;
revoke execute on function public.proteger_tarea() from authenticated;
alter default privileges in schema public revoke execute on functions from public, anon;
alter default privileges in schema public grant execute on functions to authenticated;

-- Índices de las claves foráneas que faltaban.
create index if not exists eventos_dossier_id_idx on public.eventos (dossier_id);
create index if not exists tareas_creada_por_idx on public.tareas (creada_por);
create index if not exists valoraciones_mensuales_valorada_por_idx
  on public.valoraciones_mensuales (valorada_por);
create index if not exists valoraciones_finales_valorada_por_idx
  on public.valoraciones_finales (valorada_por);

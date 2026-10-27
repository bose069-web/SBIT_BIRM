-- Roles, asignaciones y valoraciones como en el SBIT. Transforma el esquema ya aplicado sin perder datos.
--
--   alumno  → apunta cada día lo que ha hecho y las horas.
--   empresa → tutor de la empresa: valora cada mes el trabajo del alumno.
--   profe   → tutor del centro: solo ve a los alumnos que le asigna el admin; les crea el dossier,
--             les pone empresa y tutor de empresa, y pone la valoración final.
--   admin   → lo ve y lo puede hacer todo; asigna cada alumno a su profe.
--
-- Ya no se valida día a día: la valoración mensual de la empresa cierra ese mes para el alumno.

-- 1. Fuera las políticas y funciones antiguas (se recrean más abajo) ---------
do $$
declare p record;
begin
  for p in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

drop function public.es_admin();
drop function public.es_tutor_de(uuid);
drop function public.rol_actual();

-- 2. Roles: alumno, empresa, profe y admin -----------------------------------
alter table public.perfiles alter column rol drop default;
alter table public.perfiles alter column rol type text using rol::text;
drop type public.rol;
create type public.rol as enum ('alumno', 'empresa', 'profe', 'admin');
alter table public.perfiles alter column rol type public.rol using rol::public.rol;
alter table public.perfiles alter column rol set default 'alumno';

create function public.rol_actual() returns public.rol
language sql stable security definer set search_path = '' as $$
  select rol from public.perfiles where id = auth.uid()
$$;

create function public.es_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select rol = 'admin' from public.perfiles where id = auth.uid()), false)
$$;

create function public.es_profe() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select rol = 'profe' from public.perfiles where id = auth.uid()), false)
$$;

-- 3. Cada alumno tiene su profe, que asigna el admin -------------------------
alter table public.perfiles
  add column profe_id uuid references public.perfiles (id) on delete set null;
create index on public.perfiles (profe_id);

-- Los alumnos que ya tienen dossier quedan asignados al profe de ese dossier.
update public.perfiles p set profe_id = d.tutor_id
from public.dossiers d
where d.alumno_id = p.id and d.tutor_id is not null;

-- Qué puede cambiar cada uno en un perfil (las políticas dicen qué filas; esto, qué columnas).
create function public.proteger_perfil() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.profe_id is not null then
    if new.rol <> 'alumno' then
      raise exception 'Solo los alumnos tienen profe asignado';
    end if;
    if (select rol from public.perfiles where id = new.profe_id) is distinct from 'profe' then
      raise exception 'El profe asignado debe tener rol profe';
    end if;
  end if;

  -- auth.uid() es null cuando cambia algo el sistema (triggers de Supabase, migraciones).
  if tg_op = 'UPDATE' and auth.uid() is not null and not public.es_admin() then
    -- El profe solo puede convertir una cuenta nueva (alumno sin profe) en tutor de empresa.
    if not (
      public.es_profe()
      and old.rol = 'alumno' and old.profe_id is null and new.rol = 'empresa'
      and (new.id, new.email, new.nombre, new.profe_id) is not distinct from
          (old.id, old.email, old.nombre, old.profe_id)
    ) then
      raise exception 'Solo el admin puede cambiar este perfil';
    end if;
  end if;
  return new;
end $$;

create trigger proteger_perfil before insert or update on public.perfiles
for each row execute function public.proteger_perfil();

-- 4. Dossier: tutor de empresa y tutor del centro --------------------------
alter table public.dossiers
  add column tutor_empresa_id uuid references public.perfiles (id) on delete set null;
create index on public.dossiers (tutor_empresa_id);

-- El tutor del centro de un dossier es siempre el profe asignado a su alumno.
create function public.preparar_dossier() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select rol from public.perfiles where id = new.alumno_id) is distinct from 'alumno' then
    raise exception 'El alumno del dossier debe tener rol alumno';
  end if;
  new.tutor_id := (select profe_id from public.perfiles where id = new.alumno_id);
  if new.tutor_id is null then
    raise exception 'El admin tiene que asignar un profe a este alumno antes de crear su dossier';
  end if;
  if new.tutor_empresa_id is not null
     and (select rol from public.perfiles where id = new.tutor_empresa_id) is distinct from 'empresa' then
    raise exception 'El tutor de empresa debe tener rol empresa';
  end if;
  return new;
end $$;

create trigger preparar_dossier before insert or update on public.dossiers
for each row execute function public.preparar_dossier();

-- Si el admin cambia el profe de un alumno, sus dossiers pasan al nuevo profe.
create function public.sincronizar_tutor() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.profe_id is distinct from old.profe_id then
    update public.dossiers set tutor_id = new.profe_id where alumno_id = new.id;
  end if;
  return null;
end $$;

create trigger sincronizar_tutor after update of profe_id on public.perfiles
for each row execute function public.sincronizar_tutor();

-- 5. Registro diario sin validación por día ----------------------------------
alter table public.registros_diarios
  drop column estado,
  drop column comentario_tutor,
  drop column validado_por,
  drop column validado_en,
  add column creado_en timestamptz not null default now(),
  add unique (id, dossier_id);
drop type public.estado_registro;

-- Las horas solo pueden apuntar a actividades del mismo dossier que su día.
alter table public.actividades_formativas add unique (id, dossier_id);
alter table public.horas_actividad add column dossier_id uuid;
update public.horas_actividad h set dossier_id = r.dossier_id
from public.registros_diarios r where r.id = h.registro_id;
delete from public.horas_actividad h using public.actividades_formativas a
where a.id = h.actividad_id and a.dossier_id <> h.dossier_id;
alter table public.horas_actividad
  alter column dossier_id set not null,
  drop constraint horas_actividad_registro_id_fkey,
  drop constraint horas_actividad_actividad_id_fkey,
  add foreign key (registro_id, dossier_id)
    references public.registros_diarios (id, dossier_id) on delete cascade,
  add foreign key (actividad_id, dossier_id)
    references public.actividades_formativas (id, dossier_id) on delete cascade;

-- 6. Valoraciones ------------------------------------------------------------
-- Mensual: la pone el tutor de empresa (o el profe del alumno). `mes` es siempre el día 1 del mes.
create type public.valoracion_mes as enum ('positiva', 'mejorable', 'negativa');
create type public.resultado_final as enum ('apto', 'no_apto');

create table public.valoraciones_mensuales (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.dossiers (id) on delete cascade,
  mes date not null check (extract(day from mes) = 1),
  valoracion public.valoracion_mes not null,
  comentario text,
  valorada_por uuid not null references public.perfiles (id),
  valorada_en timestamptz not null default now(),
  unique (dossier_id, mes)
);

-- Final: la pone el profe del alumno al acabar las prácticas. Una por dossier.
create table public.valoraciones_finales (
  dossier_id uuid primary key references public.dossiers (id) on delete cascade,
  resultado public.resultado_final not null,
  comentario text,
  valorada_por uuid not null references public.perfiles (id),
  valorada_en timestamptz not null default now()
);

alter table public.valoraciones_mensuales enable row level security;
alter table public.valoraciones_finales enable row level security;

-- 7. Funciones de acceso ------------------------------------------------------
create or replace function public.es_alumno_de(d uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.dossiers where id = d and alumno_id = auth.uid())
$$;

create function public.es_empresa_de(d uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.dossiers where id = d and tutor_empresa_id = auth.uid())
$$;

create function public.es_tutor_de(d uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.dossiers where id = d and tutor_id = auth.uid())
$$;

-- Gestiona un dossier su profe tutor o el admin.
create function public.gestiona_dossier(d uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.es_admin() or public.es_tutor_de(d)
$$;

-- Ven un dossier su alumno, su tutor de empresa, su profe y el admin.
create or replace function public.puede_ver_dossier(d uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.gestiona_dossier(d) or public.es_alumno_de(d) or public.es_empresa_de(d)
$$;

create function public.tiene_valoracion_final(d uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.valoraciones_finales where dossier_id = d)
$$;

-- Un mes queda cerrado para el alumno cuando la empresa lo ha valorado (o hay valoración final).
create function public.mes_cerrado(d uuid, f date) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.valoraciones_mensuales
    where dossier_id = d and mes = date_trunc('month', f)::date
  ) or public.tiene_valoracion_final(d)
$$;

create function public.puede_editar_horas(registro uuid, d uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.gestiona_dossier(d) or (
    public.es_alumno_de(d) and not exists (
      select 1 from public.registros_diarios r
      where r.id = registro and public.mes_cerrado(r.dossier_id, r.fecha)
    )
  )
$$;

create function public.puede_valorar_mes(d uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.gestiona_dossier(d)
    or (public.es_empresa_de(d) and not public.tiene_valoracion_final(d))
$$;

-- Comparte algún dossier con esa persona (como alumno, profe o tutor de empresa).
create function public.comparte_dossier(p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.dossiers d
    where auth.uid() in (d.alumno_id, d.tutor_id, d.tutor_empresa_id)
      and p in (d.alumno_id, d.tutor_id, d.tutor_empresa_id)
  )
$$;

-- 8. Tareas: el alumno solo puede marcarlas como hechas ----------------------
create function public.proteger_tarea() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not public.gestiona_dossier(old.dossier_id) and (
    new.dossier_id, new.titulo, new.descripcion, new.fecha_limite, new.creada_por
  ) is distinct from (
    old.dossier_id, old.titulo, old.descripcion, old.fecha_limite, old.creada_por
  ) then
    raise exception 'Solo el profe puede cambiar los datos de una tarea';
  end if;
  return new;
end $$;

create trigger proteger_tarea before update on public.tareas
for each row execute function public.proteger_tarea();

-- 9. Políticas (RLS) ----------------------------------------------------------
-- Una sola política por tabla y acción (más rápido que varias que se suman) y
-- `(select auth.uid())` para que Postgres lo calcule una vez por consulta y no por fila.

-- Perfiles: lo que puede cambiar cada uno lo limita además el trigger proteger_perfil.
-- Cada uno ve su perfil y los de sus dossiers; el profe además a sus alumnos, a los tutores de
-- empresa y las cuentas nuevas (para convertirlas en tutor de empresa); el admin, todos.
create policy "ver perfiles" on public.perfiles for select to authenticated using (
  id = (select auth.uid()) or public.es_admin()
  or profe_id = (select auth.uid())
  or (public.es_profe() and (rol = 'empresa' or (rol = 'alumno' and profe_id is null)))
  or public.comparte_dossier(id)
);
create policy "admin crea perfiles" on public.perfiles for insert to authenticated
  with check (public.es_admin());
create policy "cambiar perfiles" on public.perfiles for update to authenticated
  using (public.es_admin() or (public.es_profe() and rol = 'alumno' and profe_id is null))
  with check (public.es_admin() or (public.es_profe() and rol = 'empresa'));
create policy "admin borra perfiles" on public.perfiles for delete to authenticated
  using (public.es_admin());

-- Centros: los gestiona el admin. Empresas: las dan de alta el admin y los profes.
create policy "ver centros" on public.centros for select to authenticated using (true);
create policy "admin crea centros" on public.centros for insert to authenticated
  with check (public.es_admin());
create policy "admin cambia centros" on public.centros for update to authenticated
  using (public.es_admin()) with check (public.es_admin());
create policy "admin borra centros" on public.centros for delete to authenticated
  using (public.es_admin());

create policy "ver empresas" on public.empresas for select to authenticated using (true);
create policy "crear empresas" on public.empresas for insert to authenticated
  with check (public.es_admin() or public.es_profe());
create policy "cambiar empresas" on public.empresas for update to authenticated
  using (public.es_admin() or public.es_profe())
  with check (public.es_admin() or public.es_profe());
create policy "admin borra empresas" on public.empresas for delete to authenticated
  using (public.es_admin());

-- Dossiers: el profe crea y gestiona los de sus alumnos (el tutor lo pone el trigger).
create policy "ver dossiers" on public.dossiers for select to authenticated using (
  (select auth.uid()) in (alumno_id, tutor_id, tutor_empresa_id) or public.es_admin()
);
create policy "crear dossiers" on public.dossiers for insert to authenticated
  with check (
    public.es_admin() or exists (
      select 1 from public.perfiles p
      where p.id = alumno_id and p.profe_id = (select auth.uid())
    )
  );
create policy "cambiar dossiers" on public.dossiers for update to authenticated
  using (public.es_admin() or tutor_id = (select auth.uid()))
  with check (public.es_admin() or tutor_id = (select auth.uid()));
create policy "borrar dossiers" on public.dossiers for delete to authenticated
  using (public.es_admin() or tutor_id = (select auth.uid()));

create policy "ver actividades" on public.actividades_formativas for select to authenticated
  using (public.puede_ver_dossier(dossier_id));
create policy "crear actividades" on public.actividades_formativas for insert to authenticated
  with check (public.gestiona_dossier(dossier_id));
create policy "cambiar actividades" on public.actividades_formativas for update to authenticated
  using (public.gestiona_dossier(dossier_id)) with check (public.gestiona_dossier(dossier_id));
create policy "borrar actividades" on public.actividades_formativas for delete to authenticated
  using (public.gestiona_dossier(dossier_id));

-- Registros: el alumno gestiona los suyos mientras el mes no esté valorado; su profe y el admin, siempre.
create policy "ver registros" on public.registros_diarios for select to authenticated
  using (public.puede_ver_dossier(dossier_id));
create policy "crear registros" on public.registros_diarios for insert to authenticated
  with check (
    public.gestiona_dossier(dossier_id)
    or (public.es_alumno_de(dossier_id) and not public.mes_cerrado(dossier_id, fecha))
  );
create policy "cambiar registros" on public.registros_diarios for update to authenticated
  using (
    public.gestiona_dossier(dossier_id)
    or (public.es_alumno_de(dossier_id) and not public.mes_cerrado(dossier_id, fecha))
  ) with check (
    public.gestiona_dossier(dossier_id)
    or (public.es_alumno_de(dossier_id) and not public.mes_cerrado(dossier_id, fecha))
  );
create policy "borrar registros" on public.registros_diarios for delete to authenticated
  using (
    public.gestiona_dossier(dossier_id)
    or (public.es_alumno_de(dossier_id) and not public.mes_cerrado(dossier_id, fecha))
  );

create policy "ver horas" on public.horas_actividad for select to authenticated
  using (public.puede_ver_dossier(dossier_id));
create policy "crear horas" on public.horas_actividad for insert to authenticated
  with check (public.puede_editar_horas(registro_id, dossier_id));
create policy "cambiar horas" on public.horas_actividad for update to authenticated
  using (public.puede_editar_horas(registro_id, dossier_id))
  with check (public.puede_editar_horas(registro_id, dossier_id));
create policy "borrar horas" on public.horas_actividad for delete to authenticated
  using (public.puede_editar_horas(registro_id, dossier_id));

-- Valoración mensual: la ve todo el dossier; la pone su tutor de empresa (hasta la valoración
-- final), su profe o el admin, y siempre firma quien tiene la sesión.
create policy "ver valoraciones mensuales" on public.valoraciones_mensuales for select to authenticated
  using (public.puede_ver_dossier(dossier_id));
create policy "crear valoraciones mensuales" on public.valoraciones_mensuales for insert to authenticated
  with check (public.puede_valorar_mes(dossier_id) and valorada_por = (select auth.uid()));
create policy "cambiar valoraciones mensuales" on public.valoraciones_mensuales for update to authenticated
  using (public.puede_valorar_mes(dossier_id))
  with check (public.puede_valorar_mes(dossier_id) and valorada_por = (select auth.uid()));
create policy "borrar valoraciones mensuales" on public.valoraciones_mensuales for delete to authenticated
  using (public.puede_valorar_mes(dossier_id));

-- Valoración final: la ve todo el dossier; la pone su profe o el admin.
create policy "ver valoracion final" on public.valoraciones_finales for select to authenticated
  using (public.puede_ver_dossier(dossier_id));
create policy "crear valoracion final" on public.valoraciones_finales for insert to authenticated
  with check (public.gestiona_dossier(dossier_id) and valorada_por = (select auth.uid()));
create policy "cambiar valoracion final" on public.valoraciones_finales for update to authenticated
  using (public.gestiona_dossier(dossier_id))
  with check (public.gestiona_dossier(dossier_id) and valorada_por = (select auth.uid()));
create policy "borrar valoracion final" on public.valoraciones_finales for delete to authenticated
  using (public.gestiona_dossier(dossier_id));

-- Tareas: las ven los participantes; las crea su profe; el alumno solo las marca (ver trigger).
create policy "ver tareas" on public.tareas for select to authenticated
  using (public.puede_ver_dossier(dossier_id));
create policy "crear tareas" on public.tareas for insert to authenticated
  with check (public.gestiona_dossier(dossier_id));
create policy "cambiar tareas" on public.tareas for update to authenticated
  using (public.gestiona_dossier(dossier_id) or public.es_alumno_de(dossier_id))
  with check (public.gestiona_dossier(dossier_id) or public.es_alumno_de(dossier_id));
create policy "borrar tareas" on public.tareas for delete to authenticated
  using (public.gestiona_dossier(dossier_id));

-- Eventos: los generales los ve todo el mundo y los pone el admin; los de un dossier, su profe.
create policy "ver eventos" on public.eventos for select to authenticated
  using (dossier_id is null or public.puede_ver_dossier(dossier_id));
create policy "crear eventos" on public.eventos for insert to authenticated
  with check (public.es_admin() or (dossier_id is not null and public.es_tutor_de(dossier_id)));
create policy "cambiar eventos" on public.eventos for update to authenticated
  using (public.es_admin() or (dossier_id is not null and public.es_tutor_de(dossier_id)))
  with check (public.es_admin() or (dossier_id is not null and public.es_tutor_de(dossier_id)));
create policy "borrar eventos" on public.eventos for delete to authenticated
  using (public.es_admin() or (dossier_id is not null and public.es_tutor_de(dossier_id)));

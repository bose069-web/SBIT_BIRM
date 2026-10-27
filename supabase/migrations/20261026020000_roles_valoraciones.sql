-- Roles y valoraciones como en el SBIT. Transforma el esquema ya aplicado sin perder datos.
--
--   alumno  → apunta cada día lo que ha hecho y las horas.
--   empresa → tutor de la empresa: valora cada mes el trabajo del alumno.
--   profe   → tutor del centro y administrador: lo ve y lo gestiona todo y pone la valoración final.
--
-- Ya no se valida día a día: la valoración mensual de la empresa cierra ese mes para el alumno.

-- 1. Fuera las políticas y funciones antiguas (se recrean al final) ---------
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

-- 2. Roles: alumno, empresa y profe. Los admin pasan a ser profe -------------
alter table public.perfiles alter column rol drop default;
alter table public.perfiles alter column rol type text using rol::text;
drop type public.rol;
create type public.rol as enum ('alumno', 'empresa', 'profe');
update public.perfiles set rol = 'profe' where rol = 'admin';
alter table public.perfiles alter column rol type public.rol using rol::public.rol;
alter table public.perfiles alter column rol set default 'alumno';

create function public.rol_actual() returns public.rol
language sql stable security definer set search_path = '' as $$
  select rol from public.perfiles where id = auth.uid()
$$;

create function public.es_profe() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select rol = 'profe' from public.perfiles where id = auth.uid()), false)
$$;

-- 3. Tutor de empresa en el dossier y comprobación de roles ------------------
alter table public.dossiers
  add column tutor_empresa_id uuid references public.perfiles (id) on delete set null;
create index on public.dossiers (tutor_empresa_id);

create function public.comprobar_roles_dossier() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select rol from public.perfiles where id = new.alumno_id) is distinct from 'alumno' then
    raise exception 'El alumno del dossier debe tener rol alumno';
  end if;
  if new.tutor_id is not null
     and (select rol from public.perfiles where id = new.tutor_id) is distinct from 'profe' then
    raise exception 'El tutor del centro debe tener rol profe';
  end if;
  if new.tutor_empresa_id is not null
     and (select rol from public.perfiles where id = new.tutor_empresa_id) is distinct from 'empresa' then
    raise exception 'El tutor de empresa debe tener rol empresa';
  end if;
  return new;
end $$;

create trigger roles_dossier before insert or update on public.dossiers
for each row execute function public.comprobar_roles_dossier();

-- 4. Registro diario sin validación por día ----------------------------------
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

-- 5. Valoraciones ------------------------------------------------------------
-- Mensual: la pone el tutor de empresa (o el profe). `mes` es siempre el día 1 del mes.
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

-- Final: la pone el profe al acabar las prácticas. Una por dossier.
create table public.valoraciones_finales (
  dossier_id uuid primary key references public.dossiers (id) on delete cascade,
  resultado public.resultado_final not null,
  comentario text,
  valorada_por uuid not null references public.perfiles (id),
  valorada_en timestamptz not null default now()
);

alter table public.valoraciones_mensuales enable row level security;
alter table public.valoraciones_finales enable row level security;

-- 6. Tareas: el alumno solo puede marcarlas como hechas ----------------------
create function public.proteger_tarea() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not public.es_profe() and (
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

-- 7. Funciones de acceso ------------------------------------------------------
create or replace function public.es_alumno_de(d uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.dossiers where id = d and alumno_id = auth.uid())
$$;

create function public.es_empresa_de(d uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.dossiers where id = d and tutor_empresa_id = auth.uid())
$$;

-- Ven un dossier su alumno, su tutor de empresa y cualquier profe.
create or replace function public.puede_ver_dossier(d uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.es_profe() or public.es_alumno_de(d) or public.es_empresa_de(d)
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

-- 8. Políticas (RLS) ----------------------------------------------------------
-- Perfiles: cada uno ve el suyo y los de las personas de sus dossiers; el profe ve y gestiona todos.
create policy "ver perfiles" on public.perfiles for select to authenticated using (
  id = auth.uid() or public.es_profe()
  or exists (
    select 1 from public.dossiers d
    where (d.alumno_id = auth.uid() or d.tutor_empresa_id = auth.uid())
      and perfiles.id in (d.alumno_id, d.tutor_id, d.tutor_empresa_id)
  )
);
create policy "profe gestiona perfiles" on public.perfiles for all to authenticated
  using (public.es_profe()) with check (public.es_profe());

-- Centros y empresas: lectura para todos los autenticados, escritura solo profe.
create policy "leer centros" on public.centros for select to authenticated using (true);
create policy "profe centros" on public.centros for all to authenticated
  using (public.es_profe()) with check (public.es_profe());
create policy "leer empresas" on public.empresas for select to authenticated using (true);
create policy "profe empresas" on public.empresas for all to authenticated
  using (public.es_profe()) with check (public.es_profe());

-- Dossiers y actividades: los ven sus participantes; solo el profe los crea o cambia.
create policy "ver dossiers" on public.dossiers for select to authenticated
  using (public.puede_ver_dossier(id));
create policy "profe dossiers" on public.dossiers for all to authenticated
  using (public.es_profe()) with check (public.es_profe());

create policy "ver actividades" on public.actividades_formativas for select to authenticated
  using (public.puede_ver_dossier(dossier_id));
create policy "profe actividades" on public.actividades_formativas for all to authenticated
  using (public.es_profe()) with check (public.es_profe());

-- Registros: el alumno gestiona los suyos mientras el mes no esté valorado; el profe, todos.
create policy "ver registros" on public.registros_diarios for select to authenticated
  using (public.puede_ver_dossier(dossier_id));
create policy "alumno gestiona registros" on public.registros_diarios for all to authenticated
  using (public.es_alumno_de(dossier_id) and not public.mes_cerrado(dossier_id, fecha))
  with check (public.es_alumno_de(dossier_id) and not public.mes_cerrado(dossier_id, fecha));
create policy "profe registros" on public.registros_diarios for all to authenticated
  using (public.es_profe()) with check (public.es_profe());

-- Horas por actividad: siguen los permisos de su registro.
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
create policy "profe horas" on public.horas_actividad for all to authenticated
  using (public.es_profe()) with check (public.es_profe());

-- Valoración mensual: la ve todo el dossier; la pone su tutor de empresa hasta la valoración final.
create policy "ver valoraciones mensuales" on public.valoraciones_mensuales for select to authenticated
  using (public.puede_ver_dossier(dossier_id));
create policy "empresa valora el mes" on public.valoraciones_mensuales for all to authenticated
  using (public.es_empresa_de(dossier_id) and not public.tiene_valoracion_final(dossier_id))
  with check (
    public.es_empresa_de(dossier_id) and not public.tiene_valoracion_final(dossier_id)
    and valorada_por = auth.uid()
  );
create policy "profe valoraciones mensuales" on public.valoraciones_mensuales for all to authenticated
  using (public.es_profe()) with check (public.es_profe() and valorada_por = auth.uid());

-- Valoración final: la ve todo el dossier; solo la pone el profe.
create policy "ver valoracion final" on public.valoraciones_finales for select to authenticated
  using (public.puede_ver_dossier(dossier_id));
create policy "profe valoracion final" on public.valoraciones_finales for all to authenticated
  using (public.es_profe()) with check (public.es_profe() and valorada_por = auth.uid());

-- Tareas: las ven los participantes; las crea el profe; el alumno solo las marca (ver trigger).
create policy "ver tareas" on public.tareas for select to authenticated
  using (public.puede_ver_dossier(dossier_id));
create policy "profe tareas" on public.tareas for all to authenticated
  using (public.es_profe()) with check (public.es_profe());
create policy "alumno completa tareas" on public.tareas for update to authenticated
  using (public.es_alumno_de(dossier_id)) with check (public.es_alumno_de(dossier_id));

-- Eventos: los generales los ve todo el mundo; los gestiona el profe.
create policy "ver eventos" on public.eventos for select to authenticated
  using (dossier_id is null or public.puede_ver_dossier(dossier_id));
create policy "profe eventos" on public.eventos for all to authenticated
  using (public.es_profe()) with check (public.es_profe());

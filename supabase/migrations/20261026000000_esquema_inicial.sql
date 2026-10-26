-- Kampus · esquema inicial del MVP (dossier, registro diario, valoraciones, tareas, calendario).
-- Cada usuario de auth.users tiene un perfil con su rol. Los permisos se basan en ese rol (RLS).
--
-- Roles (como en el SBIT):
--   alumno  → apunta cada día lo que ha hecho y las horas.
--   empresa → tutor de la empresa: valora cada mes el trabajo del alumno.
--   profe   → tutor del centro y administrador: lo ve y lo gestiona todo y pone la valoración final.

create type public.rol as enum ('alumno', 'empresa', 'profe');
create type public.tipo_dia as enum ('trabajo', 'ausencia', 'festivo');
create type public.valoracion_mes as enum ('positiva', 'mejorable', 'negativa');
create type public.resultado_final as enum ('apto', 'no_apto');

-- Perfiles ------------------------------------------------------------------
create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null,
  email text not null unique,
  rol public.rol not null default 'alumno',
  creado_en timestamptz not null default now()
);

-- Funciones de apoyo (security definer para que las políticas no se llamen a sí mismas).
create function public.rol_actual() returns public.rol
language sql stable security definer set search_path = '' as $$
  select rol from public.perfiles where id = auth.uid()
$$;

create function public.es_profe() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select rol = 'profe' from public.perfiles where id = auth.uid()), false)
$$;

-- Crea el perfil al registrarse. El rol nunca sale del cliente: siempre empieza como alumno.
create function public.crear_perfil() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfiles (id, nombre, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nombre', new.email), new.email);
  return new;
end $$;

create trigger al_crear_usuario after insert on auth.users
for each row execute function public.crear_perfil();

-- Centros y empresas ---------------------------------------------------------
create table public.centros (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  codigo text unique
);

create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  cif text unique,
  direccion text
);

-- Dossier: el acuerdo de prácticas de un alumno con una empresa ---------------
create table public.dossiers (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references public.perfiles (id) on delete cascade,
  tutor_id uuid references public.perfiles (id) on delete set null,          -- profe tutor del centro
  tutor_empresa_id uuid references public.perfiles (id) on delete set null,  -- tutor de la empresa
  centro_id uuid references public.centros (id),
  empresa_id uuid references public.empresas (id),
  ciclo text not null,
  fecha_inicio date not null,
  fecha_fin date not null,
  horas_totales int not null check (horas_totales > 0),
  creado_en timestamptz not null default now(),
  check (fecha_fin >= fecha_inicio)
);
create index on public.dossiers (alumno_id);
create index on public.dossiers (tutor_id);
create index on public.dossiers (tutor_empresa_id);

-- Cada persona del dossier tiene que tener el rol que le toca.
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

create table public.actividades_formativas (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.dossiers (id) on delete cascade,
  descripcion text not null,
  orden int not null default 0,
  unique (id, dossier_id) -- para que las horas solo apunten a actividades de su propio dossier
);
create index on public.actividades_formativas (dossier_id);

-- Registro diario: un día del alumno, con horas repartidas por actividad -----
-- No se valida día a día: la empresa valora el mes entero y eso lo cierra.
create table public.registros_diarios (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.dossiers (id) on delete cascade,
  fecha date not null,
  tipo public.tipo_dia not null default 'trabajo',
  observaciones text,
  creado_en timestamptz not null default now(),
  unique (dossier_id, fecha),
  unique (id, dossier_id)
);

create table public.horas_actividad (
  registro_id uuid not null,
  actividad_id uuid not null,
  dossier_id uuid not null,
  horas numeric(4, 2) not null check (horas > 0 and horas <= 24),
  primary key (registro_id, actividad_id),
  foreign key (registro_id, dossier_id)
    references public.registros_diarios (id, dossier_id) on delete cascade,
  foreign key (actividad_id, dossier_id)
    references public.actividades_formativas (id, dossier_id) on delete cascade
);

-- Valoraciones ---------------------------------------------------------------
-- Mensual: la pone el tutor de empresa (o el profe). `mes` es siempre el día 1 del mes.
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

-- Tareas y eventos del calendario --------------------------------------------
create table public.tareas (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.dossiers (id) on delete cascade,
  titulo text not null,
  descripcion text,
  fecha_limite date,
  completada boolean not null default false,
  creada_por uuid references public.perfiles (id)
);
create index on public.tareas (dossier_id);

-- El alumno solo puede marcar una tarea como hecha o no; el resto lo cambia el profe.
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

create table public.eventos (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid references public.dossiers (id) on delete cascade, -- null = evento general
  titulo text not null,
  fecha date not null,
  tipo text not null default 'evento'
);

-- Acceso a un dossier: su alumno, su tutor de empresa o cualquier profe -------
create function public.es_alumno_de(d uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.dossiers where id = d and alumno_id = auth.uid())
$$;

create function public.es_empresa_de(d uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.dossiers where id = d and tutor_empresa_id = auth.uid())
$$;

create function public.puede_ver_dossier(d uuid) returns boolean
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

-- RLS ------------------------------------------------------------------------
alter table public.perfiles enable row level security;
alter table public.centros enable row level security;
alter table public.empresas enable row level security;
alter table public.dossiers enable row level security;
alter table public.actividades_formativas enable row level security;
alter table public.registros_diarios enable row level security;
alter table public.horas_actividad enable row level security;
alter table public.valoraciones_mensuales enable row level security;
alter table public.valoraciones_finales enable row level security;
alter table public.tareas enable row level security;
alter table public.eventos enable row level security;

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

-- Registros: el alumno gestiona los suyos mientras el mes no esté valorado.
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

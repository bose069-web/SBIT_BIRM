-- Kampus · esquema inicial del MVP (dossier, registro diario, validación, tareas, calendario).
-- Cada usuario de auth.users tiene un perfil con su rol. Los permisos se basan en ese rol (RLS).

create type public.rol as enum ('alumno', 'profe', 'admin');
create type public.estado_registro as enum ('pendiente', 'validado', 'rechazado');
create type public.tipo_dia as enum ('trabajo', 'ausencia', 'festivo');

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

create function public.es_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select rol = 'admin' from public.perfiles where id = auth.uid()), false)
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
  tutor_id uuid references public.perfiles (id) on delete set null,
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

create table public.actividades_formativas (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.dossiers (id) on delete cascade,
  descripcion text not null,
  orden int not null default 0
);
create index on public.actividades_formativas (dossier_id);

-- Registro diario: un día del alumno, con horas repartidas por actividad -----
create table public.registros_diarios (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.dossiers (id) on delete cascade,
  fecha date not null,
  tipo public.tipo_dia not null default 'trabajo',
  observaciones text,
  estado public.estado_registro not null default 'pendiente',
  comentario_tutor text,
  validado_por uuid references public.perfiles (id),
  validado_en timestamptz,
  unique (dossier_id, fecha)
);

create table public.horas_actividad (
  registro_id uuid not null references public.registros_diarios (id) on delete cascade,
  actividad_id uuid not null references public.actividades_formativas (id) on delete cascade,
  horas numeric(4, 2) not null check (horas > 0 and horas <= 24),
  primary key (registro_id, actividad_id)
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

create table public.eventos (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid references public.dossiers (id) on delete cascade, -- null = evento general
  titulo text not null,
  fecha date not null,
  tipo text not null default 'evento'
);

-- Acceso a un dossier: su alumno, su tutor o un admin -------------------------
create function public.puede_ver_dossier(d uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.dossiers
    where id = d and (alumno_id = auth.uid() or tutor_id = auth.uid())
  ) or public.es_admin()
$$;

create function public.es_tutor_de(d uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.dossiers where id = d and tutor_id = auth.uid())
$$;

create function public.es_alumno_de(d uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.dossiers where id = d and alumno_id = auth.uid())
$$;

-- RLS ------------------------------------------------------------------------
alter table public.perfiles enable row level security;
alter table public.centros enable row level security;
alter table public.empresas enable row level security;
alter table public.dossiers enable row level security;
alter table public.actividades_formativas enable row level security;
alter table public.registros_diarios enable row level security;
alter table public.horas_actividad enable row level security;
alter table public.tareas enable row level security;
alter table public.eventos enable row level security;

-- Perfiles: cada uno ve el suyo; el profe ve a sus alumnos; el admin todo.
create policy "ver perfiles" on public.perfiles for select to authenticated using (
  id = auth.uid() or public.es_admin()
  or exists (select 1 from public.dossiers where alumno_id = perfiles.id and tutor_id = auth.uid())
  or exists (select 1 from public.dossiers where tutor_id = perfiles.id and alumno_id = auth.uid())
);
create policy "admin gestiona perfiles" on public.perfiles for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- Centros y empresas: lectura para todos los autenticados, escritura solo admin.
create policy "leer centros" on public.centros for select to authenticated using (true);
create policy "admin centros" on public.centros for all to authenticated
  using (public.es_admin()) with check (public.es_admin());
create policy "leer empresas" on public.empresas for select to authenticated using (true);
create policy "admin empresas" on public.empresas for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- Dossiers: los ven sus participantes; solo el admin los crea o cambia.
create policy "ver dossiers" on public.dossiers for select to authenticated
  using (public.puede_ver_dossier(id));
create policy "admin dossiers" on public.dossiers for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- Actividades: las ven los participantes; las gestiona el tutor o el admin.
create policy "ver actividades" on public.actividades_formativas for select to authenticated
  using (public.puede_ver_dossier(dossier_id));
create policy "tutor gestiona actividades" on public.actividades_formativas for all to authenticated
  using (public.es_tutor_de(dossier_id) or public.es_admin())
  with check (public.es_tutor_de(dossier_id) or public.es_admin());

-- Registros: el alumno crea y edita los suyos mientras no estén validados.
create policy "ver registros" on public.registros_diarios for select to authenticated
  using (public.puede_ver_dossier(dossier_id));
create policy "alumno crea registros" on public.registros_diarios for insert to authenticated
  with check (public.es_alumno_de(dossier_id) and estado = 'pendiente' and validado_por is null);
create policy "alumno edita pendientes" on public.registros_diarios for update to authenticated
  using (public.es_alumno_de(dossier_id) and estado <> 'validado')
  with check (public.es_alumno_de(dossier_id) and estado = 'pendiente' and validado_por is null);
create policy "alumno borra pendientes" on public.registros_diarios for delete to authenticated
  using (public.es_alumno_de(dossier_id) and estado = 'pendiente');
-- El tutor valida o rechaza.
create policy "tutor valida" on public.registros_diarios for update to authenticated
  using (public.es_tutor_de(dossier_id) or public.es_admin())
  with check (public.es_tutor_de(dossier_id) or public.es_admin());

-- Horas por actividad: siguen los permisos de su registro.
create policy "ver horas" on public.horas_actividad for select to authenticated using (
  exists (select 1 from public.registros_diarios r where r.id = registro_id and public.puede_ver_dossier(r.dossier_id))
);
create policy "alumno gestiona horas" on public.horas_actividad for all to authenticated
using (
  exists (select 1 from public.registros_diarios r
          where r.id = registro_id and public.es_alumno_de(r.dossier_id) and r.estado = 'pendiente')
) with check (
  exists (select 1 from public.registros_diarios r
          where r.id = registro_id and public.es_alumno_de(r.dossier_id) and r.estado = 'pendiente')
);

-- Tareas: las ven los participantes; las crea el tutor; el alumno las marca como hechas.
create policy "ver tareas" on public.tareas for select to authenticated
  using (public.puede_ver_dossier(dossier_id));
create policy "tutor gestiona tareas" on public.tareas for all to authenticated
  using (public.es_tutor_de(dossier_id) or public.es_admin())
  with check (public.es_tutor_de(dossier_id) or public.es_admin());
create policy "alumno completa tareas" on public.tareas for update to authenticated
  using (public.es_alumno_de(dossier_id)) with check (public.es_alumno_de(dossier_id));

-- Eventos: los generales los ve todo el mundo.
create policy "ver eventos" on public.eventos for select to authenticated
  using (dossier_id is null or public.puede_ver_dossier(dossier_id));
create policy "gestionar eventos" on public.eventos for all to authenticated
  using (public.es_admin() or (dossier_id is not null and public.es_tutor_de(dossier_id)))
  with check (public.es_admin() or (dossier_id is not null and public.es_tutor_de(dossier_id)));

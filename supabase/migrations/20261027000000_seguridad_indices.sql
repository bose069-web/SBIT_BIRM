-- Seguridad e índices para que la base aguante cuando haya muchos centros, alumnos y días.

-- 1. Funciones: nadie sin sesión puede llamarlas por la API (/rest/v1/rpc/...) ------------
-- Las de permisos las sigue necesitando `authenticated`, porque las usan las políticas RLS.
revoke execute on all functions in schema public from public, anon;

-- Las de los triggers no las llama nadie directamente: Postgres las ejecuta solo.
revoke execute on function public.crear_perfil() from authenticated;
revoke execute on function public.proteger_perfil() from authenticated;
revoke execute on function public.preparar_dossier() from authenticated;
revoke execute on function public.sincronizar_tutor() from authenticated;
revoke execute on function public.proteger_tarea() from authenticated;

-- rls_auto_enable la crea la plataforma de Supabase (activa RLS en tablas nuevas); en local puede no existir.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from authenticated;
  end if;
end $$;

-- Las funciones que se creen a partir de ahora tampoco serán públicas por defecto.
alter default privileges in schema public revoke execute on functions from public, anon;

-- 2. Índices de las claves foráneas (joins y borrados en cascada rápidos) ----------------
create index if not exists dossiers_centro_id_idx on public.dossiers (centro_id);
create index if not exists dossiers_empresa_id_idx on public.dossiers (empresa_id);
create index if not exists eventos_dossier_id_idx on public.eventos (dossier_id);
create index if not exists tareas_creada_por_idx on public.tareas (creada_por);
create index if not exists horas_actividad_registro_dossier_idx
  on public.horas_actividad (registro_id, dossier_id);
create index if not exists horas_actividad_actividad_dossier_idx
  on public.horas_actividad (actividad_id, dossier_id);
create index if not exists valoraciones_mensuales_valorada_por_idx
  on public.valoraciones_mensuales (valorada_por);
create index if not exists valoraciones_finales_valorada_por_idx
  on public.valoraciones_finales (valorada_por);

-- Arreglos que señala el asesor de Supabase (Database Advisors) a 2026-11-02.

-- 1. Funciones SECURITY DEFINER que se podían llamar sin iniciar sesión (rol anon) por
--    /rest/v1/rpc. Las de comprobación las siguen usando las políticas con sesión, así que se
--    quitan solo a anon; las de trigger no tiene que llamarlas nadie directamente.
revoke execute on function public.comparten_dossier(uuid, uuid) from public, anon;
grant execute on function public.comparten_dossier(uuid, uuid) to authenticated;
revoke execute on function public.gestiona_alumno(uuid) from public, anon;
grant execute on function public.gestiona_alumno(uuid) to authenticated;

revoke execute on function public.preparar_incidencia() from public, anon, authenticated;
revoke execute on function public.preparar_mensaje_incidencia() from public, anon, authenticated;
revoke execute on function public.proteger_incidencia() from public, anon, authenticated;

-- rls_auto_enable es un trigger de eventos de Supabase: tampoco lo llama nadie por la API.
do $$
begin
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable'
  ) then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;

-- 2. Claves foráneas sin índice que las cubra (las consultas y los borrados en cascada las
--    recorren enteras).
create index if not exists chat_lecturas_otro_id_idx on public.chat_lecturas (otro_id);
create index if not exists dossiers_centro_id_empresa_id_idx
  on public.dossiers (centro_id, empresa_id);
create index if not exists horas_actividad_actividad_id_dossier_id_idx
  on public.horas_actividad (actividad_id, dossier_id);
create index if not exists horas_actividad_registro_id_dossier_id_idx
  on public.horas_actividad (registro_id, dossier_id);

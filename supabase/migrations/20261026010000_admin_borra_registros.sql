-- El admin puede borrar cualquier día (correcciones y limpieza de datos de prueba).
create policy "admin borra registros" on public.registros_diarios for delete to authenticated
  using (public.es_admin());
create policy "admin gestiona horas" on public.horas_actividad for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- Limpieza del día de prueba creado al verificar los adaptadores.
delete from public.registros_diarios
where dossier_id = 'cccccccc-0000-0000-0000-000000000001' and fecha = '2026-10-20';

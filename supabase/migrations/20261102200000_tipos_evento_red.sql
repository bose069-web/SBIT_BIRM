-- Dos tipos nuevos de fecha para el calendario de la generalitat:
--   plazo → plazos administrativos de la red (entrega de documentación, convenios, actas);
--   curso → calendario del curso de prácticas (inicio, fin, evaluaciones).
-- Hasta ahora `tipo` era texto libre; se limita a los tipos que entiende la app.

update public.eventos set tipo = 'evento'
where tipo not in ('evento', 'entrega', 'reunion', 'festivo', 'plazo', 'curso');

alter table public.eventos
  add constraint eventos_tipo_valido
    check (tipo in ('evento', 'entrega', 'reunion', 'festivo', 'plazo', 'curso'));

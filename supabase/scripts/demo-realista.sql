-- Datos de demostración con personas, centros y empresas inventados, para que la web enseñe
-- algo parecido al uso real. No toca las cuentas *@kampus.test que ya existen.
--   npx supabase db query --linked -f supabase/scripts/demo-realista.sql
-- (o pegarlo en el editor SQL del panel de Supabase). Se puede ejecutar varias veces: los ids
-- son fijos y lo que ya existe no se duplica. Contraseña de todas las cuentas: kampus

begin;

-- Id fijo a partir de un nombre: el mismo en cada ejecución.
create or replace function pg_temp.uid(clave text) returns uuid
language sql immutable as $$ select md5('kampus-demo-' || clave)::uuid $$;

create or replace function pg_temp.cuenta(clave text, email text, nombre text) returns void
language sql as $$
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token,
    recovery_token, email_change, email_change_token_new)
  values ('00000000-0000-0000-0000-000000000000', pg_temp.uid(clave), 'authenticated',
    'authenticated', email, extensions.crypt('kampus', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', jsonb_build_object('nombre', nombre), now(), now(),
    '', '', '', '')
  on conflict (id) do nothing;
  -- Sin esta fila no se puede entrar con correo y contraseña.
  insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at,
    created_at, updated_at)
  values (gen_random_uuid(), pg_temp.uid(clave), pg_temp.uid(clave)::text, 'email',
    jsonb_build_object('sub', pg_temp.uid(clave)::text, 'email', email, 'email_verified', true),
    now(), now(), now())
  on conflict (provider_id, provider) do nothing;
$$;

-- Centros, empresas y convenios ----------------------------------------------------------------

insert into public.centros (id, nombre, codigo) values
  (pg_temp.uid('centro-ribera'), 'Institut Ribera del Ter', '08099001'),
  (pg_temp.uid('centro-turo'), 'Institut Turó Blau', '08099002')
on conflict (id) do nothing;

insert into public.empresas (id, nombre, cif, direccion) values
  (pg_temp.uid('empresa-nubol'), 'Núbol Software SL', 'B99000001', 'Carrer de la Indústria 12, Girona'),
  (pg_temp.uid('empresa-pixel'), 'Píxel Mediterrani SL', 'B99000002', 'Avinguda del Port 45, Badalona'),
  (pg_temp.uid('empresa-xarxa'), 'Xarxa Serveis Informàtics SA', 'A99000003', 'Rambla Nova 8, Vic')
on conflict (id) do nothing;

insert into public.convenios (centro_id, empresa_id, firmado_en) values
  (pg_temp.uid('centro-ribera'), pg_temp.uid('empresa-nubol'), '2026-06-15'),
  (pg_temp.uid('centro-ribera'), pg_temp.uid('empresa-xarxa'), '2026-06-20'),
  (pg_temp.uid('centro-turo'), pg_temp.uid('empresa-pixel'), '2026-07-01'),
  (pg_temp.uid('centro-turo'), pg_temp.uid('empresa-nubol'), '2026-07-03')
on conflict do nothing;

-- Cuentas ----------------------------------------------------------------------------------------

select pg_temp.cuenta(clave, email, nombre) from (values
  ('instituto-ribera', 'direccio@ribera.kampus.test', 'Montse Puig (direcció)'),
  ('instituto-turo', 'direccio@turoblau.kampus.test', 'Jordi Serra (direcció)'),
  ('profe-marta', 'marta.vidal@ribera.kampus.test', 'Marta Vidal'),
  ('profe-pau', 'pau.ferrer@ribera.kampus.test', 'Pau Ferrer'),
  ('profe-nuria', 'nuria.soler@turoblau.kampus.test', 'Núria Soler'),
  ('empresa-anna', 'anna.roca@nubol.kampus.test', 'Anna Roca'),
  ('empresa-david', 'david.marti@pixel.kampus.test', 'David Martí'),
  ('empresa-carla', 'carla.bosch@xarxa.kampus.test', 'Carla Bosch'),
  ('alumno-joan', 'joan.eric@alumnes.kampus.test', 'Joan Eric Garcia'),
  ('alumno-laura', 'laura.sanchez@alumnes.kampus.test', 'Laura Sánchez'),
  ('alumno-marc', 'marc.lopez@alumnes.kampus.test', 'Marc López'),
  ('alumno-aina', 'aina.font@alumnes.kampus.test', 'Aina Font'),
  ('alumno-pol', 'pol.riera@alumnes.kampus.test', 'Pol Riera'),
  ('alumno-julia', 'julia.camps@alumnes.kampus.test', 'Júlia Camps'),
  ('alumno-oriol', 'oriol.mas@alumnes.kampus.test', 'Oriol Mas'),
  ('alumno-ona', 'ona.prat@alumnes.kampus.test', 'Ona Prat')
) as c(clave, email, nombre);

-- Rol y centro o empresa; el profe asignado va después, cuando los profes ya son del centro.
update public.perfiles p set rol = v.rol::public.rol, centro_id = v.centro, empresa_id = v.empresa
from (values
  ('instituto-ribera', 'instituto', pg_temp.uid('centro-ribera'), null::uuid),
  ('instituto-turo', 'instituto', pg_temp.uid('centro-turo'), null),
  ('profe-marta', 'profe', pg_temp.uid('centro-ribera'), null),
  ('profe-pau', 'profe', pg_temp.uid('centro-ribera'), null),
  ('profe-nuria', 'profe', pg_temp.uid('centro-turo'), null),
  ('empresa-anna', 'empresa', null, pg_temp.uid('empresa-nubol')),
  ('empresa-david', 'empresa', null, pg_temp.uid('empresa-pixel')),
  ('empresa-carla', 'empresa', null, pg_temp.uid('empresa-xarxa')),
  ('alumno-joan', 'alumno', pg_temp.uid('centro-ribera'), null),
  ('alumno-laura', 'alumno', pg_temp.uid('centro-ribera'), null),
  ('alumno-marc', 'alumno', pg_temp.uid('centro-ribera'), null),
  ('alumno-aina', 'alumno', pg_temp.uid('centro-ribera'), null),
  ('alumno-pol', 'alumno', pg_temp.uid('centro-ribera'), null),
  ('alumno-julia', 'alumno', pg_temp.uid('centro-turo'), null),
  ('alumno-oriol', 'alumno', pg_temp.uid('centro-turo'), null),
  ('alumno-ona', 'alumno', pg_temp.uid('centro-turo'), null)
) as v(clave, rol, centro, empresa)
where p.id = pg_temp.uid(v.clave);

-- Dossiers: alumno, profe, tutor de empresa, empresa, ciclo y horas -----------------------------

create temp table demo_dossier (alumno text, profe text, tutor text, empresa text, ciclo text,
  inicio date, fin date, horas int, ritmo numeric) on commit drop;
insert into demo_dossier values
  ('joan', 'marta', 'anna', 'nubol', 'DAM', '2026-09-15', '2027-03-15', 400, 6),
  ('laura', 'marta', 'anna', 'nubol', 'DAW', '2026-09-15', '2027-03-15', 400, 7),
  ('marc', 'marta', 'carla', 'xarxa', 'SMX', '2026-09-22', '2027-02-26', 380, 6),
  ('aina', 'pau', 'carla', 'xarxa', 'ASIX', '2026-09-15', '2027-03-15', 400, 7),
  ('pol', 'pau', 'anna', 'nubol', 'DAM', '2026-10-01', '2027-03-31', 400, 5),
  ('julia', 'nuria', 'david', 'pixel', 'DAW', '2026-09-15', '2027-03-15', 400, 6),
  ('oriol', 'nuria', 'david', 'pixel', 'DAM', '2026-09-15', '2027-03-15', 400, 6),
  ('ona', 'nuria', 'anna', 'nubol', 'ASIX', '2026-09-29', '2027-03-26', 380, 6);

update public.perfiles p set profe_id = pg_temp.uid('profe-' || d.profe)
from demo_dossier d where p.id = pg_temp.uid('alumno-' || d.alumno);

insert into public.dossiers (id, alumno_id, tutor_id, tutor_empresa_id, centro_id, empresa_id, ciclo,
  fecha_inicio, fecha_fin, horas_totales)
select pg_temp.uid('dossier-' || d.alumno), pg_temp.uid('alumno-' || d.alumno),
  pg_temp.uid('profe-' || d.profe), pg_temp.uid('empresa-' || d.tutor),
  p.centro_id, pg_temp.uid('empresa-' || d.empresa), d.ciclo, d.inicio, d.fin, d.horas
from demo_dossier d join public.perfiles p on p.id = pg_temp.uid('alumno-' || d.alumno)
on conflict (id) do nothing;

-- Actividades formativas según el ciclo ---------------------------------------------------------

insert into public.actividades_formativas (id, dossier_id, descripcion, orden)
select pg_temp.uid('actividad-' || d.alumno || '-' || a.orden), pg_temp.uid('dossier-' || d.alumno),
  a.descripcion, a.orden
from demo_dossier d
join (values
  ('DAM', 1, 'Desarrollo de interfaces'), ('DAM', 2, 'Acceso a datos'),
  ('DAM', 3, 'Pruebas y documentación'),
  ('DAW', 1, 'Maquetación web'), ('DAW', 2, 'Desarrollo en servidor'),
  ('DAW', 3, 'Despliegue de aplicaciones'),
  ('SMX', 1, 'Montaje y mantenimiento de equipos'), ('SMX', 2, 'Atención a usuarios'),
  ('SMX', 3, 'Redes locales'),
  ('ASIX', 1, 'Administración de sistemas'), ('ASIX', 2, 'Seguridad y copias'),
  ('ASIX', 3, 'Monitorización de servicios')
) as a(ciclo, orden, descripcion) on a.ciclo = d.ciclo
on conflict (id) do nothing;

-- Días fichados: cada día laborable desde el inicio hasta ayer ----------------------------------

-- 12 de octubre es festivo; de vez en cuando, una ausencia con su motivo.
insert into public.registros_diarios (id, dossier_id, fecha, tipo, observaciones)
select pg_temp.uid('registro-' || d.alumno || '-' || f::date), pg_temp.uid('dossier-' || d.alumno),
  f::date,
  case when f::date = '2026-10-12' then 'festivo'
       when abs(hashtext(d.alumno || f::date)) % 23 = 0 then 'ausencia'
       else 'trabajo' end::public.tipo_dia,
  case when f::date = '2026-10-12' then 'Fiesta nacional'
       when abs(hashtext(d.alumno || f::date)) % 23 = 0 then 'Visita médica'
       when abs(hashtext(d.alumno || f::date)) % 5 = 0 then 'Reunión de seguimiento con el equipo'
  end
from demo_dossier d,
  generate_series(d.inicio, least(current_date - 1, d.fin), interval '1 day') f
where extract(isodow from f) < 6
on conflict (dossier_id, fecha) do nothing;

-- Las horas del día se reparten entre dos actividades que van cambiando.
insert into public.horas_actividad (registro_id, actividad_id, dossier_id, horas)
select r.id, pg_temp.uid('actividad-' || d.alumno || '-' || x.orden), r.dossier_id, x.horas
from public.registros_diarios r
join demo_dossier d on r.dossier_id = pg_temp.uid('dossier-' || d.alumno)
cross join lateral (values
  (1 + (extract(doy from r.fecha)::int % 3), d.ritmo - 2),
  (1 + ((extract(doy from r.fecha)::int + 1) % 3), 2::numeric)
) as x(orden, horas)
where r.tipo = 'trabajo'
on conflict do nothing;

-- Valoración de septiembre de la empresa ---------------------------------------------------------

insert into public.valoraciones_mensuales (dossier_id, mes, valoracion, comentario, valorada_por)
select pg_temp.uid('dossier-' || d.alumno), '2026-09-01', v.valoracion::public.valoracion_mes,
  v.comentario, pg_temp.uid('empresa-' || d.tutor)
from demo_dossier d
join (values
  ('joan', 'positiva', 'Muy buen arranque: autónomo y con ganas de aprender.'),
  ('laura', 'positiva', 'Se ha integrado rápido en el equipo de front.'),
  ('marc', 'mejorable', 'Debe mejorar la puntualidad; técnicamente va bien.'),
  ('aina', 'positiva', 'Resuelve incidencias con criterio y documenta bien.'),
  ('julia', 'positiva', 'Buen trabajo con el diseño de las landing pages.'),
  ('oriol', 'mejorable', 'Le cuesta pedir ayuda cuando se bloquea.')
) as v(alumno, valoracion, comentario) on v.alumno = d.alumno
where not exists (select 1 from public.valoraciones_mensuales m
  where m.dossier_id = pg_temp.uid('dossier-' || d.alumno) and m.mes = '2026-09-01');

-- Tareas que el profe asigna a cada alumno -------------------------------------------------------

insert into public.tareas (id, dossier_id, titulo, descripcion, fecha_limite, completada, creada_por)
select pg_temp.uid('tarea-' || d.alumno || '-' || t.n), pg_temp.uid('dossier-' || d.alumno),
  t.titulo, t.descripcion, t.limite, t.limite < current_date,
  pg_temp.uid('profe-' || d.profe)
from demo_dossier d
cross join (values
  (1, 'Plan de actividades firmado', 'Sube el plan formativo firmado por la empresa.', date '2026-10-02'),
  (2, 'Memoria de septiembre', 'Resumen de lo aprendido en las primeras semanas.', date '2026-10-09'),
  (3, 'Memoria de octubre', 'Qué has hecho este mes y qué te ha costado más.', date '2026-11-06'),
  (4, 'Presentación a mitad de prácticas', 'Diez minutos sobre tu proyecto en la empresa.', date '2026-12-11')
) as t(n, titulo, descripcion, limite)
on conflict (id) do nothing;

-- Calendario: tutorías y entregas ---------------------------------------------------------------

insert into public.eventos (id, dossier_id, titulo, fecha, tipo)
select pg_temp.uid('evento-' || d.alumno || '-' || e.n), pg_temp.uid('dossier-' || d.alumno),
  e.titulo, e.fecha, e.tipo
from demo_dossier d
cross join (values
  (1, 'Tutoría de seguimiento', date '2026-11-05', 'reunion'),
  (2, 'Visita del profe a la empresa', date '2026-11-19', 'reunion'),
  (3, 'Entrega de la memoria de octubre', date '2026-11-06', 'entrega')
) as e(n, titulo, fecha, tipo)
on conflict (id) do nothing;

-- Datos de contacto (teléfonos inventados, de la serie 600 000 xxx) ------------------------------

insert into public.datos_personales (id, telefono, idioma, emergencia_nombre, emergencia_telefono)
select pg_temp.uid('alumno-' || d.alumno),
  '600 000 ' || lpad((100 + row_number() over (order by d.alumno))::text, 3, '0'), 'ca',
  'Familia ' || split_part(p.nombre, ' ', array_length(string_to_array(p.nombre, ' '), 1)),
  '600 001 ' || lpad((100 + row_number() over (order by d.alumno))::text, 3, '0')
from demo_dossier d join public.perfiles p on p.id = pg_temp.uid('alumno-' || d.alumno)
on conflict (id) do nothing;

insert into public.datos_personales (id, telefono, departamento, horario_tutoria)
values
  (pg_temp.uid('profe-marta'), '600 002 101', 'Informàtica', 'Dimarts 15:00-16:00'),
  (pg_temp.uid('profe-pau'), '600 002 102', 'Informàtica', 'Dijous 12:00-13:00'),
  (pg_temp.uid('profe-nuria'), '600 002 103', 'Informàtica', 'Dilluns 16:00-17:00')
on conflict (id) do nothing;

insert into public.datos_personales (id, telefono_trabajo, cargo, centro_trabajo)
values
  (pg_temp.uid('empresa-anna'), '600 003 101', 'Responsable de desarrollo', 'Oficina de Girona'),
  (pg_temp.uid('empresa-david'), '600 003 102', 'Director creativo', 'Oficina de Badalona'),
  (pg_temp.uid('empresa-carla'), '600 003 103', 'Cap de sistemes', 'Oficina de Vic')
on conflict (id) do nothing;

-- DNI inventados (formato válido, letra calculada) ----------------------------------------------

insert into public.identidad_alumno (alumno_id, dni)
select pg_temp.uid('alumno-' || d.alumno),
  n::text || substr('TRWAGMYFPDXBNJZSQVHLCKE', n % 23 + 1, 1)
from (select alumno, 99000000 + row_number() over (order by alumno)::int * 137 as n
      from demo_dossier) d
on conflict (alumno_id) do nothing;

-- Chat entre empresa, alumno y profe -------------------------------------------------------------

insert into public.chat_mensajes (id, autor_id, destinatario_id, texto, enviado_en)
select pg_temp.uid('chat-' || m.n), pg_temp.uid(m.autor), pg_temp.uid(m.destino), m.texto,
  now() - m.hace
from (values
  (1, 'alumno-joan', 'empresa-anna', 'Bon dia Anna, ja he pujat el pull request de la pantalla de login.', interval '2 days 3 hours'),
  (2, 'empresa-anna', 'alumno-joan', 'Perfecte, el reviso aquesta tarda.', interval '2 days 2 hours'),
  (3, 'empresa-anna', 'alumno-joan', 'Revisat: només cal canviar els noms de dues funcions.', interval '1 day 20 hours'),
  (4, 'profe-marta', 'empresa-anna', 'Hola Anna, et va bé fer la visita de seguiment el 19 de novembre?', interval '1 day 5 hours'),
  (5, 'empresa-anna', 'profe-marta', 'Sí, a les 10 seria ideal.', interval '1 day 4 hours'),
  (6, 'alumno-laura', 'profe-marta', 'Marta, la memòria de setembre la puc entregar dilluns?', interval '6 hours'),
  (7, 'alumno-julia', 'empresa-david', 'David, adjunto los bocetos nuevos en la carpeta compartida.', interval '3 hours'),
  (8, 'empresa-carla', 'profe-pau', 'Pau, l''Aina està fent molt bona feina amb les còpies de seguretat.', interval '1 day'),
  (9, 'alumno-marc', 'empresa-carla', 'Avui arribaré 15 minuts tard, tinc metge.', interval '30 minutes')
) as m(n, autor, destino, texto, hace)
on conflict (id) do nothing;

-- Incidencias: se abren en nombre de quien las crea, como haría la app ---------------------------

do $$
declare
  i record;
begin
  for i in select * from (values
    ('alumno-marc', 'dossier-marc', 'practicas', 'media', 'No me cuadran las horas de septiembre',
     'En el resumen me salen 6 horas menos de las que fiché.'),
    ('empresa-david', 'dossier-oriol', 'empresa', 'baja', 'Cambio de horario de Oriol',
     'A partir de noviembre Oriol hará horario de mañana, de 8 a 14.'),
    ('alumno-ona', 'dossier-ona', 'app', 'alta', 'No puedo subir la memoria',
     'Al adjuntar el PDF la app se queda cargando.')
  ) as v(autor, dossier, categoria, prioridad, titulo, descripcion)
  loop
    continue when exists (select 1 from public.incidencias
      where titulo = i.titulo and dossier_id = pg_temp.uid(i.dossier));
    perform set_config('request.jwt.claims',
      json_build_object('sub', pg_temp.uid(i.autor), 'role', 'authenticated')::text, true);
    insert into public.incidencias (dossier_id, categoria, prioridad, titulo, descripcion)
    values (pg_temp.uid(i.dossier), i.categoria::public.categoria_incidencia,
      i.prioridad::public.prioridad_incidencia, i.titulo, i.descripcion);
  end loop;
  perform set_config('request.jwt.claims', '', true);
end $$;

commit;

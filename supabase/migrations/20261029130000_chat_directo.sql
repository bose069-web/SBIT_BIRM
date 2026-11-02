-- Chat directo entre dos personas que comparten un dossier: la empresa con su alumno y con el
-- profe tutor de ese alumno, y el alumno con su profe. Un hilo por cada par de personas.

create function public.comparten_dossier(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.dossiers d
    where a in (d.alumno_id, d.tutor_id, d.tutor_empresa_id)
      and b in (d.alumno_id, d.tutor_id, d.tutor_empresa_id)
  )
$$;

create table public.chat_mensajes (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid not null references public.perfiles (id) on delete cascade,
  destinatario_id uuid not null references public.perfiles (id) on delete cascade,
  texto text not null check (length(trim(texto)) between 1 and 2000),
  enviado_en timestamptz not null default now(),
  check (autor_id <> destinatario_id)
);
create index on public.chat_mensajes (autor_id, enviado_en);
create index on public.chat_mensajes (destinatario_id, enviado_en);

alter table public.chat_mensajes enable row level security;

create policy "ver mis mensajes" on public.chat_mensajes for select to authenticated
  using ((select auth.uid()) in (autor_id, destinatario_id));
-- Solo se escribe en nombre propio, a quien comparte un dossier y con la hora del servidor.
create policy "escribir mensajes" on public.chat_mensajes for insert to authenticated
  with check (
    autor_id = (select auth.uid())
    and public.comparten_dossier(autor_id, destinatario_id)
    and enviado_en >= now() - interval '1 minute'
  );

-- Hasta dónde ha leído cada usuario cada hilo, para contar los no leídos.
create table public.chat_lecturas (
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  otro_id uuid not null references public.perfiles (id) on delete cascade,
  leido_hasta timestamptz not null,
  primary key (usuario_id, otro_id)
);

alter table public.chat_lecturas enable row level security;

create policy "ver mis lecturas" on public.chat_lecturas for select to authenticated
  using (usuario_id = (select auth.uid()));
create policy "crear mis lecturas" on public.chat_lecturas for insert to authenticated
  with check (usuario_id = (select auth.uid()));
create policy "cambiar mis lecturas" on public.chat_lecturas for update to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

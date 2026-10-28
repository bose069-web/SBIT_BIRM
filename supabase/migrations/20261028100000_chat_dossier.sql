-- Chat de cada dossier: alumno, profe tutor, tutor de empresa e instituto del centro hablan en
-- un hilo común. La generalitat lo puede leer pero no escribe. Los mensajes no se editan.

create table public.mensajes_chat (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.dossiers(id) on delete cascade,
  autor_id uuid not null default auth.uid() references public.perfiles(id) on delete cascade,
  texto text not null check (char_length(btrim(texto)) between 1 and 2000),
  creado_en timestamptz not null default now()
);

create index mensajes_chat_dossier_idx on public.mensajes_chat (dossier_id, creado_en);
create index mensajes_chat_autor_idx on public.mensajes_chat (autor_id);

-- Quién participa en el chat de un dossier (y por tanto lee y escribe).
create function public.participa_chat(d uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.es_alumno_de(d)
    or public.es_empresa_de(d)
    or exists (
      select 1 from public.dossiers x
      where x.id = d
        and (x.tutor_id = (select auth.uid())
          or (public.es_instituto() and public.administra_centro(x.centro_id))))
$$;

-- El autor y la hora los pone la base: nadie escribe en nombre de otro.
create function public.preparar_mensaje_chat() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.autor_id := auth.uid();
  new.creado_en := now();
  new.texto := btrim(new.texto);
  return new;
end $$;

create trigger preparar_mensaje_chat before insert on public.mensajes_chat
for each row execute function public.preparar_mensaje_chat();

revoke execute on function public.preparar_mensaje_chat() from authenticated;
revoke execute on function public.participa_chat(uuid) from public, anon;
grant execute on function public.participa_chat(uuid) to authenticated;

alter table public.mensajes_chat enable row level security;

create policy "ver chat" on public.mensajes_chat for select to authenticated
  using (public.participa_chat(dossier_id) or public.es_generalitat());
create policy "escribir chat" on public.mensajes_chat for insert to authenticated
  with check (public.participa_chat(dossier_id));
-- Sin políticas de update: un mensaje enviado no se cambia. Solo la generalitat borra (moderación).
create policy "generalitat borra chat" on public.mensajes_chat for delete to authenticated
  using (public.es_generalitat());

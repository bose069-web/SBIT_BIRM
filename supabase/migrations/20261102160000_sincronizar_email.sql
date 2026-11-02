-- El correo de acceso vive en auth.users y perfiles.email es una copia (la usa el instituto
-- para buscar cuentas). Cuando alguien cambia su correo (hoy, el tutor de empresa desde
-- Perfil con auth.updateUser), la copia no se actualizaba y proteger_perfil no dejaba
-- cambiarla. Aquí:
--   1. un trigger en auth.users copia el correo nuevo a perfiles cuando cambia (también
--      cuando se confirma un cambio pendiente por correo);
--   2. proteger_perfil deja cambiar perfiles.email solo si queda igual que el de la cuenta;
--   3. se arreglan los perfiles que ya estuvieran desfasados.

create or replace function public.proteger_perfil() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  profe public.perfiles;
begin
  if new.profe_id is not null then
    select * into profe from public.perfiles where id = new.profe_id;
    if profe.rol is distinct from 'profe' or profe.centro_id is distinct from new.centro_id then
      raise exception 'El profe asignado debe ser un profe del centro del alumno';
    end if;
  end if;

  -- El correo de perfiles es copia del de la cuenta (auth.users): se deja cambiar solo para
  -- ponerlo igual que el de la cuenta, que es lo que hace sincronizar_email.
  if tg_op = 'UPDATE' and new.email is distinct from old.email
     and (new.id, new.nombre, new.rol, new.centro_id, new.empresa_id, new.profe_id)
       is not distinct from (old.id, old.nombre, old.rol, old.centro_id, old.empresa_id, old.profe_id)
     and new.email = (select u.email from auth.users u where u.id = new.id) then
    return new;
  end if;

  -- auth.uid() es null cuando cambia algo el sistema (alta de usuario, migraciones, seed).
  if tg_op = 'INSERT' or (select auth.uid()) is null or public.es_generalitat() then
    return new;
  end if;

  -- Nadie se cambia a sí mismo el rol ni las asignaciones.
  if new.id <> (select auth.uid()) and public.es_instituto() then
    -- El instituto reparte cuentas de su centro: alumnos, profes y tutores de empresas con convenio.
    if new.rol = 'empresa' then
      if new.empresa_id is null or not exists (
        select 1 from public.convenios
        where centro_id = public.centro_actual() and empresa_id = new.empresa_id
      ) then
        raise exception 'El tutor de empresa debe ser de una empresa con convenio con tu centro';
      end if;
    elsif new.rol not in ('alumno', 'profe') or new.centro_id is distinct from public.centro_actual() then
      raise exception 'Solo puedes dar de alta alumnos y profes de tu centro';
    end if;
    return new;
  end if;

  -- El resto (y cualquiera sobre su propio perfil) solo puede cambiar el nombre.
  if (new.id, new.email, new.rol, new.centro_id, new.empresa_id, new.profe_id)
     is distinct from (old.id, old.email, old.rol, old.centro_id, old.empresa_id, old.profe_id) then
    raise exception 'No puedes cambiar el rol ni las asignaciones de este perfil';
  end if;
  return new;
end $$;


create function public.sincronizar_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.perfiles set email = new.email
  where id = new.id and email is distinct from new.email;
  return null;
end $$;

create trigger sincronizar_email after update of email on auth.users
for each row when (old.email is distinct from new.email)
execute function public.sincronizar_email();

revoke execute on function public.sincronizar_email() from public, anon, authenticated;

update public.perfiles p set email = u.email
from auth.users u
where u.id = p.id and p.email is distinct from u.email;

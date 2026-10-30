import type { SupabaseClient } from '@supabase/supabase-js';

import { AltaSinIncorporarError, CorreoYaRegistradoError } from '@/core/domain/errores';

import { crearClienteTemporal } from '../client';
import { GestionCentroSupabase } from '../gestion-centro-supabase';

jest.mock('../client', () => ({ crearClienteTemporal: jest.fn() }));

const datos = { nombre: 'Eva Roca', email: 'eva@kampus.test', contrasena: 'una-contrasena' };
const FILA = {
  id: 'u1',
  nombre: 'Eva Roca',
  email: 'eva@kampus.test',
  rol: 'alumno',
  centro_id: 'c1',
  profe_id: null,
};

function preparar(respuesta: unknown, fila: unknown = { data: FILA, error: null }) {
  const temporal = {
    auth: {
      signUp: jest.fn().mockResolvedValue(respuesta),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
  };
  jest.mocked(crearClienteTemporal).mockReturnValue(temporal as unknown as SupabaseClient);
  const consulta = {
    update: jest.fn(),
    eq: jest.fn(),
    select: jest.fn(),
    maybeSingle: jest.fn().mockResolvedValue(fila),
  };
  // La primera consulta comprueba si el correo ya tiene perfil.
  consulta.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
  consulta.update.mockReturnValue(consulta);
  consulta.eq.mockReturnValue(consulta);
  consulta.select.mockReturnValue(consulta);
  const principal = {
    from: jest.fn(() => consulta),
    auth: { signUp: jest.fn(), signOut: jest.fn(), setSession: jest.fn() },
  };
  const port = new GestionCentroSupabase(principal as unknown as SupabaseClient, {
    url: 'http://local',
    clave: 'publica',
  });
  return { port, temporal, principal, consulta };
}

const creado = { data: { user: { id: 'u1', identities: [{}] }, session: null }, error: null };

describe('crearAlumno en Supabase', () => {
  it('registra con el cliente temporal y mete al alumno en el centro con el principal', async () => {
    const { port, temporal, principal, consulta } = preparar(creado);
    await expect(port.crearAlumno(datos, 'c1')).resolves.toMatchObject({
      id: 'u1',
      centroId: 'c1',
      profeId: null,
    });
    expect(temporal.auth.signUp).toHaveBeenCalledWith({
      email: datos.email,
      password: datos.contrasena,
      options: { data: { nombre: datos.nombre } },
    });
    expect(principal.auth.signUp).not.toHaveBeenCalled();
    expect(principal.auth.signOut).not.toHaveBeenCalled();
    expect(consulta.update).toHaveBeenCalledWith({ centro_id: 'c1' });
  });

  it('revoca la sesión de la cuenta nueva solo en el cliente temporal', async () => {
    const { port, temporal, principal } = preparar({
      data: { user: { id: 'u1', identities: [{}] }, session: { access_token: 'x' } },
      error: null,
    });
    await port.crearAlumno(datos, 'c1');
    expect(temporal.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(principal.auth.signOut).not.toHaveBeenCalled();
  });

  it('un usuario sin identidades es un correo repetido', async () => {
    const { port, consulta } = preparar({
      data: { user: { id: 'falso', identities: [] }, session: null },
      error: null,
    });
    await expect(port.crearAlumno(datos, 'c1')).rejects.toThrow(CorreoYaRegistradoError);
    expect(consulta.update).not.toHaveBeenCalled();
  });

  it('reconoce el error de correo repetido del servidor', async () => {
    const { port } = preparar({
      data: { user: null, session: null },
      error: { message: 'User already registered', code: 'user_already_exists' },
    });
    await expect(port.crearAlumno(datos, 'c1')).rejects.toThrow(CorreoYaRegistradoError);
  });

  it('avisa si la cuenta se crea pero no entra en el centro', async () => {
    const { port } = preparar(creado, { data: null, error: { message: 'denegado' } });
    await expect(port.crearAlumno(datos, 'c1')).rejects.toThrow(AltaSinIncorporarError);
  });

  it('no registra si el correo ya tiene perfil visible: signUp no cambiaría su contraseña', async () => {
    const { port, temporal, consulta } = preparar(creado);
    consulta.maybeSingle.mockReset().mockResolvedValue({ data: { id: 'u0' }, error: null });
    await expect(port.crearAlumno(datos, 'c1')).rejects.toThrow(CorreoYaRegistradoError);
    expect(temporal.auth.signUp).not.toHaveBeenCalled();
  });

  it('una cuenta sin confirmar de otro centro, que RLS no deja tocar, es un correo repetido', async () => {
    const { port } = preparar(creado, { data: null, error: null });
    await expect(port.crearAlumno(datos, 'c1')).rejects.toThrow(CorreoYaRegistradoError);
  });
});

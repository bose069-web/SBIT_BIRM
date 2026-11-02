import type { SupabaseClient } from '@supabase/supabase-js';

import { CorreoYaRegistradoError, SinPermisoError } from '@/core/domain/errores';

import { GestionCentroSupabase } from '../gestion-centro-supabase';

const datos = { nombre: 'Eva Roca', email: 'eva@kampus.test', contrasena: 'una-contrasena' };
const FILA = {
  id: 'u1',
  nombre: 'Eva Roca',
  email: 'eva@kampus.test',
  centro_id: 'c1',
  profe_id: null,
};

function preparar(respuesta: unknown) {
  const invoke = jest.fn().mockResolvedValue(respuesta);
  const signUp = jest.fn();
  const cliente = { functions: { invoke }, auth: { signUp } };
  return {
    port: new GestionCentroSupabase(cliente as unknown as SupabaseClient),
    invoke,
    signUp,
  };
}

const fallo = (estado: number, codigo: string) => ({
  data: null,
  error: { context: new Response(JSON.stringify({ codigo }), { status: estado }) },
});

describe('crearAlumno en Supabase', () => {
  it('crea la cuenta en el servidor, nunca con signUp, que la dejaría sin confirmar', async () => {
    const { port, invoke, signUp } = preparar({ data: { alumno: FILA }, error: null });
    await expect(port.crearAlumno(datos, 'c1')).resolves.toMatchObject({
      id: 'u1',
      rol: 'alumno',
      centroId: 'c1',
      profeId: null,
    });
    expect(invoke).toHaveBeenCalledWith('alta-alumno', { body: { ...datos, centroId: 'c1' } });
    expect(signUp).not.toHaveBeenCalled();
  });

  it('traduce el correo repetido', async () => {
    const { port } = preparar(fallo(409, 'correo_repetido'));
    await expect(port.crearAlumno(datos, 'c1')).rejects.toThrow(CorreoYaRegistradoError);
  });

  it('traduce la falta de permiso', async () => {
    const { port } = preparar(fallo(403, 'sin_permiso'));
    await expect(port.crearAlumno(datos, 'c1')).rejects.toThrow(SinPermisoError);
  });

  it('un fallo desconocido no se da por alta', async () => {
    const { port } = preparar({ data: null, error: { context: undefined } });
    await expect(port.crearAlumno(datos, 'c1')).rejects.toThrow('No se ha podido crear la cuenta');
  });
});

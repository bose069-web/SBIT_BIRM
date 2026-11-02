import type { SupabaseClient } from '@supabase/supabase-js';

import { CredencialesInvalidasError, CuentaSinConfirmarError } from '@/core/domain/errores';

import { AuthSupabase } from '../auth-supabase';

function preparar() {
  const perfil = { nombre: 'Alumno', rol: 'alumno', centro_id: 'centro' };
  const consulta = { select: jest.fn(), eq: jest.fn(), maybeSingle: jest.fn() };
  consulta.select.mockReturnValue(consulta);
  consulta.eq.mockReturnValue(consulta);
  consulta.maybeSingle.mockResolvedValue({ data: perfil, error: null });
  const cliente = {
    from: jest.fn(() => consulta),
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { user: { id: 'alumno', email: 'alumno@ejemplo.test' } } },
        error: null,
      }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
  };
  return { cliente, consulta, auth: new AuthSupabase(cliente as unknown as SupabaseClient) };
}

it('restaura el usuario de la sesión persistida sin volver a pedir credenciales', async () => {
  const { auth } = preparar();
  await expect(auth.usuarioActual()).resolves.toMatchObject({ id: 'alumno', rol: 'alumno' });
});

it('no inventa un perfil cuando falla la consulta o el rol no existe', async () => {
  const { auth, consulta } = preparar();
  consulta.maybeSingle.mockResolvedValueOnce({ data: null, error: new Error('Sin conexión') });
  await expect(auth.usuarioActual()).rejects.toThrow('No se pudo cargar');
  consulta.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
  await expect(auth.usuarioActual()).rejects.toThrow('perfil válido');
});

it('propaga un fallo de restauración y de cierre en lugar de simular éxito', async () => {
  const { auth, cliente } = preparar();
  cliente.auth.getSession.mockResolvedValueOnce({
    data: { session: null },
    error: new Error('Sesión no disponible'),
  });
  await expect(auth.usuarioActual()).rejects.toThrow('Sesión no disponible');
  cliente.auth.signOut.mockResolvedValueOnce({ error: new Error('Sin conexión') });
  await expect(auth.cerrarSesion()).rejects.toThrow('Sin conexión');
});

it('distingue la cuenta sin confirmar de la contraseña incorrecta', async () => {
  const entrar = (code: string) => {
    const signInWithPassword = jest
      .fn()
      .mockResolvedValue({ data: { user: null }, error: { code } });
    const cliente = { auth: { signInWithPassword } };
    return new AuthSupabase(cliente as unknown as SupabaseClient).iniciarSesion(
      'alumno@ejemplo.test',
      'una-contrasena',
    );
  };
  await expect(entrar('email_not_confirmed')).rejects.toThrow(CuentaSinConfirmarError);
  await expect(entrar('invalid_credentials')).rejects.toThrow(CredencialesInvalidasError);
});

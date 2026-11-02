import { cambiarContrasena } from '../application/auth';
import { DatosInvalidosError } from '../domain/errores';
import type { AuthPort } from '../ports/auth-port';

const puerto = () => {
  const cambiar = jest.fn<Promise<void>, [string]>().mockResolvedValue();
  return { cambiar, auth: { cambiarContrasena: cambiar } as unknown as AuthPort };
};

describe('cambiar la contraseña', () => {
  it('exige al menos 8 caracteres', async () => {
    const { auth, cambiar } = puerto();
    await expect(cambiarContrasena(auth, '1234567')).rejects.toThrow(DatosInvalidosError);
    expect(cambiar).not.toHaveBeenCalled();
  });

  it('pasa la contraseña tal cual, sin recortarla', async () => {
    const { auth, cambiar } = puerto();
    await cambiarContrasena(auth, ' 12345678 ');
    expect(cambiar).toHaveBeenCalledWith(' 12345678 ');
  });
});

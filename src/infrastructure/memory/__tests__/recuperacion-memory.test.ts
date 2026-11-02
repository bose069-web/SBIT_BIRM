import {
  generarTokenRecuperacion,
  pedirRecuperacion,
  restablecerContrasena,
  solicitudesPendientes,
} from '@/core/application/recuperacion';
import { DatosInvalidosError, EnlaceCaducadoError, SinPermisoError } from '@/core/domain/errores';
import { alumno, profe } from '@/core/__fixtures__/datos';
import { CuentasMemory } from '@/infrastructure/memory/cuentas-memory';
import { RecuperacionMemory } from '@/infrastructure/memory/recuperacion-memory';

const preparar = () => {
  const cuentas = new CuentasMemory();
  return { cuentas, port: new RecuperacionMemory(cuentas) };
};
const CORREO = 'alumno@kampus.test';

describe('recuperación de contraseña', () => {
  it('el alumno pide, el profe genera el enlace y sirve una sola vez', async () => {
    const { cuentas, port } = preparar();
    await pedirRecuperacion(port, ` ${CORREO.toUpperCase()} `, 'url');
    await pedirRecuperacion(port, CORREO, 'url');
    const [solicitud, ...resto] = await solicitudesPendientes(port, profe);
    expect(resto).toHaveLength(0);

    const token = await generarTokenRecuperacion(port, profe, solicitud.id);
    expect(await solicitudesPendientes(port, profe)).toHaveLength(0);

    await restablecerContrasena(port, { token }, 'nueva-clave', 'nueva-clave');
    expect(cuentas.entrar(CORREO, 'nueva-clave').email).toBe(CORREO);
    await expect(
      restablecerContrasena(port, { token }, 'otra-clave1', 'otra-clave1'),
    ).rejects.toThrow(EnlaceCaducadoError);
  });

  it('un correo sin cuenta no crea solicitud ni da error', async () => {
    const { port } = preparar();
    await pedirRecuperacion(port, 'nadie@kampus.test', 'url');
    expect(await solicitudesPendientes(port, profe)).toHaveLength(0);
  });

  it('solo el profe atiende solicitudes', async () => {
    const { port } = preparar();
    await expect(solicitudesPendientes(port, alumno)).rejects.toThrow(SinPermisoError);
    await expect(generarTokenRecuperacion(port, alumno, 'x')).rejects.toThrow(SinPermisoError);
  });

  it('comprueba la contraseña nueva antes de gastar el enlace', async () => {
    const { port } = preparar();
    await pedirRecuperacion(port, CORREO, 'url');
    const [s] = await solicitudesPendientes(port, profe);
    const token = await generarTokenRecuperacion(port, profe, s.id);
    await expect(restablecerContrasena(port, { token }, 'corta', 'corta')).rejects.toThrow(
      DatosInvalidosError,
    );
    await expect(
      restablecerContrasena(port, { token }, 'nueva-clave', 'distinta-1'),
    ).rejects.toThrow('no coinciden');
    await restablecerContrasena(port, { token }, 'nueva-clave', 'nueva-clave');
  });
});

import { AuthMemory } from '../auth-memory';
import { CuentasMemory } from '../cuentas-memory';
import { GestionCentroMemory } from '../gestion-centro-memory';
import { IDS_DEMO } from '../datos-demo';

it('alta, login y cambio de contraseña comparten la misma cuenta sin cambiar la sesión del instituto', async () => {
  const cuentas = new CuentasMemory();
  const auth = new AuthMemory(null, cuentas);
  const gestion = new GestionCentroMemory(cuentas);
  const instituto = await auth.iniciarSesion('instituto@kampus.test', 'kampus');
  const alumno = await gestion.crearAlumno(
    { nombre: 'Nuevo alumno', email: 'nuevo@kampus.test', contrasena: 'Inicial-123' },
    IDS_DEMO.centro,
  );
  expect((await auth.usuarioActual())?.id).toBe(instituto.id);
  await auth.cerrarSesion();
  expect((await auth.iniciarSesion(alumno.email, 'Inicial-123')).id).toBe(alumno.id);
  await auth.cambiarContrasena('Distinta-123');
  await auth.cerrarSesion();
  await expect(auth.iniciarSesion(alumno.email, 'Inicial-123')).rejects.toThrow();
  await expect(auth.iniciarSesion(alumno.email, 'Distinta-123')).resolves.toMatchObject({
    id: alumno.id,
  });
  await auth.cerrarSesion();
  await expect(auth.cambiarContrasena('NoPermitida')).rejects.toThrow('No hay sesión');
  await expect(auth.iniciarSesion('instituto@kampus.test', 'kampus')).resolves.toMatchObject({
    id: instituto.id,
  });
});

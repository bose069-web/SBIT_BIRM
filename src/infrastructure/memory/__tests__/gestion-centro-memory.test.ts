import { CorreoYaRegistradoError } from '@/core/domain/errores';

import { IDS_DEMO } from '../datos-demo';
import { GestionCentroMemory } from '../gestion-centro-memory';

const datos = { nombre: 'Eva Roca', email: 'eva@kampus.test', contrasena: 'una-contrasena' };

describe('crearAlumno en memoria', () => {
  it('lo deja en el centro, sin profe y sin guardar la contraseña', async () => {
    const port = new GestionCentroMemory();
    const alumno = await port.crearAlumno(datos, IDS_DEMO.centro);
    expect(alumno).toMatchObject({
      nombre: 'Eva Roca',
      rol: 'alumno',
      centroId: IDS_DEMO.centro,
      profeId: null,
    });
    expect(await port.listarPersonas(IDS_DEMO.centro)).toContainEqual(alumno);
    expect(JSON.stringify(port)).not.toContain(datos.contrasena);
  });

  it.each(['eva@kampus.test', 'laia@kampus.test', 'empresa@kampus.test', 'instituto@kampus.test'])(
    'rechaza el correo repetido %s',
    async (email) => {
      const port = new GestionCentroMemory();
      await port.crearAlumno(datos, IDS_DEMO.centro);
      await expect(port.crearAlumno({ ...datos, email }, IDS_DEMO.centro)).rejects.toThrow(
        CorreoYaRegistradoError,
      );
    },
  );
});

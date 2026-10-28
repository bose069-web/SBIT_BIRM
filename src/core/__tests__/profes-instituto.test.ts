import {
  obtenerRepartoProfes,
  reasignarAlumnos,
  RepartoError,
} from '../application/profes-instituto';
import { SinPermisoError } from '../domain/errores';
import {
  ANA,
  BIEL,
  CentrosFalsos,
  generalitat,
  instituto,
  NUEVA,
  otroInstituto,
  PAU,
  persona,
  profe,
  RUT,
} from '../__fixtures__/datos';

// Alumno de otro centro, para las mezclas.
const ALUMNO_DE_C2 = persona({ id: 'a9', nombre: 'Iris', rol: 'alumno', centroId: 'c2' });

describe('reparto de profes', () => {
  it('cada profe con sus alumnos y los alumnos sin profe aparte', async () => {
    const port = new CentrosFalsos();
    const reparto = await obtenerRepartoProfes(port, instituto, 'c1');

    expect(reparto.centro.nombre).toBe('Institut');
    expect(reparto.profes.map((p) => p.nombre)).toEqual(['Pau']);
    expect(reparto.profes[0].alumnos.map((a) => a.id)).toEqual([ANA.id]);
    expect(reparto.sinProfe.map((a) => a.id)).toEqual([BIEL.id]);
  });

  it('el profe de otro centro no sale y la cuenta nueva tampoco', async () => {
    const reparto = await obtenerRepartoProfes(new CentrosFalsos(), instituto, 'c1');
    const ids = [...reparto.profes.map((p) => p.id), ...reparto.sinProfe.map((a) => a.id)];
    expect(ids).not.toContain(RUT.id);
    expect(ids).not.toContain(NUEVA.id);
  });

  it('solo lo ve el instituto de ese centro y la generalitat', async () => {
    await expect(obtenerRepartoProfes(new CentrosFalsos(), otroInstituto, 'c1')).rejects.toThrow(
      SinPermisoError,
    );
    await expect(obtenerRepartoProfes(new CentrosFalsos(), profe, 'c1')).rejects.toThrow(
      SinPermisoError,
    );
    await expect(
      obtenerRepartoProfes(new CentrosFalsos(), generalitat, 'c1'),
    ).resolves.toMatchObject({ centro: { id: 'c1' } });
  });

  it('avisa si el centro no existe', async () => {
    await expect(obtenerRepartoProfes(new CentrosFalsos(), generalitat, 'c9')).rejects.toThrow(
      /No se encuentra el centro/,
    );
  });
});

describe('reasignar alumnos en bloque', () => {
  it('mueve varios alumnos al profe de una vez', async () => {
    const port = new CentrosFalsos();
    const cuantos = await reasignarAlumnos(port, instituto, [ANA, BIEL], PAU);

    expect(cuantos).toBe(2);
    expect(port.personas.filter((p) => p.profeId === PAU.id).map((p) => p.id)).toEqual([
      ANA.id,
      BIEL.id,
    ]);
    const reparto = await obtenerRepartoProfes(port, instituto, 'c1');
    expect(reparto.profes[0].alumnos).toHaveLength(2);
    expect(reparto.sinProfe).toEqual([]);
  });

  it('con null los deja sin profe', async () => {
    const port = new CentrosFalsos();
    await reasignarAlumnos(port, instituto, [ANA], null);

    expect(port.personas.find((p) => p.id === ANA.id)!.profeId).toBeNull();
  });

  it('no repite alumnos aunque lleguen dos veces', async () => {
    const port = new CentrosFalsos();
    await expect(reasignarAlumnos(port, instituto, [ANA, ANA], PAU)).resolves.toBe(1);
  });

  it('pide alumnos', async () => {
    await expect(reasignarAlumnos(new CentrosFalsos(), instituto, [], PAU)).rejects.toThrow(
      RepartoError,
    );
  });

  it('el profe tiene que ser del mismo centro que los alumnos', async () => {
    await expect(reasignarAlumnos(new CentrosFalsos(), instituto, [ANA], RUT)).rejects.toThrow(
      /mismo centro/,
    );
  });

  it('no mezcla alumnos de centros distintos', async () => {
    await expect(
      reasignarAlumnos(new CentrosFalsos(), instituto, [ANA, ALUMNO_DE_C2], PAU),
    ).rejects.toThrow(/mismo centro/);
  });

  it('no reasigna cuentas nuevas sin centro', async () => {
    await expect(reasignarAlumnos(new CentrosFalsos(), instituto, [NUEVA], PAU)).rejects.toThrow(
      /alumnos de un centro/,
    );
  });

  it('solo reparte el instituto de ese centro y la generalitat', async () => {
    await expect(reasignarAlumnos(new CentrosFalsos(), otroInstituto, [ANA], PAU)).rejects.toThrow(
      SinPermisoError,
    );
    await expect(reasignarAlumnos(new CentrosFalsos(), profe, [ANA], PAU)).rejects.toThrow(
      SinPermisoError,
    );
    await expect(reasignarAlumnos(new CentrosFalsos(), generalitat, [ANA], PAU)).resolves.toBe(1);
  });
});

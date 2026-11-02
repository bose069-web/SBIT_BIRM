import {
  darDeBajaCentro,
  editarCentro,
  GestionCentroError,
  obtenerPanelGeneralitat,
  reactivarCentro,
} from '../application/centro';
import { juntarCifras, resumirRed, type CifrasCentro } from '../domain/centro';
import { SinPermisoError } from '../domain/errores';
import { generalitat, instituto, otroInstituto, profe, CentrosFalsos } from '../__fixtures__/datos';

const cifras = (centroId: string, extra: Partial<CifrasCentro> = {}): CifrasCentro => ({
  centroId,
  alumnos: 0,
  profes: 0,
  dossiersActivos: 0,
  empresasConvenio: 0,
  horasHechas: 0,
  horasPrevistas: 0,
  ...extra,
});

describe('juntarCifras y resumirRed', () => {
  const centros = [
    { id: 'b', nombre: 'Zeta', codigo: '08000002', dadoDeBajaEn: '2026-10-01T00:00:00Z' },
    { id: 'a', nombre: 'Beta', codigo: '08000001' },
    { id: 'c', nombre: 'Alfa', codigo: null },
  ];

  it('pone los activos primero, por nombre, y cifras a cero si faltan', () => {
    const r = juntarCifras(centros, [cifras('a', { alumnos: 3 })]);
    expect(r.map((c) => c.nombre)).toEqual(['Alfa', 'Beta', 'Zeta']);
    expect(r[0].cifras).toEqual(cifras('c'));
    expect(r[1].cifras.alumnos).toBe(3);
  });

  it('suma la red y calcula el porcentaje de horas', () => {
    const r = resumirRed(
      juntarCifras(centros, [
        cifras('a', {
          alumnos: 3,
          dossiersActivos: 2,
          empresasConvenio: 1,
          horasHechas: 150,
          horasPrevistas: 400,
        }),
        cifras('b', { alumnos: 1, horasHechas: 50, horasPrevistas: 100 }),
      ]),
    );
    expect(r).toEqual({
      institutos: 2,
      institutosDeBaja: 1,
      alumnos: 4,
      dossiersActivos: 2,
      empresasConvenio: 1,
      porcentajeHoras: 40,
    });
  });

  it('sin horas previstas el porcentaje es 0', () => {
    expect(resumirRed([]).porcentajeHoras).toBe(0);
  });
});

describe('panel de la generalitat', () => {
  it('solo lo ve la generalitat', async () => {
    const port = new CentrosFalsos();
    port.cifras = [cifras('c1', { alumnos: 2 })];
    const panel = await obtenerPanelGeneralitat(port, generalitat);
    expect(panel.institutos[0].cifras.alumnos).toBe(2);
    expect(panel.resumen.institutos).toBe(1);
    await expect(obtenerPanelGeneralitat(port, instituto)).rejects.toBeInstanceOf(SinPermisoError);
  });

  it('si fallan las cifras, la lista sigue saliendo con un aviso', async () => {
    const port = new CentrosFalsos();
    port.cifrasCentros = async () => {
      throw new Error('Could not find the function public.cifras_centros');
    };
    const panel = await obtenerPanelGeneralitat(port, generalitat);
    expect(panel.sinCifras).toBe(true);
    expect(panel.institutos).toHaveLength(1);
  });
});

describe('editar, dar de baja y reactivar institutos', () => {
  it('la generalitat y el propio instituto editan; otro instituto no', async () => {
    const port = new CentrosFalsos();
    await editarCentro(port, generalitat, 'c1', { nombre: ' Nou nom ', codigo: '08000009' });
    expect(port.centros[0]).toMatchObject({ nombre: 'Nou nom', codigo: '08000009' });
    await editarCentro(port, instituto, 'c1', { nombre: 'Otro', codigo: '08000009' });
    await expect(
      editarCentro(port, otroInstituto, 'c1', { nombre: 'X', codigo: '08000009' }),
    ).rejects.toBeInstanceOf(SinPermisoError);
    await expect(
      editarCentro(port, generalitat, 'c1', { nombre: 'X', codigo: '123' }),
    ).rejects.toBeInstanceOf(GestionCentroError);
  });

  it('solo la generalitat da de baja, con motivo, y reactiva', async () => {
    const port = new CentrosFalsos();
    const centro = port.centros[0];
    await expect(darDeBajaCentro(port, instituto, centro, 'Cierre')).rejects.toBeInstanceOf(
      SinPermisoError,
    );
    await expect(darDeBajaCentro(port, generalitat, centro, '  ')).rejects.toThrow(/motivo/);
    await darDeBajaCentro(port, generalitat, centro, ' Cierre del centro ');
    expect(port.centros[0].motivoBaja).toBe('Cierre del centro');
    await expect(darDeBajaCentro(port, generalitat, port.centros[0], 'Otra')).rejects.toThrow(
      /ya está de baja/,
    );
    await expect(reactivarCentro(port, profe, port.centros[0])).rejects.toBeInstanceOf(
      SinPermisoError,
    );
    await reactivarCentro(port, generalitat, port.centros[0]);
    expect(port.centros[0].dadoDeBajaEn).toBeNull();
  });
});

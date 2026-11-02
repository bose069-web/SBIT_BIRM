import {
  darDeBajaCentro,
  editarCentro,
  GestionCentroError,
  obtenerPanelGeneralitat,
  reactivarCentro,
} from '../application/centro';
import { buscarInstitutos, ordenarInstitutos } from '../domain/centro';
import { SinPermisoError } from '../domain/errores';
import { generalitat, instituto, otroInstituto, profe, CentrosFalsos } from '../__fixtures__/datos';

describe('ordenar y buscar institutos', () => {
  const centros = [
    { id: 'b', nombre: 'Zeta', codigo: '08000002', dadoDeBajaEn: '2026-10-01T00:00:00Z' },
    { id: 'a', nombre: 'Institut Vidal i Barraquer', codigo: '43000001' },
    { id: 'c', nombre: 'Àlfa', codigo: null },
  ];

  it('pone los activos primero, por nombre, y los de baja al final', () => {
    expect(ordenarInstitutos(centros).map((c) => c.id)).toEqual(['c', 'a', 'b']);
  });

  it('busca por nombre sin acentos ni mayúsculas, o por código', () => {
    expect(buscarInstitutos(centros, 'vidal').map((c) => c.id)).toEqual(['a']);
    expect(buscarInstitutos(centros, 'alfa').map((c) => c.id)).toEqual(['c']);
    expect(buscarInstitutos(centros, '0800').map((c) => c.id)).toEqual(['b']);
    expect(buscarInstitutos(centros, '  ')).toHaveLength(3);
  });
});

describe('panel de la generalitat', () => {
  it('solo lo ve la generalitat y cuenta activos y de baja, sin datos de dentro', async () => {
    const port = new CentrosFalsos();
    port.centros.push({ id: 'c2', nombre: 'Baja', codigo: null, dadoDeBajaEn: '2026-10-01' });
    const panel = await obtenerPanelGeneralitat(port, generalitat);
    expect(panel).toMatchObject({ activos: 1, deBaja: 1 });
    expect(panel.institutos.map((c) => c.id)).toEqual(['c1', 'c2']);
    await expect(obtenerPanelGeneralitat(port, instituto)).rejects.toBeInstanceOf(SinPermisoError);
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

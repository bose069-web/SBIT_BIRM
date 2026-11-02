import { darToque, marcarToqueVisto, toquesPendientes, ultimosToques } from '../application/toques';
import { SinPermisoError } from '../domain/errores';
import { comprobarDiasSinApuntar, diasSinApuntar, esLaborable, sinVer } from '../domain/toque';
import {
  alumno,
  crearDossier,
  generalitat,
  instituto,
  otroAlumno,
  otroProfe,
  profe,
  ToquesFalsos,
} from '../__fixtures__/datos';

const dossier = crearDossier();

describe('días sin apuntar', () => {
  it('solo cuenta de lunes a viernes', () => {
    expect(esLaborable('2026-10-26')).toBe(true);
    expect(esLaborable('2026-10-30')).toBe(true);
    expect(esLaborable('2026-10-31')).toBe(false);
    expect(esLaborable('2026-11-01')).toBe(false);
  });

  it('cuenta los laborables sin ningún día apuntado', () => {
    expect(
      diasSinApuntar([{ fecha: '2026-10-27' }, { fecha: '2026-10-29' }], '2026-10-26', '2026-10-30'),
    ).toBe(3);
  });

  it('la semana entera sin apuntar son cinco días, no siete', () => {
    expect(diasSinApuntar([], '2026-10-26', '2026-11-01')).toBe(5);
  });

  it('un día de ausencia también cuenta como apuntado', () => {
    expect(diasSinApuntar([{ fecha: '2026-10-28' }], '2026-10-26', '2026-10-30')).toBe(4);
  });

  it('sin días en el rango no hay nada que contar', () => {
    expect(diasSinApuntar([], '2026-10-30', '2026-10-26')).toBe(0);
  });

  it('el año entero sin apuntar son los laborables del año', () => {
    expect(diasSinApuntar([], '2026-01-01', '2026-12-31')).toBe(261);
  });

  it('no admite días negativos, decimales ni más de un año', () => {
    for (const dias of [-1, 1.5, 400]) {
      expect(() => comprobarDiasSinApuntar(dias)).toThrow('entre 0 y 365');
    }
    expect(() => comprobarDiasSinApuntar(0)).not.toThrow();
    expect(() => comprobarDiasSinApuntar(365)).not.toThrow();
  });
});

describe('darToque', () => {
  let toques: ToquesFalsos;

  beforeEach(() => {
    toques = new ToquesFalsos();
  });

  it('el profe tutor da el toque con los días que ha calculado', async () => {
    const toque = await darToque(toques, profe, dossier, 4);
    expect(toque).toMatchObject({ dossierId: 'd1', diasSinApuntar: 4, dadoPor: profe.id });
    expect(toques.toques).toHaveLength(1);
  });

  it('nadie más: ni el alumno, ni el instituto, ni la generalitat, ni otro profe', async () => {
    for (const usuario of [alumno, otroAlumno, instituto, generalitat, otroProfe]) {
      await expect(darToque(toques, usuario, dossier, 3)).rejects.toThrow(SinPermisoError);
    }
    expect(toques.toques).toEqual([]);
  });

  it('no deja dar un toque con días imposibles', async () => {
    await expect(darToque(toques, profe, dossier, 400)).rejects.toThrow('entre 0 y 365');
    expect(toques.toques).toEqual([]);
  });
});

describe('lo que ve el alumno', () => {
  let toques: ToquesFalsos;

  beforeEach(() => {
    toques = new ToquesFalsos();
  });

  it('solo los que siguen pendientes, y sabe cuál no ha visto', async () => {
    await darToque(toques, profe, dossier, 2);
    await darToque(toques, profe, crearDossier({ id: 'd2' }), 5);
    toques.toques[0].resueltoEn = '2026-10-28T09:00:00.000Z';
    const pendientes = await toquesPendientes(toques);
    expect(pendientes.map((t) => t.dossierId)).toEqual(['d1']);
    expect(sinVer(pendientes[0])).toBe(true);
  });

  it('el alumno marca el toque como visto, y solo la primera vez', async () => {
    const toque = await darToque(toques, profe, dossier, 2);
    const visto = await marcarToqueVisto(toques, alumno, dossier, toque);
    expect(visto.vistoEn).toBe('2026-10-28T08:00:00.000Z');
    const otraVez = await marcarToqueVisto(toques, alumno, dossier, visto);
    expect(otraVez.vistoEn).toBe('2026-10-28T08:00:00.000Z');
  });

  it('no lo marca quien no es el alumno de ese dossier', async () => {
    const toque = await darToque(toques, profe, dossier, 2);
    for (const usuario of [profe, otroAlumno, instituto]) {
      await expect(marcarToqueVisto(toques, usuario, dossier, toque)).rejects.toThrow(
        SinPermisoError,
      );
    }
    expect(toques.toques[0].vistoEn).toBeNull();
  });

  it('un toque de otro dossier no se marca desde este', async () => {
    const ajeno = await darToque(toques, profe, crearDossier({ id: 'd2' }), 2);
    await expect(marcarToqueVisto(toques, alumno, dossier, ajeno)).rejects.toThrow(SinPermisoError);
  });
});

describe('ultimosToques', () => {
  it('devuelve el último de cada dossier pedido', async () => {
    const toques = new ToquesFalsos();
    await darToque(toques, profe, dossier, 3);
    await darToque(toques, profe, dossier, 6);
    await darToque(toques, profe, crearDossier({ id: 'd2' }), 2);
    const ultimos = await ultimosToques(toques, ['d1', 'd2', 'd3']);
    expect(ultimos.map((t) => [t.dossierId, t.diasSinApuntar])).toEqual([
      ['d2', 2],
      ['d1', 6],
    ]);
  });
});

import { contarDias, horasPorActividad } from '../horas-actividad';

const actividades = [
  { id: 'b', descripcion: 'Datos', orden: 2 },
  { id: 'a', descripcion: 'Interfaces', orden: 1 },
  { id: 'c', descripcion: 'Pruebas', orden: 3 },
];

describe('horasPorActividad', () => {
  it('suma las horas de cada actividad en su orden, con las sin horas a 0', () => {
    const r = horasPorActividad(actividades, [
      { horas: [{ actividadId: 'a', horas: 6 }] },
      {
        horas: [
          { actividadId: 'a', horas: 1.5 },
          { actividadId: 'b', horas: 2.5 },
        ],
      },
      { horas: [] },
    ]);
    expect(r.map((x) => [x.actividad.id, x.horas, x.porcentaje])).toEqual([
      ['a', 7.5, 75],
      ['b', 2.5, 25],
      ['c', 0, 0],
    ]);
  });

  it('sin registros todo a 0', () => {
    expect(
      horasPorActividad(actividades, []).every((x) => x.horas === 0 && x.porcentaje === 0),
    ).toBe(true);
  });
});

describe('contarDias', () => {
  it('cuenta los días por tipo', () => {
    expect(
      contarDias([
        { tipo: 'trabajo' },
        { tipo: 'trabajo' },
        { tipo: 'ausencia' },
        { tipo: 'festivo' },
      ]),
    ).toEqual({ trabajo: 2, ausencia: 1, festivo: 1 });
  });
});

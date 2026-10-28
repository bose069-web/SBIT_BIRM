import {
  agruparPorAlumno,
  alumnosSinApuntar,
  laborablesEntre,
  textoToque,
  TITULO_TOQUE,
  toquePendiente,
} from '../avisos-profe';

// 2026-10-28 es miércoles.
const HOY = '2026-10-28';

describe('laborablesEntre', () => {
  it('no cuenta ni el día de inicio ni hoy', () => {
    expect(laborablesEntre('2026-10-27', HOY)).toBe(0);
  });

  it('se salta el fin de semana', () => {
    // Del viernes 23 al miércoles 28: lunes 26 y martes 27.
    expect(laborablesEntre('2026-10-23', HOY)).toBe(2);
  });
});

describe('alumnosSinApuntar', () => {
  const base = { fechaInicio: '2026-09-15', fechaFin: '2027-03-15' };

  it('avisa de los que llevan 3 o más laborables, del que más al que menos', () => {
    const r = alumnosSinApuntar(
      [
        { ...base, dossierId: 'a', nombre: 'Ana', fechas: ['2026-10-27'] },
        { ...base, dossierId: 'b', nombre: 'Bea', fechas: ['2026-10-20', '2026-10-01'] },
        { ...base, dossierId: 'c', nombre: 'Carlos', fechas: ['2026-10-22'] },
      ],
      HOY,
    );
    expect(r.map((x) => [x.nombre, x.dias, x.ultimo])).toEqual([
      ['Bea', 5, '2026-10-20'],
      ['Carlos', 3, '2026-10-22'],
    ]);
  });

  it('sin días apuntados cuenta desde el inicio de las prácticas', () => {
    const r = alumnosSinApuntar(
      [
        {
          dossierId: 'd',
          nombre: 'Dani',
          fechaInicio: '2026-10-22',
          fechaFin: '2027-01-01',
          fechas: [],
        },
      ],
      HOY,
    );
    // Jueves 22, viernes 23, lunes 26 y martes 27.
    expect(r).toEqual([{ dossierId: 'd', nombre: 'Dani', dias: 4, ultimo: null }]);
  });

  it('no avisa si las prácticas no han empezado o ya han acabado, ni cuenta días futuros', () => {
    expect(
      alumnosSinApuntar(
        [
          {
            dossierId: 'e',
            nombre: 'Eva',
            fechaInicio: '2026-11-01',
            fechaFin: '2027-01-01',
            fechas: [],
          },
          {
            dossierId: 'f',
            nombre: 'Fran',
            fechaInicio: '2026-01-01',
            fechaFin: '2026-06-01',
            fechas: [],
          },
          { ...base, dossierId: 'g', nombre: 'Gala', fechas: ['2026-10-01', '2026-11-03'] },
        ],
        HOY,
      ).map((x) => x.nombre),
    ).toEqual(['Gala']);
  });
});

describe('textoToque', () => {
  it('dice cuántos días lleva', () => {
    expect(
      textoToque({ dossierId: 'a', nombre: 'Ana', dias: 1, ultimo: null }).descripcion,
    ).toMatch(/^Llevas 1 día laborable sin/);
  });
});

describe('toquePendiente', () => {
  it('devuelve el último toque sin cumplir e ignora el resto de tareas', () => {
    expect(
      toquePendiente([
        { titulo: TITULO_TOQUE, completada: false, fechaLimite: '2026-10-20' },
        { titulo: TITULO_TOQUE, completada: false, fechaLimite: '2026-10-27' },
        { titulo: TITULO_TOQUE, completada: true, fechaLimite: '2026-10-28' },
        { titulo: 'Memoria', completada: false, fechaLimite: '2026-10-30' },
      ]),
    ).toBe('2026-10-27');
  });

  it('null si no hay toques pendientes', () => {
    expect(toquePendiente([{ titulo: TITULO_TOQUE, completada: true, fechaLimite: null }])).toBe(
      null,
    );
  });
});

describe('agruparPorAlumno', () => {
  it('suma días y horas por alumno, con más días primero', () => {
    expect(
      agruparPorAlumno([
        { dossierId: 'a', nombre: 'Ana', fecha: '2026-10-26', horas: 6 },
        { dossierId: 'b', nombre: 'Bea', fecha: '2026-10-26', horas: 4 },
        { dossierId: 'b', nombre: 'Bea', fecha: '2026-10-27', horas: 5 },
      ]),
    ).toEqual([
      { dossierId: 'b', nombre: 'Bea', dias: 2, horas: 9, ultimo: '2026-10-27' },
      { dossierId: 'a', nombre: 'Ana', dias: 1, horas: 6, ultimo: '2026-10-26' },
    ]);
  });
});

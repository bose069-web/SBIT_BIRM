import { esFinDeSemana, estadoDia, semanasDelMes, sumarMeses } from '../calendario';

describe('semanasDelMes', () => {
  it('empieza en lunes y rellena los huecos', () => {
    // Octubre de 2026 empieza en jueves y acaba en sábado.
    const semanas = semanasDelMes('2026-10');
    expect(semanas[0]).toEqual([
      null,
      null,
      null,
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ]);
    expect(semanas.at(-1)).toEqual([
      '2026-10-26',
      '2026-10-27',
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
      null,
    ]);
    expect(semanas.every((s) => s.length === 7)).toBe(true);
  });

  it('febrero de un año no bisiesto que empieza en lunes cabe en 4 semanas', () => {
    expect(semanasDelMes('2027-02')).toHaveLength(4);
  });
});

describe('sumarMeses', () => {
  it('cruza de año en los dos sentidos', () => {
    expect(sumarMeses('2026-12', 1)).toBe('2027-01');
    expect(sumarMeses('2027-01', -1)).toBe('2026-12');
  });
});

describe('estadoDia', () => {
  const periodo = { fechaInicio: '2026-09-15', fechaFin: '2027-03-15' };
  const hoy = '2026-10-27';

  it('fuera del periodo', () => {
    expect(estadoDia('2026-09-14', undefined, periodo, hoy)).toBe('fuera');
  });

  it('lo apuntado manda', () => {
    expect(estadoDia('2026-10-05', { tipo: 'trabajo' }, periodo, hoy)).toBe('trabajo');
    expect(estadoDia('2026-10-06', { tipo: 'ausencia' }, periodo, hoy)).toBe('ausencia');
    expect(estadoDia('2026-10-12', { tipo: 'festivo' }, periodo, hoy)).toBe('festivo');
  });

  it('sin apuntar: pendiente si es laborable ya pasado, libre en fin de semana, futuro después de hoy', () => {
    expect(esFinDeSemana('2026-10-24')).toBe(true);
    expect(estadoDia('2026-10-23', undefined, periodo, hoy)).toBe('pendiente');
    expect(estadoDia('2026-10-27', undefined, periodo, hoy)).toBe('pendiente');
    expect(estadoDia('2026-10-24', undefined, periodo, hoy)).toBe('libre');
    expect(estadoDia('2026-10-28', undefined, periodo, hoy)).toBe('futuro');
  });
});

import { filtrarHoras, leerHoras } from '../horas';

describe('leerHoras', () => {
  it('vacío no es error', () => {
    expect(leerHoras('  ')).toEqual({ tipo: 'vacio' });
  });

  it('acepta coma o punto en tramos de 15 min', () => {
    expect(leerHoras('1,5')).toEqual({ tipo: 'ok', horas: 1.5 });
    expect(leerHoras('7.25')).toEqual({ tipo: 'ok', horas: 7.25 });
    expect(leerHoras('8')).toEqual({ tipo: 'ok', horas: 8 });
  });

  it('explica qué está mal', () => {
    expect(leerHoras('0')).toMatchObject({ tipo: 'error', motivo: 'Tiene que ser más de 0' });
    expect(leerHoras('1,3')).toMatchObject({ tipo: 'error' });
    expect(leerHoras('abc')).toMatchObject({ tipo: 'error' });
    expect(leerHoras('1,5,5')).toMatchObject({ tipo: 'error' });
  });
});

describe('filtrarHoras', () => {
  it('deja solo cifras y una coma con dos decimales', () => {
    expect(filtrarHoras('7.5')).toBe('7,5');
    expect(filtrarHoras('1,255')).toBe('1,25');
    expect(filtrarHoras('2,,5')).toBe('2,5');
    expect(filtrarHoras('3h')).toBe('3');
  });
});

import { fechaCorta, fechaLarga, formatoHoras, limitesMes, nombreMes, sumarDias } from '../fechas';

describe('fechas', () => {
  it('escribe la fecha larga con el día de la semana', () => {
    expect(fechaLarga('2026-10-27')).toBe('martes 27 de octubre');
    expect(fechaLarga('2027-01-03')).toBe('domingo 3 de enero');
  });

  it('suma días cambiando de mes y de año', () => {
    expect(sumarDias('2026-10-31', 1)).toBe('2026-11-01');
    expect(sumarDias('2027-01-01', -1)).toBe('2026-12-31');
  });

  it('da los límites del mes, también en febrero bisiesto', () => {
    expect(limitesMes('2026-10-27')).toEqual(['2026-10-01', '2026-10-31']);
    expect(limitesMes('2028-02-10')).toEqual(['2028-02-01', '2028-02-29']);
  });

  it('formatea fechas, meses y horas en español', () => {
    expect(fechaCorta('2026-10-27')).toBe('27 oct 2026');
    expect(nombreMes('2026-09')).toBe('septiembre 2026');
    expect(formatoHoras(6)).toBe('6 h');
    expect(formatoHoras(5.5)).toBe('5,5 h');
    expect(formatoHoras(7.25)).toBe('7,25 h');
  });
});

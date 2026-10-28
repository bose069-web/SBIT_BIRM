import { leerFecha } from '../fecha-escrita';

describe('leerFecha', () => {
  it('vacía no es error', () => {
    expect(leerFecha('  ')).toEqual({ tipo: 'vacia' });
  });

  it('acepta AAAA-MM-DD y DD/MM/AAAA', () => {
    expect(leerFecha('2026-11-06')).toEqual({ tipo: 'ok', fecha: '2026-11-06' });
    expect(leerFecha('6/11/2026')).toEqual({ tipo: 'ok', fecha: '2026-11-06' });
    expect(leerFecha('06-11-2026')).toEqual({ tipo: 'ok', fecha: '2026-11-06' });
  });

  it('rechaza formatos raros y días que no existen', () => {
    expect(leerFecha('mañana')).toMatchObject({ tipo: 'error' });
    expect(leerFecha('31/02/2027')).toEqual({ tipo: 'error', motivo: 'Ese día no existe' });
  });
});

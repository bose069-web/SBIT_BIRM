import type { Evento } from '@/core/domain/evento';

import { fechasDeLaRed, recordatoriosDelMes } from '../calendario-red';

const eventos: Evento[] = [
  { id: 'f', dossierId: null, titulo: 'Todos los Santos', fecha: '2026-11-01', tipo: 'festivo' },
  { id: 'p', dossierId: null, titulo: 'Entrega de actas', fecha: '2026-11-20', tipo: 'plazo' },
  { id: 'a', dossierId: 'd1', titulo: 'Visita a la empresa', fecha: '2026-11-12', tipo: 'reunion' },
  { id: 'o', dossierId: null, titulo: 'Otro mes', fecha: '2026-12-08', tipo: 'festivo' },
];

describe('recordatoriosDelMes', () => {
  it('pone los avisos del día 1 y del día 5 sobre el mes anterior', () => {
    const r = recordatoriosDelMes('2026-11');
    expect(r.map((x) => [x.fecha, x.tipo, x.automatico])).toEqual([
      ['2026-11-01', 'plazo', true],
      ['2026-11-05', 'plazo', true],
    ]);
    expect(r[0].titulo).toBe('Las empresas validan octubre');
  });

  it('en enero el mes anterior es diciembre', () => {
    expect(recordatoriosDelMes('2027-01')[0].titulo).toMatch(/diciembre/);
  });
});

describe('fechasDeLaRed', () => {
  it('solo fechas generales del mes y los recordatorios, por fecha', () => {
    expect(fechasDeLaRed(eventos, '2026-11').map((f) => f.id)).toEqual([
      'f',
      'recordatorio-2026-11-1',
      'recordatorio-2026-11-5',
      'p',
    ]);
  });

  it('nunca enseña fechas de un dossier', () => {
    expect(fechasDeLaRed(eventos, '2026-11').some((f) => f.id === 'a')).toBe(false);
  });

  it('filtra por tipo', () => {
    expect(fechasDeLaRed(eventos, '2026-11', ['festivo']).map((f) => f.id)).toEqual(['f']);
  });
});

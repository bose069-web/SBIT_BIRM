import { crearDossier } from '@/core/__fixtures__/datos';

import { avisosAlumno, calcularRitmo } from '../ritmo';

const HOY = '2026-10-29';
const dossier = crearDossier();

describe('calcularRitmo', () => {
  it('compara las horas hechas con las que tocan por calendario', () => {
    const ritmo = calcularRitmo(dossier, 159, HOY);
    expect(ritmo.esperadas).toBe(99);
    expect(ritmo.porcentajeEsperado).toBe(25);
    expect(ritmo.desviacion).toBe(60);
    expect(ritmo.porcentaje).toBe(40);
    expect(ritmo.diasRestantes).toBe(137);
    expect(ritmo.estado).toBe('al_dia');
  });

  it('marca por debajo cuando se aleja más de un 10 % de las horas totales', () => {
    expect(calcularRitmo(dossier, 40, HOY).estado).toBe('por_debajo');
    // 39 h por detrás de 400 es todavía margen.
    expect(calcularRitmo(dossier, 60, HOY).estado).toBe('al_dia');
  });

  it('antes de empezar no hay ritmo', () => {
    const ritmo = calcularRitmo(dossier, 0, '2026-09-01');
    expect(ritmo.estado).toBe('sin_empezar');
    expect(ritmo.esperadas).toBe(0);
    expect(ritmo.diasRestantes).toBe(195);
  });

  it('al acabar, lo que cuenta son las horas totales del dossier', () => {
    const ritmo = calcularRitmo(dossier, 400, '2027-04-01');
    expect(ritmo.estado).toBe('terminadas');
    expect(ritmo.esperadas).toBe(400);
    expect(ritmo.desviacion).toBe(0);
    expect(ritmo.diasRestantes).toBe(-17);
  });
});

describe('avisosAlumno', () => {
  it('no avisa de nada si apunta y va al ritmo', () => {
    expect(avisosAlumno(dossier, 159, '2026-10-26', HOY)).toEqual([]);
  });

  it('avisa de que ha dejado de apuntar y de que va por detrás', () => {
    expect(avisosAlumno(dossier, 40, '2026-10-20', HOY)).toEqual([
      'Sin apuntar desde el 20 oct 2026',
      'Va 59 h por debajo del ritmo',
    ]);
  });

  it('avisa si no ha apuntado nunca, pasados unos días desde el inicio', () => {
    expect(avisosAlumno(dossier, 0, null, HOY)).toEqual([
      'No ha apuntado ningún día todavía',
      'Va 99 h por debajo del ritmo',
    ]);
  });

  it('avisa de que se acaban las prácticas', () => {
    const corto = crearDossier({ fechaFin: '2026-11-08' });
    expect(avisosAlumno(corto, 300, HOY, HOY)).toEqual(['Le quedan 10 días de prácticas']);
  });

  it('no avisa antes de empezar', () => {
    expect(avisosAlumno(dossier, 0, null, '2026-09-01')).toEqual([]);
  });
});

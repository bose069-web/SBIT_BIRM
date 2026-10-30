import { avisosSeguimiento, UMBRAL_ATRASO, type SeguimientoAlumno } from '../avisos-seguimiento';

const alDia: SeguimientoAlumno = {
  alumno: 'Ana',
  diasSinApuntar: 0,
  mesesSinValorar: [],
  porcentaje: 80,
  terminado: false,
  tieneFinal: false,
};

describe('avisosSeguimiento', () => {
  it('no avisa de un alumno al día', () => {
    expect(avisosSeguimiento([alDia])).toEqual([]);
  });

  it('avisa de quien lleva días sin apuntar, en rojo', () => {
    const [aviso] = avisosSeguimiento([{ ...alDia, diasSinApuntar: 5 }]);
    expect(aviso).toEqual({
      tipo: 'sin-apuntar',
      alumno: 'Ana',
      motivo: 'Lleva 5 días laborables sin apuntar horas',
      color: 'danger',
    });
  });

  it('singular: un solo día laborable', () => {
    const [aviso] = avisosSeguimiento([{ ...alDia, diasSinApuntar: 1 }]);
    expect(aviso.motivo).toBe('Lleva 1 día laborable sin apuntar horas');
  });

  it('lista los meses sin valorar con su nombre', () => {
    const [aviso] = avisosSeguimiento([{ ...alDia, mesesSinValorar: ['2026-09', '2026-10'] }]);
    expect(aviso.tipo).toBe('sin-valorar');
    expect(aviso.motivo).toBe('La empresa no ha valorado septiembre 2026, octubre 2026');
    expect(aviso.color).toBe('estadoPendiente');
  });

  it('avisa por debajo del umbral, pero no justo en el umbral', () => {
    const bajo = avisosSeguimiento([{ ...alDia, porcentaje: UMBRAL_ATRASO - 1 }]);
    const justo = avisosSeguimiento([{ ...alDia, porcentaje: UMBRAL_ATRASO }]);
    expect(bajo.map((a) => a.tipo)).toEqual(['atrasado']);
    expect(justo).toEqual([]);
  });

  it('el motivo del atraso lleva el porcentaje', () => {
    const [aviso] = avisosSeguimiento([{ ...alDia, porcentaje: 37 }]);
    expect(aviso.motivo).toBe('Solo lleva el 37% de sus horas');
  });

  it('si las prácticas ya acabaron no avisa de atraso', () => {
    const avisos = avisosSeguimiento([
      { ...alDia, porcentaje: 30, terminado: true, tieneFinal: true },
    ]);
    expect(avisos).toEqual([]);
  });

  it('avisa si acabó sin valoración final', () => {
    const [aviso] = avisosSeguimiento([{ ...alDia, porcentaje: 100, terminado: true }]);
    expect(aviso).toEqual({
      tipo: 'sin-final',
      alumno: 'Ana',
      motivo: 'Prácticas acabadas sin valoración final',
      color: 'estadoPendiente',
    });
  });

  it('ordena de lo más urgente a lo menos: sin apuntar, sin valorar, atrasado, sin final', () => {
    const avisos = avisosSeguimiento([
      { ...alDia, alumno: 'Dan', terminado: true, tieneFinal: false },
      { ...alDia, alumno: 'Eva', porcentaje: 40 },
      { ...alDia, alumno: 'Berta', mesesSinValorar: ['2026-09'] },
      { ...alDia, alumno: 'Carla', diasSinApuntar: 4 },
    ]);
    expect(avisos.map((a) => a.tipo)).toEqual([
      'sin-apuntar',
      'sin-valorar',
      'atrasado',
      'sin-final',
    ]);
  });

  it('dentro de un tipo, el que más lejos está sale primero', () => {
    const avisos = avisosSeguimiento([
      { ...alDia, alumno: 'Berta', diasSinApuntar: 4 },
      { ...alDia, alumno: 'Ana', diasSinApuntar: 9 },
      { ...alDia, alumno: 'Carla', diasSinApuntar: 4 },
    ]);
    expect(avisos.map((a) => a.alumno)).toEqual(['Ana', 'Berta', 'Carla']);
  });

  it('un alumno con varios avisos aparece en cada uno', () => {
    const avisos = avisosSeguimiento([
      { ...alDia, diasSinApuntar: 6, mesesSinValorar: ['2026-09'], porcentaje: 20 },
    ]);
    expect(avisos.map((a) => a.tipo)).toEqual(['sin-apuntar', 'sin-valorar', 'atrasado']);
  });
});

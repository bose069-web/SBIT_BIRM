import {
  barrasProgreso,
  colorAlumno,
  nombreCorto,
  resumirSeguimiento,
  type AlumnoSeguido,
} from '../seguimiento-profe';

const ana: AlumnoSeguido = {
  nombre: 'Ana López',
  porcentaje: 80,
  mesesSinValorar: 0,
  tieneFinal: true,
};
const bea: AlumnoSeguido = {
  nombre: 'Bea Ruiz',
  porcentaje: 20,
  mesesSinValorar: 2,
  tieneFinal: false,
};
const carlos: AlumnoSeguido = {
  nombre: 'Carlos Gil',
  porcentaje: 50,
  mesesSinValorar: 0,
  tieneFinal: false,
};

describe('resumirSeguimiento', () => {
  it('cuenta alumnos, media, pendientes de empresa y con final', () => {
    expect(resumirSeguimiento([ana, bea, carlos])).toEqual({
      alumnos: 3,
      mediaPorcentaje: 50,
      pendientesEmpresa: 1,
      conFinal: 1,
    });
  });

  it('sin alumnos todo a 0', () => {
    expect(resumirSeguimiento([])).toEqual({
      alumnos: 0,
      mediaPorcentaje: 0,
      pendientesEmpresa: 0,
      conFinal: 0,
    });
  });
});

describe('barrasProgreso', () => {
  it('ordena del más atrasado al más avanzado, con color por estado', () => {
    expect(barrasProgreso([ana, bea, carlos]).map((b) => [b.etiqueta, b.valor, b.color])).toEqual([
      ['Bea', 20, 'estadoPendiente'],
      ['Carlos', 50, 'primary'],
      ['Ana', 80, 'estadoValidado'],
    ]);
  });

  it('nombres de pila repetidos van completos', () => {
    const otraAna = { ...carlos, nombre: 'Ana Gil' };
    expect(barrasProgreso([ana, otraAna]).map((b) => b.etiqueta)).toEqual(['Ana Gil', 'Ana López']);
  });

  it('se queda con los primeros si hay muchos', () => {
    expect(barrasProgreso([ana, bea, carlos], 2)).toHaveLength(2);
  });
});

describe('colorAlumno y nombreCorto', () => {
  it('la valoración final manda sobre los meses pendientes', () => {
    expect(colorAlumno({ ...bea, tieneFinal: true })).toBe('estadoValidado');
  });

  it('nombre de pila', () => {
    expect(nombreCorto('  Ana María López ')).toBe('Ana');
  });
});

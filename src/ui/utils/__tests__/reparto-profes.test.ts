import { profesConAlumnos } from '../reparto-profes';

type Persona = { nombre: string; profeId: string | null };

const pau = { id: 'p1', nombre: 'Pau' };
const rut = { id: 'p2', nombre: 'Rut' };
const ana: Persona = { nombre: 'Ana', profeId: 'p2' };
const leo: Persona = { nombre: 'Leo', profeId: 'p1' };
const sinProfe: Persona = { nombre: 'Marta', profeId: null };

describe('profesConAlumnos', () => {
  it('mete cada alumno bajo su profe y ordena por nombre', () => {
    const secciones = profesConAlumnos([pau, rut], [ana, leo]);
    expect(secciones.map((s) => s.profe?.nombre)).toEqual(['Pau', 'Rut']);
    expect(secciones[0].alumnos.map((a) => a.nombre)).toEqual(['Leo']);
    expect(secciones[1].alumnos.map((a) => a.nombre)).toEqual(['Ana']);
  });

  it('el profe sin alumnos sale con la lista vacía', () => {
    const secciones = profesConAlumnos([pau, rut], [leo]);
    expect(secciones.map((s) => [s.profe?.nombre, s.alumnos.length])).toEqual([
      ['Pau', 1],
      ['Rut', 0],
    ]);
  });

  it('lo que no tiene profe queda en la última sección', () => {
    const secciones = profesConAlumnos([pau], [leo, sinProfe]);
    const ultima = secciones[secciones.length - 1];
    expect(ultima.profe).toBeNull();
    expect(ultima.alumnos.map((a) => a.nombre)).toEqual(['Marta']);
  });

  it('sin profes ni alumnos, no hay secciones', () => {
    expect(profesConAlumnos([], [])).toEqual([]);
  });

  it('un alumno con profe que no está en la lista va a la sección sin profe', () => {
    const secciones = profesConAlumnos([pau], [{ nombre: 'Ana', profeId: 'p99' }]);
    expect(secciones[secciones.length - 1].profe).toBeNull();
    expect(secciones[secciones.length - 1].alumnos).toHaveLength(1);
  });
});

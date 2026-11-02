import {
  asignarAlumnosAClase,
  borrarGrupo,
  crearGrupo,
  editarGrupo,
  listarClases,
  misClases,
  quitarAlumnosDeClase,
} from '../application/clases';
import { DatosInvalidosError, SinPermisoError } from '../domain/errores';
import { comprobarGrupo, nombreGrupo, normalizarGrupo, ordenarGrupos } from '../domain/grupo';
import {
  alumno,
  crearDossier,
  DossiersFalsos,
  generalitat,
  GruposFalsos,
  instituto,
  otroAlumno,
  otroInstituto,
  otroProfe,
  profe,
} from '../__fixtures__/datos';

const nuevo = { id: null, centroId: 'c1', ciclo: 'DAW', curso: 1, letra: 'B' };

describe('nombre y reglas de una clase', () => {
  it('se nombra ciclo, curso y letra', () => {
    expect(nombreGrupo({ ciclo: 'DAM', curso: 2, letra: 'A' })).toBe('DAM 2 A');
  });

  it('quita espacios y pone la letra en mayúscula', () => {
    expect(normalizarGrupo({ ...nuevo, ciclo: '  DAM ', letra: ' a ' })).toMatchObject({
      ciclo: 'DAM',
      letra: 'A',
    });
  });

  it.each([
    ['sin ciclo', { ciclo: '   ' }, 'Indica el ciclo'],
    ['ciclo larguísimo', { ciclo: 'A'.repeat(21) }, 'no puede pasar'],
    ['curso 0', { curso: 0 }, 'El curso va de 1 a 4'],
    ['curso 5', { curso: 5 }, 'El curso va de 1 a 4'],
    ['curso decimal', { curso: 1.5 }, 'El curso va de 1 a 4'],
    ['letra de dos', { letra: 'AB' }, 'una sola letra'],
    ['sin letra', { letra: '' }, 'una sola letra'],
  ])('rechaza %s', (_caso, cambios, mensaje) => {
    expect(() => comprobarGrupo({ ...nuevo, ...cambios })).toThrow(mensaje);
  });

  it('ordena por ciclo, curso y letra', () => {
    const grupos = [
      { ciclo: 'DAW', curso: 1, letra: 'B' },
      { ciclo: 'DAM', curso: 2, letra: 'B' },
      { ciclo: 'DAM', curso: 1, letra: 'A' },
    ];
    expect(ordenarGrupos(grupos).map(nombreGrupo)).toEqual(['DAM 1 A', 'DAM 2 B', 'DAW 1 B']);
  });
});

describe('crearGrupo', () => {
  it('el instituto crea una clase de su centro, ya normalizada', async () => {
    const grupos = new GruposFalsos();
    const creado = await crearGrupo(grupos, instituto, { ...nuevo, ciclo: ' DAW ' });
    expect(creado).toMatchObject({ centroId: 'c1', ciclo: 'DAW', curso: 1, letra: 'B' });
  });

  it('la generalitat también, en cualquier centro', async () => {
    const grupos = new GruposFalsos();
    await expect(
      crearGrupo(grupos, generalitat, { ...nuevo, centroId: 'c2' }),
    ).resolves.toMatchObject({ centroId: 'c2' });
  });

  it('el instituto de otro centro, el profe y el alumno no', async () => {
    const grupos = new GruposFalsos();
    for (const usuario of [otroInstituto, profe, alumno]) {
      await expect(crearGrupo(grupos, usuario, nuevo)).rejects.toThrow(SinPermisoError);
    }
    expect(grupos.grupos).toHaveLength(1);
  });

  it('no crea una clase con datos imposibles', async () => {
    const grupos = new GruposFalsos();
    await expect(crearGrupo(grupos, instituto, { ...nuevo, curso: 7 })).rejects.toThrow(
      DatosInvalidosError,
    );
  });
});

describe('editar y borrar clases', () => {
  const clase = { id: 'g1', centroId: 'c1', ciclo: 'DAM', curso: 2, letra: 'A' };

  it('edita la clase de su centro', async () => {
    const grupos = new GruposFalsos();
    const cambiada = await editarGrupo(grupos, instituto, clase, {
      ciclo: 'DAM',
      curso: 3,
      letra: 'A',
    });
    expect(cambiada).toMatchObject({ curso: 3, letra: 'A' });
  });

  it('no edita ni borra las de otro centro', async () => {
    const grupos = new GruposFalsos();
    await expect(
      editarGrupo(grupos, otroInstituto, clase, { ciclo: 'DAW', curso: 1, letra: 'B' }),
    ).rejects.toThrow(SinPermisoError);
    await expect(borrarGrupo(grupos, otroInstituto, clase)).rejects.toThrow(SinPermisoError);
    expect(grupos.grupos).toHaveLength(1);
  });

  it('al borrar, sus alumnos se quedan sin clase', async () => {
    const grupos = new GruposFalsos();
    await borrarGrupo(grupos, instituto, {
      id: 'g1',
      centroId: 'c1',
      ciclo: 'DAM',
      curso: 2,
      letra: 'A',
    });
    expect(grupos.grupos).toEqual([]);
    expect(grupos.alumnos.every((a) => a.grupoId === null)).toBe(true);
  });
});

describe('repartir alumnos en clases', () => {
  it('el instituto mete varios alumnos de su centro de una vez', async () => {
    const grupos = new GruposFalsos();
    const clase = { id: 'g1', centroId: 'c1', ciclo: 'DAM', curso: 2, letra: 'A' };
    await asignarAlumnosAClase(grupos, instituto, clase, [alumno.id, otroAlumno.id]);
    expect(grupos.asignados).toEqual({ grupoId: 'g1', alumnoIds: [alumno.id, otroAlumno.id] });
    expect(grupos.alumnos.every((a) => a.grupoId === 'g1')).toBe(true);
  });

  it('sin alumnos o con uno desconocido, no toca nada', async () => {
    const grupos = new GruposFalsos();
    const clase = { id: 'g1', centroId: 'c1', ciclo: 'DAM', curso: 2, letra: 'A' };
    await expect(asignarAlumnosAClase(grupos, instituto, clase, [])).rejects.toThrow('al menos un');
    await expect(asignarAlumnosAClase(grupos, instituto, clase, ['desconocido'])).rejects.toThrow(
      'Solo los alumnos del centro',
    );
    expect(grupos.asignados).toBeNull();
  });

  it('no reparte alumnos de un centro en el que no manda', async () => {
    const grupos = new GruposFalsos();
    const clase = { id: 'g1', centroId: 'c1', ciclo: 'DAM', curso: 2, letra: 'A' };
    await expect(asignarAlumnosAClase(grupos, profe, clase, [alumno.id])).rejects.toThrow(
      SinPermisoError,
    );
    expect(grupos.asignados).toBeNull();
  });

  it('también los saca de la clase', async () => {
    const grupos = new GruposFalsos();
    const clase = { id: 'g1', centroId: 'c1', ciclo: 'DAM', curso: 2, letra: 'A' };
    await quitarAlumnosDeClase(grupos, instituto, clase, [alumno.id]);
    expect(grupos.alumnos.find((a) => a.id === alumno.id)?.grupoId).toBeNull();
  });
});

describe('listarClases y misClases', () => {
  it('las clases del centro las ve quien es del centro y la generalitat', async () => {
    const grupos = new GruposFalsos();
    await expect(listarClases(grupos, instituto, 'c1')).resolves.toHaveLength(1);
    await expect(listarClases(grupos, generalitat, 'c2')).resolves.toHaveLength(0);
    await expect(listarClases(grupos, otroInstituto, 'c1')).rejects.toThrow(SinPermisoError);
  });

  it('el profe ve las clases donde están sus alumnos', async () => {
    const grupos = new GruposFalsos();
    const dossiers = new DossiersFalsos();
    dossiers.dossiers = [crearDossier()];
    const clases = await misClases(grupos, dossiers, profe);
    expect(clases).toHaveLength(1);
    expect(nombreGrupo(clases[0].grupo)).toBe('DAM 2 A');
    expect(clases[0].alumnos.map((a) => a.id)).toEqual([alumno.id]);
  });

  it('un profe sin alumnos no tiene clases', async () => {
    const grupos = new GruposFalsos();
    const dossiers = new DossiersFalsos();
    dossiers.dossiers = [crearDossier({ tutorId: otroProfe.id })];
    await expect(misClases(grupos, dossiers, profe)).resolves.toEqual([]);
  });

  it('solo el profe tiene "mis clases"', async () => {
    const grupos = new GruposFalsos();
    const dossiers = new DossiersFalsos();
    await expect(misClases(grupos, dossiers, alumno)).rejects.toThrow(SinPermisoError);
  });
});

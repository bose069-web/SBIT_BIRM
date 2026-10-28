import {
  borrarDossier,
  guardarDossier,
  obtenerOpcionesDossier,
  puedeCrearDossier,
} from '../application/dossier';
import type { BorradorDossier } from '../domain/dossier';
import { DatosInvalidosError, SinPermisoError } from '../domain/errores';
import {
  alumno,
  borrador as borradorDia,
  CentrosFalsos,
  crearDossier,
  DossiersFalsos,
  empresa,
  generalitat,
  instituto,
  otroInstituto,
  otroProfe,
  profe,
  RegistrosFalsos,
} from '../__fixtures__/datos';

const nuevo = (cambios: Partial<BorradorDossier> = {}): BorradorDossier => ({
  id: null,
  alumnoId: 'a1',
  centroId: 'c1',
  empresaId: 'e1',
  tutorEmpresaId: null,
  ciclo: ' DAM ',
  fechaInicio: '2026-09-15',
  fechaFin: '2027-03-15',
  horasTotales: 400,
  actividades: [{ id: null, descripcion: ' Interfaces ' }],
  ...cambios,
});

describe('quién crea dossiers', () => {
  it('instituto del centro, generalitat y profes del centro', () => {
    expect(
      [instituto, generalitat, profe, otroProfe].map((u) => puedeCrearDossier(u, 'c1')),
    ).toEqual([true, true, true, true]);
    expect([otroInstituto, alumno, empresa].map((u) => puedeCrearDossier(u, 'c1'))).toEqual([
      false,
      false,
      false,
    ]);
  });
});

describe('crear', () => {
  it('limpia textos y guarda', async () => {
    const dossiers = new DossiersFalsos();
    const d = await guardarDossier(dossiers, new RegistrosFalsos(), instituto, nuevo());
    expect(dossiers.guardados[0]).toMatchObject({
      id: null,
      ciclo: 'DAM',
      actividades: [{ id: null, descripcion: 'Interfaces' }],
    });
    expect(d.actividades).toHaveLength(1);
  });

  it('rechaza a quien no administra el centro', async () => {
    await expect(
      guardarDossier(new DossiersFalsos(), new RegistrosFalsos(), otroInstituto, nuevo()),
    ).rejects.toThrow(SinPermisoError);
  });

  it.each([
    [{ ciclo: ' ' }, 'ciclo'],
    [{ fechaFin: '2026-01-01' }, 'fin'],
    [{ fechaInicio: '15/09/2026' }, 'Fechas'],
    [{ horasTotales: 0 }, 'horas'],
    [{ horasTotales: 10.5 }, 'horas'],
    [{ actividades: [] }, 'actividad'],
    [
      {
        actividades: [
          { id: null, descripcion: 'A' },
          { id: null, descripcion: ' a ' },
        ],
      },
      'repetida',
    ],
    [{ empresaId: '' }, 'empresa'],
  ])('valida %p', async (cambios, texto) => {
    await expect(
      guardarDossier(new DossiersFalsos(), new RegistrosFalsos(), instituto, nuevo(cambios)),
    ).rejects.toThrow(new RegExp(texto, 'i'));
  });
});

describe('editar', () => {
  const actual = crearDossier();
  const edicion = (cambios: Partial<BorradorDossier> = {}) =>
    nuevo({
      id: actual.id,
      actividades: actual.actividades.map((a) => ({ id: a.id, descripcion: a.descripcion })),
      ...cambios,
    });

  it('el profe tutor puede; otro profe no', async () => {
    const registros = new RegistrosFalsos();
    await expect(
      guardarDossier(new DossiersFalsos(), registros, profe, edicion(), actual),
    ).resolves.toBeTruthy();
    await expect(
      guardarDossier(new DossiersFalsos(), registros, otroProfe, edicion(), actual),
    ).rejects.toThrow(SinPermisoError);
  });

  it('no cambia alumno ni centro', async () => {
    await expect(
      guardarDossier(
        new DossiersFalsos(),
        new RegistrosFalsos(),
        instituto,
        edicion({ alumnoId: 'a2' }),
        actual,
      ),
    ).rejects.toThrow(DatosInvalidosError);
  });

  it('no quita actividades con horas, sí las que no tienen', async () => {
    const registros = new RegistrosFalsos();
    await registros.guardar(borradorDia({ horas: [{ actividadId: 'act1', horas: 6 }] }));
    const sinAct1 = edicion({ actividades: [{ id: 'act2', descripcion: 'Datos' }] });
    await expect(
      guardarDossier(new DossiersFalsos(), registros, instituto, sinAct1, actual),
    ).rejects.toThrow(/Interfaces/);
    const sinAct2 = edicion({ actividades: [{ id: 'act1', descripcion: 'Interfaces' }] });
    await expect(
      guardarDossier(new DossiersFalsos(), registros, instituto, sinAct2, actual),
    ).resolves.toBeTruthy();
  });
});

describe('borrar', () => {
  it('solo quien administra el centro y sin días registrados', async () => {
    const dossiers = new DossiersFalsos();
    const registros = new RegistrosFalsos();
    const d = crearDossier();
    dossiers.dossiers = [d];
    await expect(borrarDossier(dossiers, registros, profe, d)).rejects.toThrow(SinPermisoError);
    await registros.guardar(borradorDia());
    await expect(borrarDossier(dossiers, registros, instituto, d)).rejects.toThrow(/registrado/);
    registros.dias = [];
    await borrarDossier(dossiers, registros, generalitat, d);
    expect(dossiers.dossiers).toEqual([]);
  });
});

describe('opciones del formulario', () => {
  it('alumnos con profe, sin profe aparte y convenios', async () => {
    const op = await obtenerOpcionesDossier(new CentrosFalsos(), instituto, 'c1');
    expect(op.alumnos.map((p) => p.nombre)).toEqual(['Ana']);
    expect(op.alumnosSinProfe.map((p) => p.nombre)).toEqual(['Biel']);
    expect(op.convenios.map((c) => c.empresaId)).toEqual(['e1']);
  });

  it('el profe solo ve a sus alumnos y otro instituto nada', async () => {
    expect((await obtenerOpcionesDossier(new CentrosFalsos(), otroProfe, 'c1')).alumnos).toEqual(
      [],
    );
    await expect(obtenerOpcionesDossier(new CentrosFalsos(), otroInstituto, 'c1')).rejects.toThrow(
      SinPermisoError,
    );
  });
});

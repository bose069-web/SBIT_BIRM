import { borrarTarea, crearTarea, listarTareas, marcarTarea } from '../application/tareas';
import { DatosInvalidosError, SinPermisoError } from '../domain/errores';
import { tareaVencida } from '../domain/tarea';
import {
  alumno,
  crearDossier,
  empresa,
  generalitat,
  instituto,
  otroAlumno,
  otroInstituto,
  otroProfe,
  profe,
  TareasFalsas,
} from '../__fixtures__/datos';

const dossier = crearDossier();
const nueva = { dossierId: 'd1', titulo: ' Memoria ', descripcion: ' ', fechaLimite: '2026-11-01' };

describe('crear tareas', () => {
  it('el profe, su instituto y la generalitat pueden; el título se limpia', async () => {
    for (const u of [profe, instituto, generalitat]) {
      const tareas = new TareasFalsas();
      const t = await crearTarea(tareas, u, dossier, nueva);
      expect(t).toMatchObject({ titulo: 'Memoria', descripcion: null, completada: false });
    }
  });

  it('nadie más puede', () => {
    for (const u of [alumno, empresa, otroProfe, otroInstituto]) {
      expect(() => crearTarea(new TareasFalsas(), u, dossier, nueva)).toThrow(SinPermisoError);
    }
  });

  it('pide título y fecha válida', () => {
    const tareas = new TareasFalsas();
    expect(() => crearTarea(tareas, profe, dossier, { ...nueva, titulo: '  ' })).toThrow(
      DatosInvalidosError,
    );
    expect(() => crearTarea(tareas, profe, dossier, { ...nueva, fechaLimite: '1/11' })).toThrow(
      DatosInvalidosError,
    );
  });
});

describe('marcar y borrar', () => {
  it('el alumno marca las suyas pero no las borra', async () => {
    const tareas = new TareasFalsas();
    const t = await crearTarea(tareas, profe, dossier, nueva);
    expect((await marcarTarea(tareas, alumno, dossier, t, true)).completada).toBe(true);
    expect(() => marcarTarea(tareas, otroAlumno, dossier, t, false)).toThrow(SinPermisoError);
    expect(() => borrarTarea(tareas, alumno, dossier, t)).toThrow(SinPermisoError);
    await borrarTarea(tareas, profe, dossier, t);
    expect(await tareas.listar('d1')).toEqual([]);
  });
});

describe('orden y vencimiento', () => {
  it('pendientes por fecha, sin fecha al final y hechas abajo', async () => {
    const tareas = new TareasFalsas();
    await crearTarea(tareas, profe, dossier, { ...nueva, titulo: 'Sin fecha', fechaLimite: null });
    await crearTarea(tareas, profe, dossier, {
      ...nueva,
      titulo: 'Tarde',
      fechaLimite: '2026-12-01',
    });
    const hecha = await crearTarea(tareas, profe, dossier, { ...nueva, titulo: 'Hecha' });
    await crearTarea(tareas, profe, dossier, { ...nueva, titulo: 'Pronto' });
    await tareas.marcar(hecha.id, true);
    expect((await listarTareas(tareas, 'd1')).map((t) => t.titulo)).toEqual([
      'Pronto',
      'Tarde',
      'Sin fecha',
      'Hecha',
    ]);
  });

  it('vencida solo si está pendiente y la fecha ya pasó', () => {
    expect(tareaVencida({ completada: false, fechaLimite: '2026-10-01' }, '2026-10-02')).toBe(true);
    expect(tareaVencida({ completada: true, fechaLimite: '2026-10-01' }, '2026-10-02')).toBe(false);
    expect(tareaVencida({ completada: false, fechaLimite: null }, '2026-10-02')).toBe(false);
  });
});

import { eliminarRegistro, guardarRegistro } from '../application/registro-diario';
import { RegistroInvalidoError, SinPermisoError } from '../domain/errores';
import { comprobarBorrador, resumirHoras, totalHoras } from '../domain/registro-diario';
import {
  alumno,
  borrador,
  crearDossier,
  otroAlumno,
  profe,
  RegistrosFalsos,
  ValoracionesFalsas,
} from '../__fixtures__/datos';

describe('comprobarBorrador', () => {
  const dossier = crearDossier();

  it('acepta un día de trabajo correcto', () => {
    expect(() => comprobarBorrador(borrador(), dossier)).not.toThrow();
  });

  it.each([
    ['fuera del periodo', borrador({ fecha: '2026-09-01' }), 'fuera del periodo'],
    ['fecha mal escrita', borrador({ fecha: '20/10/2026' }), 'Fecha no válida'],
    ['de otro dossier', borrador({ dossierId: 'otro' }), 'no pertenece'],
    ['sin horas', borrador({ horas: [] }), 'al menos una actividad'],
    [
      'actividad ajena',
      borrador({ horas: [{ actividadId: 'x', horas: 2 }] }),
      'no es de este dossier',
    ],
    [
      'actividad repetida',
      borrador({
        horas: [
          { actividadId: 'act1', horas: 2 },
          { actividadId: 'act1', horas: 1 },
        ],
      }),
      'repetida',
    ],
    [
      'horas que no son de 15 min',
      borrador({ horas: [{ actividadId: 'act1', horas: 1.1 }] }),
      '15 minutos',
    ],
    ['horas a cero', borrador({ horas: [{ actividadId: 'act1', horas: 0 }] }), '15 minutos'],
    [
      'más de 12 horas',
      borrador({
        horas: [
          { actividadId: 'act1', horas: 8 },
          { actividadId: 'act2', horas: 4.25 },
        ],
      }),
      '12 horas',
    ],
    ['festivo con horas', borrador({ tipo: 'festivo' }), 'no lleva horas'],
  ])('rechaza un día %s', (_caso, b, mensaje) => {
    expect(() => comprobarBorrador(b, dossier)).toThrow(RegistroInvalidoError);
    expect(() => comprobarBorrador(b, dossier)).toThrow(mensaje);
  });

  it('acepta una ausencia sin horas y cuartos de hora', () => {
    expect(() =>
      comprobarBorrador(borrador({ tipo: 'ausencia', horas: [] }), dossier),
    ).not.toThrow();
    expect(() =>
      comprobarBorrador(borrador({ horas: [{ actividadId: 'act1', horas: 7.75 }] }), dossier),
    ).not.toThrow();
  });
});

describe('horas', () => {
  it('suma las horas de un día y resume el dossier', () => {
    const dia = {
      ...borrador({
        horas: [
          { actividadId: 'act1', horas: 5 },
          { actividadId: 'act2', horas: 2.5 },
        ],
      }),
      id: 'r',
    };
    expect(totalHoras(dia)).toBe(7.5);
    expect(resumirHoras(crearDossier(), [dia, dia])).toEqual({
      realizadas: 15,
      totales: 400,
      porcentaje: 4,
    });
  });

  it('el porcentaje no pasa de 100', () => {
    const dia = { ...borrador({ horas: [{ actividadId: 'act1', horas: 12 }] }), id: 'r' };
    expect(resumirHoras(crearDossier({ horasTotales: 10 }), [dia]).porcentaje).toBe(100);
  });
});

describe('guardarRegistro y eliminarRegistro', () => {
  let registros: RegistrosFalsos;
  let valoraciones: ValoracionesFalsas;
  const dossier = crearDossier();

  beforeEach(() => {
    registros = new RegistrosFalsos();
    valoraciones = new ValoracionesFalsas();
  });

  it('el alumno guarda su día y limpia las observaciones vacías', async () => {
    const dia = await guardarRegistro(
      registros,
      valoraciones,
      alumno,
      dossier,
      borrador({ observaciones: '   ' }),
    );
    expect(dia.observaciones).toBeNull();
    expect(registros.dias).toHaveLength(1);
  });

  it('solo el alumno del dossier puede apuntar días', async () => {
    for (const usuario of [otroAlumno, profe]) {
      await expect(
        guardarRegistro(registros, valoraciones, usuario, dossier, borrador()),
      ).rejects.toThrow(SinPermisoError);
    }
  });

  it('un mes valorado por la empresa queda cerrado', async () => {
    await valoraciones.guardarMensual({
      dossierId: 'd1',
      mes: '2026-10',
      valoracion: 'positiva',
      comentario: null,
    });
    await expect(
      guardarRegistro(registros, valoraciones, alumno, dossier, borrador()),
    ).rejects.toThrow('ya está valorado');
    // Otro mes sigue abierto.
    await expect(
      guardarRegistro(registros, valoraciones, alumno, dossier, borrador({ fecha: '2026-11-03' })),
    ).resolves.toBeDefined();
  });

  it('la valoración final cierra todos los meses, también para borrar', async () => {
    const dia = await guardarRegistro(registros, valoraciones, alumno, dossier, borrador());
    await valoraciones.guardarFinal({ dossierId: 'd1', resultado: 'apto', comentario: null });
    await expect(eliminarRegistro(registros, valoraciones, alumno, dossier, dia)).rejects.toThrow(
      'ya está valorado',
    );
    expect(registros.dias).toHaveLength(1);
  });
});

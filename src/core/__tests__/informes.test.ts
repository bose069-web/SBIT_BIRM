import {
  informeAlumno,
  informeEmpresa,
  informeGeneralitat,
  informeInstituto,
  informeProfe,
  obtenerInforme,
} from '../application/informes';
import { SinPermisoError } from '../domain/errores';
import { agrupar, horasPorMes, porcentaje, progresoDe, sumarHoras } from '../domain/informe';
import {
  alumno,
  crearDia,
  crearDossierInforme,
  empresa,
  generalitat,
  InformesFalsos,
  instituto,
  otroAlumno,
  otroInstituto,
  profe,
} from '../__fixtures__/datos';

/** Dos dossiers: el de Ana (400 h) y el de Leo en otro centro (200 h). */
function conDosDossiers() {
  const port = new InformesFalsos();
  port.dossiers = [
    crearDossierInforme(),
    crearDossierInforme({
      id: 'd2',
      alumnoId: otroAlumno.id,
      alumnoNombre: otroAlumno.nombre,
      centroId: 'c2',
      centro: 'Altre Institut',
      tutorId: 'p9',
      tutorNombre: 'Rut',
      tutorEmpresaId: 'e2',
      empresaId: 'emp2',
      empresa: 'Alfa SL',
      horasTotales: 200,
    }),
  ];
  port.dias = [
    crearDia({ fecha: '2026-09-20', horas: 6 }),
    crearDia({ fecha: '2026-09-21', horas: 2.5 }),
    crearDia({ fecha: '2026-10-01', horas: 4 }),
    crearDia({ dossierId: 'd2', fecha: '2026-10-02', horas: 5 }),
  ];
  return port;
}

describe('cuentas', () => {
  it('suma horas por mes, redondeadas y ordenadas', () => {
    expect(
      horasPorMes([
        crearDia({ fecha: '2026-10-01', horas: 0.25 }),
        crearDia({ fecha: '2026-09-01', horas: 0.5 }),
        crearDia({ fecha: '2026-10-02', horas: 0.5 }),
      ]),
    ).toEqual([
      { mes: '2026-09', horas: 0.5 },
      { mes: '2026-10', horas: 0.75 },
    ]);
  });

  it('nunca pasa del 100 % y no divide entre cero', () => {
    expect(porcentaje(500, 400)).toBe(100);
    expect(porcentaje(0, 0)).toBe(0);
    expect(porcentaje(200, 400)).toBe(50);
  });

  it('el progreso de un dossier solo cuenta sus días', () => {
    const dias = [crearDia({ horas: 6 }), crearDia({ dossierId: 'otro', horas: 4 })];
    expect(progresoDe(crearDossierInforme(), dias)).toMatchObject({
      realizadas: 6,
      totales: 400,
      porcentaje: 2,
    });
  });

  it('agrupa por clave, cuenta alumnos y suma los días de cada dossier', () => {
    const dias = [crearDia({ horas: 6 }), crearDia({ dossierId: 'd3', horas: 1.5 })];
    const grupos = agrupar(
      [crearDossierInforme(), crearDossierInforme({ id: 'd3', alumnoId: 'a3' })],
      dias,
      () => ({ id: 'emp1', nombre: 'Empresa SL' }),
    );
    expect(grupos).toEqual([{ id: 'emp1', nombre: 'Empresa SL', horas: 7.5, alumnos: 2 }]);
  });

  it('sumarHoras no arrastra decimales de más', () => {
    expect(sumarHoras([crearDia({ horas: 0.1 }), crearDia({ horas: 0.2 })])).toBe(0.3);
  });
});

describe('informe del alumno', () => {
  it('sus horas, su porcentaje y el desglose por mes', async () => {
    const port = conDosDossiers();
    const informe = await informeAlumno(port, alumno);

    expect(informe).toEqual({
      alumnoNombre: 'Ana',
      realizadas: 12.5,
      totales: 400,
      porcentaje: 3,
      porMes: [
        { mes: '2026-09', horas: 8.5 },
        { mes: '2026-10', horas: 4 },
      ],
    });
  });

  it('sin dossier sale a cero, sin romper la pantalla', async () => {
    const informe = await informeAlumno(new InformesFalsos(), otroAlumno);
    expect(informe).toMatchObject({ realizadas: 0, totales: 0, porcentaje: 0, porMes: [] });
  });
});

describe('informe del profe', () => {
  it('solo sus alumnos, en orden y con el total', async () => {
    const informe = await informeProfe(conDosDossiers(), profe);

    expect(informe.alumnos.map((a) => a.alumnoNombre)).toEqual(['Ana']);
    expect(informe).toMatchObject({ realizadas: 12.5, totales: 400 });
    expect(informe.alumnos[0].porcentaje).toBe(3);
  });

  it('no vale para otros roles', async () => {
    await expect(informeProfe(conDosDossiers(), alumno)).rejects.toThrow(SinPermisoError);
  });
});

describe('informe de la empresa', () => {
  it('los alumnos que tutela', async () => {
    const informe = await informeEmpresa(conDosDossiers(), empresa);
    expect(informe.alumnos.map((a) => a.alumnoId)).toEqual([alumno.id]);
    expect(informe.realizadas).toBe(12.5);
  });

  it('no vale para otros roles', async () => {
    await expect(informeEmpresa(conDosDossiers(), profe)).rejects.toThrow(SinPermisoError);
  });
});

describe('informe del instituto', () => {
  it('horas por profe y por empresa de su centro', async () => {
    const informe = await informeInstituto(conDosDossiers(), instituto, 'c1');

    expect(informe.porProfe).toEqual([{ id: 'p1', nombre: 'Pau', horas: 12.5, alumnos: 1 }]);
    expect(informe.porEmpresa).toEqual([
      { id: 'emp1', nombre: 'Empresa SL', horas: 12.5, alumnos: 1 },
    ]);
    expect(informe).toMatchObject({ realizadas: 12.5, totales: 400 });
  });

  it('no ve el de otro centro y la generalitat sí', async () => {
    await expect(informeInstituto(conDosDossiers(), otroInstituto, 'c1')).rejects.toThrow(
      SinPermisoError,
    );
    await expect(informeInstituto(conDosDossiers(), generalitat, 'c1')).resolves.toMatchObject({
      realizadas: 12.5,
    });
  });
});

describe('informe de la generalitat', () => {
  it('todos los centros con sus horas', async () => {
    const informe = await informeGeneralitat(conDosDossiers(), generalitat);

    expect(informe.porCentro).toEqual([
      { id: 'c2', nombre: 'Altre Institut', horas: 5, alumnos: 1 },
      { id: 'c1', nombre: 'Institut', horas: 12.5, alumnos: 1 },
    ]);
    expect(informe).toMatchObject({ realizadas: 17.5, totales: 600 });
  });

  it('solo la generalitat', async () => {
    await expect(informeGeneralitat(conDosDossiers(), instituto)).rejects.toThrow(SinPermisoError);
  });
});

describe('obtenerInforme', () => {
  it('devuelve el informe que le toca a cada rol', async () => {
    const port = conDosDossiers();
    await expect(obtenerInforme(port, alumno)).resolves.toMatchObject({ tipo: 'alumno' });
    await expect(obtenerInforme(port, profe)).resolves.toMatchObject({ tipo: 'profe' });
    await expect(obtenerInforme(port, empresa)).resolves.toMatchObject({ tipo: 'empresa' });
    await expect(obtenerInforme(port, instituto)).resolves.toMatchObject({ tipo: 'instituto' });
    await expect(obtenerInforme(port, generalitat)).resolves.toMatchObject({
      tipo: 'generalitat',
    });
  });
});

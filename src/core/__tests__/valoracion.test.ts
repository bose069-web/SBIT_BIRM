import {
  obtenerSeguimiento,
  ponerValoracionFinal,
  valorarEnBloque,
  valorarMes,
} from '../application/valoracion';
import { SinPermisoError, ValoracionInvalidaError } from '../domain/errores';
import { mesCerrado, mesDe, mesesDelDossier, mesesSinValorar } from '../domain/valoracion';
import {
  alumno,
  crearDossier,
  empresa,
  generalitat,
  instituto,
  otraEmpresa,
  otroInstituto,
  otroProfe,
  profe,
  ValoracionesFalsas,
} from '../__fixtures__/datos';

const HOY = '2026-12-10';

describe('meses', () => {
  it('saca el mes de una fecha', () => {
    expect(mesDe('2026-10-27')).toBe('2026-10');
  });

  it('lista los meses del dossier cruzando de año', () => {
    expect(mesesDelDossier({ fechaInicio: '2026-11-20', fechaFin: '2027-02-01' })).toEqual([
      '2026-11',
      '2026-12',
      '2027-01',
      '2027-02',
    ]);
  });

  it('un mes se cierra con su valoración o con la final', () => {
    const final = {
      dossierId: 'd1',
      resultado: 'apto' as const,
      comentario: null,
      valoradaPor: 'p',
      valoradaEn: '',
    };
    expect(mesCerrado('2026-10-03', [{ mes: '2026-10' }], null)).toBe(true);
    expect(mesCerrado('2026-11-03', [{ mes: '2026-10' }], null)).toBe(false);
    expect(mesCerrado('2026-11-03', [], final)).toBe(true);
  });

  it('meses sin valorar: solo los ya acabados', () => {
    expect(mesesSinValorar(crearDossier(), [{ mes: '2026-10' }], HOY)).toEqual([
      '2026-09',
      '2026-11',
    ]);
  });
});

describe('valorarMes', () => {
  let valoraciones: ValoracionesFalsas;
  const dossier = crearDossier();
  const borrador = {
    dossierId: 'd1',
    mes: '2026-10',
    valoracion: 'positiva' as const,
    comentario: '  ',
  };

  beforeEach(() => {
    valoraciones = new ValoracionesFalsas();
  });

  it('el tutor de empresa valora un mes acabado', async () => {
    const v = await valorarMes(valoraciones, empresa, dossier, borrador, HOY);
    expect(v.mes).toBe('2026-10');
    expect(v.comentario).toBeNull();
  });

  it('valoran su empresa, su profe, su instituto y la generalitat; nadie más', async () => {
    for (const usuario of [alumno, otraEmpresa, otroProfe, otroInstituto]) {
      await expect(valorarMes(valoraciones, usuario, dossier, borrador, HOY)).rejects.toThrow(
        SinPermisoError,
      );
    }
    await expect(valorarMes(valoraciones, profe, dossier, borrador, HOY)).resolves.toBeDefined();
    await expect(
      valorarMes(valoraciones, instituto, dossier, borrador, HOY),
    ).resolves.toBeDefined();
    await expect(
      valorarMes(valoraciones, generalitat, dossier, borrador, HOY),
    ).resolves.toBeDefined();
  });

  it.each([
    ['un mes futuro', { mes: '2027-01' }, 'aún no ha empezado'],
    ['fuera del periodo', { mes: '2026-08' }, 'fuera del periodo'],
    ['sin comentario si no es positiva', { valoracion: 'mejorable' as const }, 'Explica'],
  ])('rechaza %s', async (_caso, cambios, mensaje) => {
    await expect(
      valorarMes(valoraciones, empresa, dossier, { ...borrador, ...cambios }, HOY),
    ).rejects.toThrow(mensaje);
  });

  it('la empresa no puede valorar tras la valoración final', async () => {
    valoraciones.final = {
      dossierId: 'd1',
      resultado: 'apto',
      comentario: null,
      valoradaPor: 'p',
      valoradaEn: '',
    };
    await expect(valorarMes(valoraciones, empresa, dossier, borrador, HOY)).rejects.toThrow(
      ValoracionInvalidaError,
    );
  });
});

describe('valoración final y seguimiento', () => {
  it('solo la ponen su profe, su instituto o la generalitat; "no apto" necesita motivo', async () => {
    const valoraciones = new ValoracionesFalsas();
    const dossier = crearDossier();
    const apto = { dossierId: 'd1', resultado: 'apto' as const, comentario: null };
    for (const usuario of [empresa, otroProfe, otroInstituto]) {
      await expect(async () =>
        ponerValoracionFinal(valoraciones, usuario, dossier, apto),
      ).rejects.toThrow(SinPermisoError);
    }
    await expect(async () =>
      ponerValoracionFinal(valoraciones, generalitat, dossier, apto),
    ).resolves.toMatchObject({ resultado: 'apto' });
    await expect(async () =>
      ponerValoracionFinal(valoraciones, instituto, dossier, apto),
    ).resolves.toMatchObject({ resultado: 'apto' });
    await expect(async () =>
      ponerValoracionFinal(valoraciones, profe, dossier, { ...apto, resultado: 'no_apto' }),
    ).rejects.toThrow('no es apto');
    await expect(async () =>
      ponerValoracionFinal(valoraciones, profe, dossier, apto),
    ).resolves.toMatchObject({
      resultado: 'apto',
    });
  });

  it('el seguimiento junta valoraciones y meses pendientes', async () => {
    const valoraciones = new ValoracionesFalsas();
    await valoraciones.guardarMensual({
      dossierId: 'd1',
      mes: '2026-09',
      valoracion: 'positiva',
      comentario: null,
    });
    const s = await obtenerSeguimiento(valoraciones, crearDossier(), HOY);
    expect(s.mensuales).toHaveLength(1);
    expect(s.final).toBeNull();
    expect(s.sinValorar).toEqual(['2026-10', '2026-11']);
  });
});

describe('valorarEnBloque', () => {
  const d1 = crearDossier({ id: 'd1' });
  const d2 = crearDossier({ id: 'd2' });
  const positiva = { valoracion: 'positiva' as const, comentario: null };
  let valoraciones: ValoracionesFalsas;

  beforeEach(() => {
    valoraciones = new ValoracionesFalsas();
  });

  it('aplica la misma valoración a todos y devuelve un resultado por informe', async () => {
    const resultados = await valorarEnBloque(
      valoraciones,
      empresa,
      [
        { dossier: d1, mes: '2026-10' },
        { dossier: d2, mes: '2026-11' },
      ],
      { valoracion: 'mejorable', comentario: '  Puntualidad  ' },
      HOY,
    );
    expect(resultados.map((r) => [r.dossierId, r.mes, r.ok])).toEqual([
      ['d1', '2026-10', true],
      ['d2', '2026-11', true],
    ]);
    expect(valoraciones.mensuales.map((v) => [v.valoracion, v.comentario])).toEqual([
      ['mejorable', 'Puntualidad'],
      ['mejorable', 'Puntualidad'],
    ]);
  });

  it('no pisa un mes ya valorado y sigue con los demás', async () => {
    await valoraciones.guardarMensual({
      dossierId: 'd1',
      mes: '2026-10',
      valoracion: 'negativa',
      comentario: 'Original',
    });
    const resultados = await valorarEnBloque(
      valoraciones,
      empresa,
      [
        { dossier: d1, mes: '2026-10' },
        { dossier: d1, mes: '2026-11' },
      ],
      positiva,
      HOY,
    );
    expect(resultados[0]).toMatchObject({ ok: false, motivo: 'Este mes ya está valorado' });
    expect(resultados[1].ok).toBe(true);
    expect(valoraciones.mensuales.find((v) => v.mes === '2026-10')?.comentario).toBe('Original');
  });

  it('respeta los permisos de valorar uno a uno, sin guardar lo ajeno', async () => {
    const ajeno = crearDossier({ id: 'ajeno', tutorEmpresaId: otraEmpresa.id });
    const resultados = await valorarEnBloque(
      valoraciones,
      empresa,
      [
        { dossier: ajeno, mes: '2026-10' },
        { dossier: d1, mes: '2026-10' },
      ],
      positiva,
      HOY,
    );
    expect(resultados[0]).toMatchObject({ ok: false, motivo: expect.stringContaining('permiso') });
    expect(resultados[1].ok).toBe(true);
    expect(valoraciones.mensuales.map((v) => v.dossierId)).toEqual(['d1']);
  });

  it('un alumno no puede valorar nada', async () => {
    const [resultado] = await valorarEnBloque(
      valoraciones,
      alumno,
      [{ dossier: d1, mes: '2026-10' }],
      positiva,
      HOY,
    );
    expect(resultado.ok).toBe(false);
    expect(valoraciones.mensuales).toEqual([]);
  });

  it('aplica las reglas de la valoración individual: comentario y mes futuro', async () => {
    const sinComentario = await valorarEnBloque(
      valoraciones,
      empresa,
      [{ dossier: d1, mes: '2026-10' }],
      { valoracion: 'negativa', comentario: '  ' },
      HOY,
    );
    expect(sinComentario[0].ok).toBe(false);
    const futuro = await valorarEnBloque(
      valoraciones,
      empresa,
      [{ dossier: d1, mes: '2027-01' }],
      positiva,
      HOY,
    );
    expect(futuro[0].ok).toBe(false);
    expect(valoraciones.mensuales).toEqual([]);
  });

  it('con valoración final la empresa ya no valora ese dossier', async () => {
    await valoraciones.guardarFinal({ dossierId: 'd1', resultado: 'apto', comentario: null });
    const [resultado] = await valorarEnBloque(
      valoraciones,
      empresa,
      [{ dossier: d1, mes: '2026-10' }],
      positiva,
      HOY,
    );
    expect(resultado).toMatchObject({ ok: false, motivo: expect.stringContaining('final') });
  });

  it('un fallo de red se cuenta sin detalles técnicos y no para el resto', async () => {
    const original = valoraciones.crearMensual.bind(valoraciones);
    let llamadas = 0;
    valoraciones.crearMensual = async (b) => {
      llamadas += 1;
      if (llamadas === 1) throw new Error('Failed to fetch');
      if (llamadas === 2) throw new Error('relation "x" internal detail');
      return original(b);
    };
    const resultados = await valorarEnBloque(
      valoraciones,
      empresa,
      [
        { dossier: d1, mes: '2026-09' },
        { dossier: d1, mes: '2026-10' },
        { dossier: d1, mes: '2026-11' },
      ],
      positiva,
      HOY,
    );
    expect(resultados[0]).toMatchObject({ ok: false, motivo: expect.stringContaining('conexión') });
    expect(resultados[1]).toMatchObject({
      ok: false,
      motivo: 'No se ha podido guardar. Vuelve a intentarlo.',
    });
    expect(resultados[2].ok).toBe(true);
  });
});

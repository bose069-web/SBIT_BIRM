import { obtenerSeguimiento, ponerValoracionFinal, valorarMes } from '../application/valoracion';
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

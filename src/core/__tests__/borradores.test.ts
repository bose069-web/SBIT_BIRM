import { descartarBorrador, guardarBorrador, leerBorrador } from '../application/borradores';
import { buscarUltimaJornada } from '../application/registro-diario';
import { textoClaveBorrador, type ClaveBorrador } from '../domain/borrador';
import {
  horasParaCopiar,
  validarValoresDia,
  valoresDiaIguales,
  type ValoresDia,
} from '../domain/registro-diario';
import type { BorradorPort } from '../ports/borrador-port';
import { crearDossier, RegistrosFalsos } from '../__fixtures__/datos';
import { BorradorLocalStorage } from '../../infrastructure/dispositivo/borrador-local-storage';
import { BorradorMemory } from '../../infrastructure/memory/borrador-memory';

const clave = (usuarioId = 'u1', fecha = '2026-10-20'): ClaveBorrador => ({
  ambito: 'registro-dia',
  usuarioId,
  contexto: ['d1', fecha],
});
const valores: ValoresDia = {
  tipo: 'trabajo',
  horas: [{ actividadId: 'act1', horas: 4 }],
  observaciones: 'Hola',
};
const borrador = { valores, guardadoEn: '2026-10-20T10:05:00.000Z' };

const adaptadores: [string, () => BorradorPort][] = [
  ['memoria', () => new BorradorMemory()],
  [
    'localStorage',
    () => {
      const mapa = new Map<string, string>();
      return new BorradorLocalStorage({
        getItem: (c) => mapa.get(c) ?? null,
        setItem: (c, v) => void mapa.set(c, v),
        removeItem: (c) => void mapa.delete(c),
      });
    },
  ],
];

describe.each(adaptadores)('borradores sobre %s', (_nombre, crear) => {
  it('recupera lo guardado al volver', async () => {
    const port = crear();
    await guardarBorrador(port, clave(), borrador);
    await expect(leerBorrador(port, clave(), validarValoresDia)).resolves.toEqual(borrador);
  });

  it('no enseña el borrador a otro usuario ni en otra fecha', async () => {
    const port = crear();
    await guardarBorrador(port, clave('u1'), borrador);
    await expect(leerBorrador(port, clave('u2'), validarValoresDia)).resolves.toBeNull();
    await expect(
      leerBorrador(port, clave('u1', '2026-10-21'), validarValoresDia),
    ).resolves.toBeNull();
  });

  it('descartar lo elimina solo a él', async () => {
    const port = crear();
    await guardarBorrador(port, clave('u1'), borrador);
    await guardarBorrador(port, clave('u2'), borrador);
    await descartarBorrador(port, clave('u1'));
    await expect(leerBorrador(port, clave('u1'), validarValoresDia)).resolves.toBeNull();
    await expect(leerBorrador(port, clave('u2'), validarValoresDia)).resolves.toEqual(borrador);
  });

  it.each([
    ['JSON roto', '{no es json'],
    ['nulo', 'null'],
    ['sin fecha', JSON.stringify({ valores })],
    ['fecha falsa', JSON.stringify({ valores, guardadoEn: 'ayer' })],
    ['tipo inventado', JSON.stringify({ ...borrador, valores: { ...valores, tipo: 'x' } })],
    [
      'horas de texto',
      JSON.stringify({
        ...borrador,
        valores: { ...valores, horas: [{ actividadId: 'a', horas: '2' }] },
      }),
    ],
  ])('ignora y limpia un dato corrupto: %s', async (_caso, contenido) => {
    const port = crear();
    const texto = textoClaveBorrador(clave());
    await port.guardar(texto, contenido);
    await expect(leerBorrador(port, clave(), validarValoresDia)).resolves.toBeNull();
    await expect(port.leer(texto)).resolves.toBeNull();
  });
});

describe('BorradorLocalStorage', () => {
  it('un almacén bloqueado se lee como vacío y al escribir falla sin mentir', async () => {
    const roto = () => {
      throw new Error('bloqueado');
    };
    const port = new BorradorLocalStorage({ getItem: roto, setItem: roto, removeItem: roto });
    await expect(port.leer('c')).resolves.toBeNull();
    await expect(port.guardar('c', 'x')).rejects.toThrow('bloqueado');
  });
});

describe('claves', () => {
  it('un id con separadores no pisa la clave de otro', () => {
    expect(textoClaveBorrador({ ambito: 'a', usuarioId: 'u/1', contexto: ['x'] })).not.toBe(
      textoClaveBorrador({ ambito: 'a', usuarioId: 'u', contexto: ['1', 'x'] }),
    );
  });
});

describe('valoresDiaIguales', () => {
  it('no distingue orden de horas, horas a cero ni espacios sobrantes', () => {
    const otros: ValoresDia = {
      tipo: 'trabajo',
      observaciones: ' Hola ',
      horas: [
        { actividadId: 'z', horas: 0 },
        { actividadId: 'act1', horas: 4 },
      ],
    };
    expect(valoresDiaIguales(valores, otros)).toBe(true);
    expect(valoresDiaIguales(valores, { ...valores, observaciones: 'Adiós' })).toBe(false);
  });
});

describe('copiar el día anterior', () => {
  const dossier = crearDossier();
  const registro = (id: string, fecha: string, tipo: 'trabajo' | 'ausencia' = 'trabajo') => ({
    id,
    dossierId: dossier.id,
    fecha,
    tipo,
    horas: tipo === 'trabajo' ? [{ actividadId: 'act1', horas: 3 }] : [],
    observaciones: 'privado',
  });

  it('encuentra la última jornada aunque sea de otro mes y salta ausencias', async () => {
    const registros = new RegistrosFalsos();
    registros.dias = [
      registro('r1', '2026-10-01'),
      registro('r2', '2026-10-30'),
      registro('r3', '2026-11-02', 'ausencia'),
      registro('r4', '2026-11-20'),
    ];
    const jornada = await buscarUltimaJornada(registros, dossier, '2026-11-03');
    expect(jornada?.id).toBe('r2');
  });

  it('no encuentra nada si no hay jornada anterior', async () => {
    const registros = new RegistrosFalsos();
    registros.dias = [registro('r4', '2026-11-20')];
    await expect(buscarUltimaJornada(registros, dossier, '2026-11-03')).resolves.toBeNull();
  });

  it('solo copia actividades vigentes y respeta el máximo diario', () => {
    const copia = horasParaCopiar(
      {
        horas: [
          { actividadId: 'borrada', horas: 2 },
          { actividadId: 'act1', horas: 8 },
          { actividadId: 'act2', horas: 8 },
        ],
      },
      [{ id: 'act1' }, { id: 'act2' }],
    );
    expect(copia).toEqual([
      { actividadId: 'act1', horas: 8 },
      { actividadId: 'act2', horas: 4 },
    ]);
  });
});

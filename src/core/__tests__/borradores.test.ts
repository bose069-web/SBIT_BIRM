import { descartarBorrador, guardarBorrador, leerBorrador } from '../application/borradores';
import { buscarUltimaJornada, enviarDia } from '../application/registro-diario';
import { esFalloDeRed, SinConexionError } from '../domain/errores';
import { textoClaveBorrador, type ClaveBorrador } from '../domain/borrador';
import {
  horasParaCopiar,
  huellaRegistro,
  validarValoresDia,
  valoresDiaIguales,
  type ValoresDia,
} from '../domain/registro-diario';
import type { BorradorPort } from '../ports/borrador-port';
import { alumno, crearDossier, RegistrosFalsos, ValoracionesFalsas } from '../__fixtures__/datos';
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

describe('enviarDia', () => {
  const dossier = crearDossier();
  const claveEnvio = clave(alumno.id, '2026-10-20');
  const ahora = '2026-10-20T10:30:00.000Z';
  const delServidor = {
    id: 'r1',
    dossierId: dossier.id,
    fecha: '2026-10-20',
    tipo: 'festivo' as const,
    horas: [],
    observaciones: 'De otro dispositivo',
  };

  function escenario() {
    const puertos = {
      registros: new RegistrosFalsos(),
      valoraciones: new ValoracionesFalsas(),
      borradores: new BorradorMemory(),
    };
    return {
      puertos,
      enviar: (huellaBase: string | null = null, forzar = false) =>
        enviarDia(puertos, alumno, dossier, claveEnvio, {
          fecha: '2026-10-20',
          valores,
          huellaBase,
          forzar,
          ahora,
        }),
      leer: () => leerBorrador(puertos.borradores, claveEnvio, validarValoresDia),
    };
  }

  it('borra el borrador solo tras guardar en el servidor', async () => {
    const { puertos, enviar, leer } = escenario();
    await guardarBorrador(puertos.borradores, claveEnvio, borrador);
    const r = await enviar();
    expect(r.resultado).toBe('guardado');
    expect(puertos.registros.dias).toHaveLength(1);
    await expect(leer()).resolves.toBeNull();
  });

  it.each([
    ['Failed to fetch', () => new TypeError('Failed to fetch')],
    ['supabase-js', () => new Error('TypeError: Failed to fetch')],
    ['React Native', () => new TypeError('Network request failed')],
    ['Safari', () => new TypeError('Load failed')],
  ])('conserva los datos como pendientes si falla la red: %s', async (_caso, crearError) => {
    const { puertos, enviar, leer } = escenario();
    puertos.registros.guardar = () => Promise.reject(crearError());
    await expect(enviar()).resolves.toEqual({ resultado: 'sin-conexion', guardadoEn: ahora });
    await expect(leer()).resolves.toEqual({
      valores,
      guardadoEn: ahora,
      huellaBase: null,
      pendienteEnvio: true,
    });
  });

  it('un rechazo que no es de red sube y no borra ni marca pendiente', async () => {
    const { puertos, enviar, leer } = escenario();
    await guardarBorrador(puertos.borradores, claveEnvio, borrador);
    puertos.registros.guardar = () => Promise.reject(new Error('permission denied'));
    await expect(enviar()).rejects.toThrow('permission denied');
    await expect(leer()).resolves.toEqual(borrador);
  });

  it('con el mes cerrado no envía y conserva el borrador', async () => {
    const { puertos, enviar, leer } = escenario();
    await guardarBorrador(puertos.borradores, claveEnvio, borrador);
    puertos.valoraciones.mensuales = [
      {
        id: 'v1',
        dossierId: dossier.id,
        mes: '2026-10',
        valoracion: 'positiva',
        comentario: null,
        valoradaPor: 'e',
        valoradaEn: ahora,
      },
    ];
    await expect(enviar()).rejects.toThrow('valorado');
    expect(puertos.registros.dias).toHaveLength(0);
    await expect(leer()).resolves.toEqual(borrador);
  });

  it('si el servidor cambió, avisa sin sobrescribir ni borrar', async () => {
    const { puertos, enviar, leer } = escenario();
    await guardarBorrador(puertos.borradores, claveEnvio, borrador);
    puertos.registros.dias = [delServidor];
    await expect(enviar(null)).resolves.toEqual({ resultado: 'conflicto', servidor: delServidor });
    expect(puertos.registros.dias).toEqual([delServidor]);
    await expect(leer()).resolves.toEqual(borrador);
  });

  it('también es conflicto si el registro base se borró en el servidor', async () => {
    const { enviar } = escenario();
    await expect(enviar(huellaRegistro(delServidor))).resolves.toEqual({
      resultado: 'conflicto',
      servidor: null,
    });
  });

  it('sin cambios en el servidor no hay conflicto', async () => {
    const { puertos, enviar } = escenario();
    puertos.registros.dias = [delServidor];
    const r = await enviar(huellaRegistro(delServidor));
    expect(r.resultado).toBe('guardado');
  });

  it('al confirmar, se envía el suyo', async () => {
    const { puertos, enviar } = escenario();
    puertos.registros.dias = [delServidor];
    const r = await enviar(null, true);
    expect(r.resultado).toBe('guardado');
    expect(puertos.registros.dias.at(-1)?.tipo).toBe('trabajo');
  });

  it('un reintento cuya respuesta se perdió no es conflicto', async () => {
    const { puertos, enviar } = escenario();
    puertos.registros.dias = [{ ...delServidor, ...valores }];
    const r = await enviar(null);
    expect(r.resultado).toBe('guardado');
  });
});

describe('esFalloDeRed', () => {
  it.each(['duplicate key value', 'permission denied', 'Este mes ya está valorado'])(
    'no confunde un rechazo del servidor: %s',
    (mensaje) => {
      expect(esFalloDeRed(new Error(mensaje))).toBe(false);
    },
  );
  it('reconoce el error de dominio', () => {
    expect(esFalloDeRed(new SinConexionError())).toBe(true);
  });
});

describe('borrador con huella', () => {
  it('rechaza una huella que no es texto', async () => {
    const port = new BorradorMemory();
    await port.guardar(textoClaveBorrador(clave()), JSON.stringify({ ...borrador, huellaBase: 7 }));
    await expect(leerBorrador(port, clave(), validarValoresDia)).resolves.toBeNull();
  });
});

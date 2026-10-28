import {
  abrirIncidencia,
  atenderIncidencia,
  borrarIncidencia,
  corregirIncidencia,
  enviarMensaje,
  escalarIncidencia,
  listarMensajes,
  obtenerBandeja,
} from '../application/incidencias';
import { DatosInvalidosError, SinPermisoError } from '../domain/errores';
import { atiendeIncidencia, ordenarIncidencias, participaEnIncidencia } from '../domain/incidencia';
import {
  alumno,
  crearIncidencia,
  empresa,
  generalitat,
  IncidenciasFalsas,
  instituto,
  otroAlumno,
  otroInstituto,
  otroProfe,
  profe,
} from '../__fixtures__/datos';

const nueva = {
  dossierId: 'd1',
  titulo: ' Problema ',
  descripcion: ' Detalle ',
  categoria: 'app' as const,
};

describe('quién atiende', () => {
  it('la generalitat todas; el instituto solo las de su centro', () => {
    expect(atiendeIncidencia(generalitat, { centroId: null })).toBe(true);
    expect(atiendeIncidencia(instituto, { centroId: 'c1' })).toBe(true);
    expect(atiendeIncidencia(instituto, { centroId: null })).toBe(false);
    expect(atiendeIncidencia(otroInstituto, { centroId: 'c1' })).toBe(false);
    expect(atiendeIncidencia(profe, { centroId: 'c1' })).toBe(false);
  });
});

describe('abrir y corregir', () => {
  it('cualquiera abre; se limpian los textos', async () => {
    const port = new IncidenciasFalsas();
    const i = await abrirIncidencia(port, nueva);
    expect(i).toMatchObject({ titulo: 'Problema', descripcion: 'Detalle', estado: 'abierta' });
  });

  it('pide título y descripción', () => {
    const port = new IncidenciasFalsas();
    expect(() => abrirIncidencia(port, { ...nueva, titulo: ' ' })).toThrow(DatosInvalidosError);
    expect(() => abrirIncidencia(port, { ...nueva, descripcion: '' })).toThrow(DatosInvalidosError);
    expect(() => abrirIncidencia(port, { ...nueva, titulo: 'x'.repeat(121) })).toThrow(/largo/);
  });

  it('solo quien la abrió y mientras esté abierta', async () => {
    const port = new IncidenciasFalsas();
    const i = crearIncidencia();
    port.incidencias = [i];
    await expect(corregirIncidencia(port, alumno, i, 'Nuevo', 'Texto')).resolves.toMatchObject({
      titulo: 'Nuevo',
    });
    expect(() => corregirIncidencia(port, otroAlumno, i, 'a', 'b')).toThrow(SinPermisoError);
    const enCurso = crearIncidencia({ estado: 'en_curso' });
    expect(() => corregirIncidencia(port, alumno, enCurso, 'a', 'b')).toThrow(/atendiendo/);
  });
});

describe('atender', () => {
  it('el instituto la pone en curso; resolver pide respuesta', async () => {
    const port = new IncidenciasFalsas();
    const i = crearIncidencia();
    port.incidencias = [i];
    await atenderIncidencia(port, instituto, i, { estado: 'en_curso' });
    expect(i.estado).toBe('en_curso');
    expect(() => atenderIncidencia(port, instituto, i, { estado: 'resuelta' })).toThrow(/resuelto/);
    await atenderIncidencia(port, instituto, i, { estado: 'resuelta', respuesta: ' Hecho ' });
    expect(i).toMatchObject({ estado: 'resuelta', respuesta: 'Hecho' });
  });

  it('nadie más la atiende', () => {
    const i = crearIncidencia();
    for (const u of [alumno, empresa, profe, otroInstituto]) {
      expect(() =>
        atenderIncidencia(new IncidenciasFalsas(), u, i, { estado: 'en_curso' }),
      ).toThrow(SinPermisoError);
    }
  });
});

describe('escalar', () => {
  it('el instituto la escala con motivo; la generalitat no escala', async () => {
    const port = new IncidenciasFalsas();
    const i = crearIncidencia();
    port.incidencias = [i];
    expect(() => escalarIncidencia(port, instituto, i, ' ')).toThrow(/por qué/);
    await escalarIncidencia(port, instituto, i, 'Afecta a varios centros');
    expect(i).toMatchObject({ escalada: true, estado: 'en_curso' });
    expect(() => escalarIncidencia(port, instituto, i, 'otra vez')).toThrow(/Ya está escalada/);
    expect(() => escalarIncidencia(port, generalitat, crearIncidencia(), 'x')).toThrow(
      SinPermisoError,
    );
  });
});

describe('bandeja y borrar', () => {
  it('separa las mías de las que atiendo y cuenta pendientes', async () => {
    const port = new IncidenciasFalsas();
    port.incidencias = [
      crearIncidencia({ id: '1', prioridad: 'baja' }),
      crearIncidencia({ id: '2', prioridad: 'alta' }),
      crearIncidencia({ id: '3', estado: 'resuelta' }),
      crearIncidencia({ id: '4', creadaPor: instituto.id }),
    ];
    const b = await obtenerBandeja(port, instituto);
    expect(b.porAtender.map((i) => i.id)).toEqual(['2', '1', '3']);
    expect(b.mias.map((i) => i.id)).toEqual(['4']);
    expect(b.pendientes).toBe(2);
    expect((await obtenerBandeja(port, alumno)).porAtender).toEqual([]);
  });

  it('ordena resueltas por fecha, recientes primero', () => {
    const lista = ordenarIncidencias([
      crearIncidencia({ id: 'vieja', estado: 'resuelta', creadaEn: '2026-01-01' }),
      crearIncidencia({ id: 'nueva', estado: 'resuelta', creadaEn: '2026-05-01' }),
    ]);
    expect(lista.map((i) => i.id)).toEqual(['nueva', 'vieja']);
  });

  it('solo la generalitat borra', async () => {
    const port = new IncidenciasFalsas();
    const i = crearIncidencia();
    port.incidencias = [i];
    expect(() => borrarIncidencia(port, instituto, i)).toThrow(SinPermisoError);
    await borrarIncidencia(port, generalitat, i);
    expect(port.incidencias).toEqual([]);
  });
});

describe('el profe tutor como comunicador', () => {
  it('participa en las de sus alumnos pero no las atiende', async () => {
    const i = crearIncidencia();
    expect(participaEnIncidencia(profe, i)).toBe(true);
    expect(participaEnIncidencia(otroProfe, i)).toBe(false);
    expect(participaEnIncidencia(empresa, i)).toBe(false);
    expect(() =>
      atenderIncidencia(new IncidenciasFalsas(), profe, i, { estado: 'en_curso' }),
    ).toThrow(SinPermisoError);
  });

  it('las ve aparte en su bandeja', async () => {
    const port = new IncidenciasFalsas();
    port.incidencias = [crearIncidencia(), crearIncidencia({ id: '2', tutorId: otroProfe.id })];
    const b = await obtenerBandeja(port, profe);
    expect(b.deMisAlumnos.map((i) => i.id)).toEqual(['inc1']);
    expect(b.porAtender).toEqual([]);
  });

  it('todos los que participan escriben; los demás no', async () => {
    const port = new IncidenciasFalsas();
    const i = crearIncidencia();
    for (const u of [profe, alumno, instituto, generalitat]) {
      await enviarMensaje(port, u, i, ` Hola de ${u.rol} `);
    }
    expect((await listarMensajes(port, profe, i)).map((m) => m.texto)).toEqual([
      'Hola de profe',
      'Hola de alumno',
      'Hola de instituto',
      'Hola de generalitat',
    ]);
    expect(() => enviarMensaje(port, empresa, i, 'hola')).toThrow(SinPermisoError);
    expect(() => listarMensajes(port, otroProfe, i)).toThrow(SinPermisoError);
    expect(() => enviarMensaje(port, profe, i, '  ')).toThrow(DatosInvalidosError);
  });
});

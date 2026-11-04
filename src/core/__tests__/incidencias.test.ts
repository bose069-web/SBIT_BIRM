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
import {
  atiendeIncidencia,
  destinoDe,
  ordenarIncidencias,
  participaEnIncidencia,
  quienAtiende,
  respondeEmpresa,
  siguienteNivel,
} from '../domain/incidencia';
import {
  alumno,
  crearIncidencia,
  empresa,
  generalitat,
  IncidenciasFalsas,
  instituto,
  otraEmpresa,
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

// El fixture por defecto va sobre la empresa, con dossier, profe tutor y centro.
const dePracticas = () => crearIncidencia({ categoria: 'practicas' });
const deLaApp = () => crearIncidencia({ categoria: 'app' });

describe('sobre qué va decide a quién le llega', () => {
  it('cada categoría tiene su destinatario', () => {
    expect(destinoDe('practicas')).toBe('profe');
    expect(destinoDe('convenio')).toBe('profe');
    expect(destinoDe('otra')).toBe('profe');
    expect(destinoDe('empresa')).toBe('empresa');
    expect(destinoDe('app')).toBe('generalitat');
  });

  it('la gestiona el profe tutor, salvo las de la app', () => {
    expect(quienAtiende(dePracticas())).toBe('profe');
    // Lo de la empresa lo responde la empresa, pero lo gestiona el tutor.
    expect(quienAtiende(crearIncidencia())).toBe('profe');
    expect(quienAtiende(deLaApp())).toBe('generalitat');
  });

  it('sin profe tutor cae en el instituto, y sin centro en la generalitat', () => {
    expect(quienAtiende(crearIncidencia({ tutorId: null }))).toBe('instituto');
    expect(quienAtiende(crearIncidencia({ tutorId: null, centroId: null }))).toBe('generalitat');
  });

  it('escalada, la lleva el nivel al que subió', () => {
    expect(quienAtiende(crearIncidencia({ nivel: 'instituto' }))).toBe('instituto');
    expect(quienAtiende(crearIncidencia({ nivel: 'generalitat' }))).toBe('generalitat');
  });
});

describe('quién atiende', () => {
  it('el profe tutor las suyas; el instituto no se mete', () => {
    const i = dePracticas();
    expect(atiendeIncidencia(profe, i)).toBe(true);
    expect(atiendeIncidencia(otroProfe, i)).toBe(false);
    expect(atiendeIncidencia(instituto, i)).toBe(false);
    expect(atiendeIncidencia(empresa, i)).toBe(false);
    expect(atiendeIncidencia(alumno, i)).toBe(false);
  });

  it('las de la app son de la generalitat, de nadie más', () => {
    const i = deLaApp();
    expect(atiendeIncidencia(generalitat, i)).toBe(true);
    expect(atiendeIncidencia(profe, i)).toBe(false);
    expect(atiendeIncidencia(instituto, i)).toBe(false);
  });

  it('al subir al instituto deja de llevarla el profe', () => {
    const i = crearIncidencia({ categoria: 'practicas', nivel: 'instituto' });
    expect(atiendeIncidencia(instituto, i)).toBe(true);
    expect(atiendeIncidencia(otroInstituto, i)).toBe(false);
    expect(atiendeIncidencia(profe, i)).toBe(false);
  });

  it('la generalitat lo lleva todo: es el último nivel', () => {
    for (const i of [dePracticas(), deLaApp(), crearIncidencia({ nivel: 'instituto' })]) {
      expect(atiendeIncidencia(generalitat, i)).toBe(true);
    }
  });
});

describe('la empresa ve y responde lo suyo, pero no lo cierra', () => {
  it('solo lo que va sobre la empresa y solo en sus dossiers', () => {
    expect(respondeEmpresa(empresa, crearIncidencia())).toBe(true);
    expect(respondeEmpresa(otraEmpresa, crearIncidencia())).toBe(false);
    expect(respondeEmpresa(empresa, dePracticas())).toBe(false);
  });

  it('participa y escribe, pero no la atiende', async () => {
    const port = new IncidenciasFalsas();
    const i = crearIncidencia();
    port.incidencias = [i];
    expect(participaEnIncidencia(empresa, i)).toBe(true);
    await enviarMensaje(port, empresa, i, 'Lo miramos hoy');
    expect(() => atenderIncidencia(port, empresa, i, { estado: 'resuelta' })).toThrow(
      SinPermisoError,
    );
    expect(() => escalarIncidencia(port, empresa, i, 'no es cosa nuestra')).toThrow(
      SinPermisoError,
    );
  });

  it('no se entera de lo que no va sobre ella', () => {
    const i = dePracticas();
    expect(participaEnIncidencia(empresa, i)).toBe(false);
    expect(() => enviarMensaje(new IncidenciasFalsas(), empresa, i, 'hola')).toThrow(
      SinPermisoError,
    );
  });

  it('las ve aparte en su bandeja', async () => {
    const port = new IncidenciasFalsas();
    port.incidencias = [crearIncidencia(), crearIncidencia({ id: '2', categoria: 'practicas' })];
    const b = await obtenerBandeja(port, empresa);
    expect(b.deMisAlumnos.map((i) => i.id)).toEqual(['inc1']);
    expect(b.porAtender).toEqual([]);
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
  it('quien la lleva la pone en curso; resolver pide respuesta', async () => {
    const port = new IncidenciasFalsas();
    const i = dePracticas();
    port.incidencias = [i];
    await atenderIncidencia(port, profe, i, { estado: 'en_curso' });
    expect(i.estado).toBe('en_curso');
    expect(() => atenderIncidencia(port, profe, i, { estado: 'resuelta' })).toThrow(/resuelto/);
    await atenderIncidencia(port, profe, i, { estado: 'resuelta', respuesta: ' Hecho ' });
    expect(i).toMatchObject({ estado: 'resuelta', respuesta: 'Hecho' });
  });

  it('nadie más la atiende', () => {
    const i = dePracticas();
    for (const u of [alumno, empresa, otroProfe, instituto, otroInstituto]) {
      expect(() =>
        atenderIncidencia(new IncidenciasFalsas(), u, i, { estado: 'en_curso' }),
      ).toThrow(SinPermisoError);
    }
  });
});

describe('escalar', () => {
  it('sube un escalón cada vez: profe → instituto → generalitat', () => {
    expect(siguienteNivel(dePracticas())).toBe('instituto');
    expect(siguienteNivel(crearIncidencia({ nivel: 'instituto' }))).toBe('generalitat');
    expect(siguienteNivel(crearIncidencia({ nivel: 'generalitat' }))).toBe(null);
    // Sin centro no hay instituto al que pasarla.
    expect(siguienteNivel(crearIncidencia({ centroId: null }))).toBe('generalitat');
  });

  it('el profe la pasa al instituto y el instituto a la generalitat', async () => {
    const port = new IncidenciasFalsas();
    const i = dePracticas();
    port.incidencias = [i];
    expect(() => escalarIncidencia(port, profe, i, ' ')).toThrow(/por qué/);
    await escalarIncidencia(port, profe, i, 'Esto lo tiene que ver el centro');
    expect(i).toMatchObject({ nivel: 'instituto', estado: 'en_curso' });
    // Ahora ya no es suya: la lleva el instituto.
    expect(() => escalarIncidencia(port, profe, i, 'otra vez')).toThrow(SinPermisoError);
    await escalarIncidencia(port, instituto, i, 'Afecta a varios centros');
    expect(i.nivel).toBe('generalitat');
    expect(() => escalarIncidencia(port, generalitat, i, 'x')).toThrow(/no hay nivel por encima/);
  });

  it('quien la escala la sigue viendo después', async () => {
    const port = new IncidenciasFalsas();
    const i = dePracticas();
    port.incidencias = [i];
    await escalarIncidencia(port, profe, i, 'Para el centro');
    expect(participaEnIncidencia(profe, i)).toBe(true);
    await escalarIncidencia(port, instituto, i, 'Para la Generalitat');
    expect(participaEnIncidencia(instituto, i)).toBe(true);
    expect(participaEnIncidencia(profe, i)).toBe(true);
  });

  it('una resuelta no se escala', () => {
    const i = dePracticas();
    i.estado = 'resuelta';
    expect(() => escalarIncidencia(new IncidenciasFalsas(), profe, i, 'motivo')).toThrow(
      /resuelta/,
    );
  });
});

describe('bandeja y borrar', () => {
  it('separa las mías de las que atiendo y cuenta pendientes', async () => {
    const port = new IncidenciasFalsas();
    port.incidencias = [
      crearIncidencia({ id: '1', categoria: 'practicas', prioridad: 'baja' }),
      crearIncidencia({ id: '2', categoria: 'practicas', prioridad: 'alta' }),
      crearIncidencia({ id: '3', categoria: 'practicas', estado: 'resuelta' }),
      crearIncidencia({ id: '4', categoria: 'practicas', creadaPor: profe.id }),
    ];
    const b = await obtenerBandeja(port, profe);
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
  it('sigue las de sus alumnos aunque las lleve otro', async () => {
    const i = deLaApp();
    expect(participaEnIncidencia(profe, i)).toBe(true);
    expect(participaEnIncidencia(otroProfe, i)).toBe(false);
    expect(() =>
      atenderIncidencia(new IncidenciasFalsas(), profe, i, { estado: 'en_curso' }),
    ).toThrow(SinPermisoError);
  });

  it('las que lleva otro las ve aparte en su bandeja', async () => {
    const port = new IncidenciasFalsas();
    port.incidencias = [deLaApp(), crearIncidencia({ id: '2', tutorId: otroProfe.id })];
    const b = await obtenerBandeja(port, profe);
    expect(b.deMisAlumnos.map((i) => i.id)).toEqual(['inc1']);
    expect(b.porAtender).toEqual([]);
  });

  it('todos los que participan escriben; los demás no', async () => {
    const port = new IncidenciasFalsas();
    const i = dePracticas();
    for (const u of [profe, alumno, generalitat]) {
      await enviarMensaje(port, u, i, ` Hola de ${u.rol} `);
    }
    expect((await listarMensajes(port, profe, i)).map((m) => m.texto)).toEqual([
      'Hola de profe',
      'Hola de alumno',
      'Hola de generalitat',
    ]);
    expect(() => enviarMensaje(port, otroProfe, i, 'hola')).toThrow(SinPermisoError);
    expect(() => listarMensajes(port, otroProfe, i)).toThrow(SinPermisoError);
    expect(() => enviarMensaje(port, profe, i, '  ')).toThrow(DatosInvalidosError);
  });
});

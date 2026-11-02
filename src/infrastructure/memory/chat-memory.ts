import type { LeidoHasta, MensajeDirecto } from '@/core/domain/chat';
import type { ChatPort } from '@/core/ports/chat-port';

import { sesionMemory } from './auth-memory';
import { DOSSIERS_DEMO, IDS_DEMO, USUARIOS_DEMO } from './datos-demo';

/** Fecha y hora ISO de hace unos minutos: así la bandeja parece reciente sin fijar el día. */
function haceMinutos(minutos: number): string {
  return new Date(Date.now() - minutos * 60_000).toISOString();
}

function nombreDe(id: string): string {
  return USUARIOS_DEMO.find((u) => u.id === id)?.nombre ?? 'Usuario';
}

function mensajeDemo(
  id: string,
  autorId: string,
  destinatarioId: string,
  texto: string,
  minutos: number,
): MensajeDirecto {
  return {
    id,
    autorId,
    autorNombre: nombreDe(autorId),
    destinatarioId,
    texto,
    enviadoEn: haceMinutos(minutos),
  };
}

const { alumno, profe, empresa } = IDS_DEMO;

// Conversaciones de ejemplo de la empresa de prueba con su alumno y con el profe de ese alumno.
const MENSAJES_DEMO: MensajeDirecto[] = [
  mensajeDemo('chat-demo-1', profe, empresa, 'Buenas tardes, ¿cómo va Alumno Demo este mes?', 190),
  mensajeDemo(
    'chat-demo-2',
    empresa,
    profe,
    'Muy bien: ha cerrado el informe de octubre sin ayuda y se ha integrado con el equipo.',
    170,
  ),
  mensajeDemo(
    'chat-demo-3',
    profe,
    empresa,
    'Perfecto. Si te parece, lo comentamos en la reunión del jueves.',
    45,
  ),
  mensajeDemo(
    'chat-demo-4',
    alumno,
    empresa,
    'Hola, ya he subido el informe de octubre. ¿Lo puedes revisar?',
    100,
  ),
  mensajeDemo('chat-demo-5', empresa, alumno, 'Lo miro esta tarde y te digo algo.', 90),
  mensajeDemo('chat-demo-6', alumno, empresa, 'Gracias.', 85),
];

/** Como en la base: solo hablan dos personas que aparecen en un mismo dossier. */
function compartenDossier(a: string, b: string): boolean {
  return DOSSIERS_DEMO.some((d) => {
    const personas = [d.alumnoId, d.tutorId, d.tutorEmpresaId];
    return personas.includes(a) && personas.includes(b);
  });
}

export class ChatMemory implements ChatPort {
  private mensajes = [...MENSAJES_DEMO];
  // La empresa ya ha leído el hilo del alumno; del profe le queda un mensaje sin leer.
  private leido = new Map<string, LeidoHasta>([
    [empresa, { [alumno]: new Date().toISOString(), [profe]: haceMinutos(120) }],
  ]);
  private contador = 0;
  private oyentes = new Set<() => void>();

  suscribir(alCambiar: () => void): () => void {
    this.oyentes.add(alCambiar);
    return () => {
      this.oyentes.delete(alCambiar);
    };
  }

  private actual() {
    const usuario = sesionMemory();
    if (!usuario) throw new Error('No hay sesión');
    return usuario;
  }

  async listar() {
    const { id } = this.actual();
    return this.mensajes.filter((m) => m.autorId === id || m.destinatarioId === id);
  }

  async enviar(destinatarioId: string, texto: string) {
    const usuario = this.actual();
    if (!compartenDossier(usuario.id, destinatarioId)) {
      throw new Error('Solo puedes escribir a quien comparte prácticas contigo');
    }
    this.contador += 1;
    const mensaje: MensajeDirecto = {
      id: `chat-${Date.now()}-${this.contador}`,
      autorId: usuario.id,
      autorNombre: usuario.nombre,
      destinatarioId,
      texto,
      enviadoEn: new Date().toISOString(),
    };
    this.mensajes.push(mensaje);
    this.oyentes.forEach((oyente) => oyente());
    return { ...mensaje };
  }

  async leidoHasta() {
    return { ...(this.leido.get(this.actual().id) ?? {}) };
  }

  async marcarLeido(otroId: string, hasta: string) {
    const { id } = this.actual();
    const mio = this.leido.get(id) ?? {};
    if ((mio[otroId] ?? '') < hasta) this.leido.set(id, { ...mio, [otroId]: hasta });
  }
}

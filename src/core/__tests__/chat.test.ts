import { enviarMensajeDirecto, marcarHiloLeido, obtenerChat } from '../application/chat';
import { comprobarMensaje, otroDe, type LeidoHasta, type MensajeDirecto } from '../domain/chat';
import { DatosInvalidosError } from '../domain/errores';
import type { ChatPort } from '../ports/chat-port';
import { alumno, empresa } from '../__fixtures__/datos';

class ChatFalso implements ChatPort {
  mensajes: MensajeDirecto[] = [];
  leido: LeidoHasta = {};
  async listar() {
    return this.mensajes;
  }
  async enviar(destinatarioId: string, texto: string) {
    const m: MensajeDirecto = {
      id: String(this.mensajes.length + 1),
      autorId: empresa.id,
      autorNombre: empresa.nombre,
      destinatarioId,
      texto,
      enviadoEn: `2026-10-29T10:0${this.mensajes.length}:00.000Z`,
    };
    this.mensajes.push(m);
    return m;
  }
  async leidoHasta() {
    return this.leido;
  }
  async marcarLeido(otroId: string, hasta: string) {
    this.leido[otroId] = hasta;
  }
}

describe('chat directo', () => {
  it('envía el texto limpio a la otra persona', async () => {
    const chat = new ChatFalso();
    const m = await enviarMensajeDirecto(chat, empresa, alumno.id, '  Hola  ');
    expect(m.texto).toBe('Hola');
    expect(otroDe(m, empresa.id)).toBe(alumno.id);
    expect(otroDe(m, alumno.id)).toBe(empresa.id);
  });

  it('no deja enviar mensajes vacíos, demasiado largos ni a uno mismo', async () => {
    const chat = new ChatFalso();
    expect(() => comprobarMensaje('   ')).toThrow(DatosInvalidosError);
    expect(() => comprobarMensaje('a'.repeat(2001))).toThrow(DatosInvalidosError);
    expect(() => enviarMensajeDirecto(chat, empresa, empresa.id, 'Hola')).toThrow(
      DatosInvalidosError,
    );
  });

  it('devuelve los mensajes en orden y lo leído de cada hilo', async () => {
    const chat = new ChatFalso();
    await enviarMensajeDirecto(chat, empresa, alumno.id, 'Uno');
    await enviarMensajeDirecto(chat, empresa, alumno.id, 'Dos');
    chat.mensajes.reverse();
    await marcarHiloLeido(chat, alumno.id, '2026-10-29T11:00:00.000Z');
    const { mensajes, leidoHasta } = await obtenerChat(chat);
    expect(mensajes.map((m) => m.texto)).toEqual(['Uno', 'Dos']);
    expect(leidoHasta).toEqual({ [alumno.id]: '2026-10-29T11:00:00.000Z' });
  });
});

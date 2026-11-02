import type { LeidoHasta, MensajeDirecto } from '../domain/chat';

/** Mensajes directos del usuario con sesión: solo los que ha escrito o recibido. */
export interface ChatPort {
  /** Avisa de cambios y reconexiones; devuelve la función de limpieza. */
  suscribir(alCambiar: () => void): () => void;
  listar(): Promise<MensajeDirecto[]>;
  /** Solo se puede escribir a alguien con quien se comparte un dossier. */
  enviar(destinatarioId: string, texto: string): Promise<MensajeDirecto>;
  leidoHasta(): Promise<LeidoHasta>;
  marcarLeido(otroId: string, hasta: string): Promise<void>;
}

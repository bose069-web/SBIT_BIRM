/** Quién, qué formulario y sobre qué: dos sesiones o dos días nunca comparten borrador. */
export interface ClaveBorrador {
  ambito: string;
  usuarioId: string;
  /** Lo que identifica el formulario dentro del ámbito, p. ej. dossier y fecha. */
  contexto: string[];
}

/** Trabajo sin enviar que vive solo en este dispositivo. */
export interface Borrador<T> {
  valores: T;
  /** Fecha y hora ISO del último autoguardado. */
  guardadoEn: string;
}

export function textoClaveBorrador({ ambito, usuarioId, contexto }: ClaveBorrador): string {
  // Se codifica cada parte para que un id con separadores no pueda pisar la clave de otro.
  return ['kampus.borrador.v1', ambito, usuarioId, ...contexto].map(encodeURIComponent).join('/');
}

/** Devuelve el borrador si el texto guardado es válido; cualquier otra cosa se ignora. */
export function interpretarBorrador<T>(
  texto: string,
  validar: (valores: unknown) => T | null,
): Borrador<T> | null {
  let datos: unknown;
  try {
    datos = JSON.parse(texto);
  } catch {
    return null;
  }
  if (typeof datos !== 'object' || datos === null) return null;
  const { valores, guardadoEn } = datos as Record<string, unknown>;
  if (typeof guardadoEn !== 'string' || Number.isNaN(Date.parse(guardadoEn))) return null;
  const validos = validar(valores);
  return validos === null ? null : { valores: validos, guardadoEn };
}

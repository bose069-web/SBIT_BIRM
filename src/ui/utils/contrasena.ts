import { uuid } from 'expo';

// Sin caracteres que se confunden al dictarlos o copiarlos a mano (0/O, 1/l/I).
const MINUSCULAS = 'abcdefghijkmnopqrstuvwxyz';
const MAYUSCULAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const CIFRAS = '23456789';
const SIMBOLOS = '-_!?';
const ALFABETO = MINUSCULAS + MAYUSCULAS + CIFRAS + SIMBOLOS;
const LONGITUD = 16;
// Se descarta lo que supera el mayor múltiplo del alfabeto: así ningún carácter sale más a menudo.
const LIMITE = 256 - (256 % ALFABETO.length);

/**
 * Bytes de un generador criptográfico. Hermes (iOS y Android) no siempre trae `crypto`: ahí se usa
 * el UUID v4 nativo de Expo (UUID de Foundation y SecureRandom), sin sus dígitos fijos.
 */
export function bytesSeguros(cantidad: number): Uint8Array {
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    return globalThis.crypto.getRandomValues(new Uint8Array(cantidad));
  }
  const bytes = new Uint8Array(cantidad);
  let i = 0;
  while (i < cantidad) {
    const hex = uuid.v4().replace(/-/g, '');
    // El dígito 12 es la versión y el 16 lleva la variante: el resto es aleatorio.
    const azar = hex.slice(0, 12) + hex.slice(13, 16) + hex.slice(17, 31);
    for (let j = 0; j + 1 < azar.length && i < cantidad; j += 2) {
      bytes[i++] = parseInt(azar.slice(j, j + 2), 16);
    }
  }
  return bytes;
}

/**
 * Contraseña inicial de un alumno. Lleva de todos los tipos de carácter por si el servidor los
 * exige; repetir el sorteo entero mantiene la distribución uniforme.
 */
export function generarContrasena(obtenerBytes: (cantidad: number) => Uint8Array = bytesSeguros) {
  for (;;) {
    let contrasena = '';
    while (contrasena.length < LONGITUD) {
      for (const byte of obtenerBytes(LONGITUD * 2)) {
        if (byte < LIMITE && contrasena.length < LONGITUD) {
          contrasena += ALFABETO[byte % ALFABETO.length];
        }
      }
    }
    if (
      [MINUSCULAS, MAYUSCULAS, CIFRAS, SIMBOLOS].every((g) =>
        [...g].some((c) => contrasena.includes(c)),
      )
    ) {
      return contrasena;
    }
  }
}

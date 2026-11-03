import { useSyncExternalStore } from 'react';

// Estado pequeño compartido por toda la web (no hace falta un contexto): el modo de color elegido
// y si la pantalla está desplazada, para que la cabecera se encoja.

export type Esquema = 'light' | 'dark';

const CLAVE = 'kampus.esquema';

function crearValor<T>(inicial: T) {
  let valor = inicial;
  const oyentes = new Set<() => void>();
  return {
    leer: () => valor,
    poner(nuevo: T) {
      if (nuevo === valor) return;
      valor = nuevo;
      oyentes.forEach((o) => o());
    },
    suscribir(o: () => void) {
      oyentes.add(o);
      return () => oyentes.delete(o);
    },
  };
}

function leerGuardado(): Esquema | null {
  try {
    const guardado = globalThis.localStorage?.getItem(CLAVE);
    return guardado === 'dark' || guardado === 'light' ? guardado : null;
  } catch {
    return null;
  }
}

const esquema = crearValor<Esquema | null>(null);
const desplazado = crearValor(false);

// Se lee al pintar, no al importar: en el móvil, localStorage se instala al cargar el container.
let leido = false;
function leerEsquema() {
  if (!leido) {
    leido = true;
    esquema.poner(leerGuardado());
  }
  return esquema.leer();
}

/** Lo que eligió la persona; null si todavía no ha elegido. */
export function useEsquemaElegido(): Esquema | null {
  return useSyncExternalStore(esquema.suscribir, leerEsquema, () => null);
}

/** En la web, claro por defecto: solo es oscuro si la persona lo eligió. */
export function useEsquemaWeb(): Esquema {
  return useEsquemaElegido() ?? 'light';
}

export function cambiarEsquemaWeb(nuevo: Esquema) {
  leido = true;
  esquema.poner(nuevo);
  try {
    globalThis.localStorage?.setItem(CLAVE, nuevo);
  } catch {
    // Sin almacenamiento (modo privado): el cambio dura hasta recargar.
  }
}

export const useDesplazado = () =>
  useSyncExternalStore(desplazado.suscribir, desplazado.leer, () => false);
export const ponerDesplazado = (si: boolean) => desplazado.poner(si);

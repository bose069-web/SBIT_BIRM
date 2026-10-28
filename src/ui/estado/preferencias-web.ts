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

function leerGuardado(): Esquema {
  try {
    return globalThis.localStorage?.getItem(CLAVE) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

// Claro por defecto: solo es oscuro si la persona lo eligió.
const esquema = crearValor<Esquema>(leerGuardado());
const desplazado = crearValor(false);

export function useEsquemaWeb(): Esquema {
  return useSyncExternalStore(esquema.suscribir, esquema.leer, () => 'light');
}

export function cambiarEsquemaWeb(nuevo: Esquema) {
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

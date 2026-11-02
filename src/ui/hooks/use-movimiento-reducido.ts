import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

const CONSULTA = '(prefers-reduced-motion: reduce)';

function consultar() {
  return Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function'
    ? window.matchMedia(CONSULTA)
    : null;
}

function suscribir(alCambiar: () => void) {
  const consulta = consultar();
  consulta?.addEventListener('change', alCambiar);
  return () => consulta?.removeEventListener('change', alCambiar);
}

/** Escucha la preferencia web, también si cambia con la página abierta. */
export function useMovimientoReducido(): boolean {
  return useSyncExternalStore(
    suscribir,
    () => consultar()?.matches ?? false,
    () => Platform.OS === 'web',
  );
}

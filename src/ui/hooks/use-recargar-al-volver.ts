import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

/**
 * Vuelve a cargar los datos cada vez que se vuelve a una pantalla (las pestañas no se desmontan,
 * así que sin esto se verían datos viejos tras apuntar un día en otra pestaña).
 */
export function useRecargarAlVolver(recargar: () => void) {
  const primeraVez = useRef(true);
  useFocusEffect(
    useCallback(() => {
      // La primera vez ya carga useDatos.
      if (primeraVez.current) {
        primeraVez.current = false;
        return;
      }
      recargar();
    }, [recargar]),
  );
}

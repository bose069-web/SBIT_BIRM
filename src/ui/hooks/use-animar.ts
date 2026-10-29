import { Platform } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

/**
 * Si se animan las entradas. No con "reducir movimiento" del sistema ni en la web: allí las
 * animaciones de entrada de Reanimated a veces dejan la vista oculta al cambiar de pantalla.
 */
export function useAnimar(): boolean {
  const reducir = useReducedMotion();
  return Platform.OS !== 'web' && !reducir;
}

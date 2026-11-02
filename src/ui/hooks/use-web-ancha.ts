import { Platform, useWindowDimensions } from 'react-native';

/** Web en horizontal (≥ 1000 px): las pantallas usan todo el ancho de la cabecera y van en columnas. */
export function useWebAncha(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= 1000;
}

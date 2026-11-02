import type { CSSProperties } from 'react';
import { Platform, type PressableStateCallbackType, type ViewStyle } from 'react-native';

import { Movimiento } from '@/ui/theme/theme';

// RN nativo solo declara pressed; react-native-web añade hovered al mismo estado.
export type EstadoPressable = PressableStateCallbackType & { hovered?: boolean };

export function transicionWeb(
  reducido: boolean,
  propiedad = 'background-color',
): ViewStyle | undefined {
  if (Platform.OS !== 'web' || reducido) return undefined;
  return {
    transitionProperty: propiedad,
    transitionDuration: `${Movimiento.rapido}ms`,
    transitionTimingFunction: 'ease-out',
  } as ViewStyle &
    Pick<CSSProperties, 'transitionProperty' | 'transitionDuration' | 'transitionTimingFunction'>;
}

/** Solo cambia el fondo: conserva la posición y la respuesta táctil nativa. */
export function fondoHoverWeb(hovered: boolean | undefined, color: string): ViewStyle | undefined {
  return Platform.OS === 'web' && hovered ? { backgroundColor: color } : undefined;
}

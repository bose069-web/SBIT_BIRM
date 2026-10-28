import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { Movimiento } from '@/ui/theme/theme';

/**
 * Entrada suave (sube un poco y aparece). `orden` escalona varias seguidas. Con "reducir
 * movimiento" activado en el sistema, aparece sin animar.
 */
export function Aparecer({
  children,
  orden = 0,
  style,
}: {
  children: ReactNode;
  orden?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reducir = useReducedMotion();
  return (
    <Animated.View
      style={style}
      entering={
        reducir ? undefined : FadeInDown.duration(Movimiento.entrada).delay(Math.min(orden, 6) * 50)
      }>
      {children}
    </Animated.View>
  );
}

import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useColorScheme } from '@/ui/hooks/use-color-scheme';
import { useTheme } from '@/ui/hooks/use-theme';

// Se mira una vez: no cambia mientras la app está abierta.
const CRISTAL_NATIVO = isLiquidGlassAvailable();

/**
 * Superficie de cristal (Liquid Glass de Apple). En iOS 26 o superior usa el efecto nativo; en
 * Android, web e iOS antiguos, una superficie opaca con el mismo borde para que se lea igual.
 */
export function Cristal({
  children,
  style,
  interactivo = false,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  interactivo?: boolean;
}) {
  const theme = useTheme();
  const esquema = useColorScheme() === 'dark' ? 'dark' : 'light';
  if (CRISTAL_NATIVO) {
    return (
      <GlassView
        glassEffectStyle="regular"
        colorScheme={esquema}
        isInteractive={interactivo}
        style={[{ borderColor: theme.cristalBorde, borderWidth: 1 }, style]}>
        {children}
      </GlassView>
    );
  }
  return (
    <View
      style={[
        { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 },
        style,
      ]}>
      {children}
    </View>
  );
}

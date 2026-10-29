import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/ui/hooks/use-theme';
import { Radius, type ThemeColor } from '@/ui/theme/theme';

export function BarraProgreso({
  porcentaje,
  etiqueta = 'Progreso',
  color = 'primary',
}: {
  porcentaje: number;
  etiqueta?: string;
  /** Por defecto el acento; p. ej. `danger` al pasarse de un límite (siempre con texto al lado). */
  color?: ThemeColor;
}) {
  const theme = useTheme();
  const valor = Math.max(0, Math.min(100, porcentaje));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={etiqueta}
      accessibilityValue={{ min: 0, max: 100, now: valor }}
      style={[styles.pista, { backgroundColor: theme.subtle }]}>
      <View style={[styles.relleno, { width: `${valor}%`, backgroundColor: theme[color] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  pista: { height: 8, borderRadius: Radius.pill, overflow: 'hidden' },
  relleno: { height: '100%', borderRadius: Radius.pill },
});

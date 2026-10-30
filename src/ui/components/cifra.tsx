import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/ui/components/themed-text';
import { useTheme } from '@/ui/hooks/use-theme';
import { Radius, Spacing, type ThemeColor } from '@/ui/theme/theme';

/** Un dato de un vistazo: el número grande y debajo qué es. */
export function Cifra({
  valor,
  etiqueta,
  detalle,
  color = 'text',
}: {
  valor: string;
  etiqueta: string;
  detalle?: string;
  /** Solo acompaña: la etiqueta siempre dice qué significa. */
  color?: ThemeColor;
}) {
  const theme = useTheme();
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={[valor, etiqueta, detalle].filter(Boolean).join(' ')}
      style={[styles.cifra, { backgroundColor: theme.subtle }]}>
      <ThemedText type="title" themeColor={color}>
        {valor}
      </ThemedText>
      <ThemedText type="smallBold">{etiqueta}</ThemedText>
      {detalle ? (
        <ThemedText type="small" themeColor="textSecondary">
          {detalle}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cifra: {
    flexGrow: 1,
    flexBasis: '45%',
    minWidth: 120,
    padding: Spacing.three,
    borderRadius: Radius.button,
  },
});

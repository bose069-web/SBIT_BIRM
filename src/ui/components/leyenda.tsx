import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/ui/components/themed-text';
import { useTheme } from '@/ui/hooks/use-theme';
import { Spacing, type ThemeColor } from '@/ui/theme/theme';

export interface ElementoLeyenda {
  texto: string;
  color: ThemeColor;
  /** La forma ayuda a distinguir sin depender solo del color. */
  forma?: 'punto' | 'cuadrado' | 'rombo';
}

/** Leyenda para calendarios y gráficos: cada marca va siempre con su texto. */
export function Leyenda({ elementos }: { elementos: ElementoLeyenda[] }) {
  const theme = useTheme();
  return (
    <View style={styles.leyenda} accessibilityRole="list">
      {elementos.map((e) => (
        <View key={e.texto} style={styles.elemento} accessibilityRole="text">
          <View
            style={[
              styles.marca,
              e.forma === 'rombo'
                ? {
                    borderColor: theme[e.color],
                    borderWidth: 1.5,
                    transform: [{ rotate: '45deg' }],
                  }
                : { backgroundColor: theme[e.color] },
              e.forma === 'cuadrado' || e.forma === 'rombo' ? styles.esquinas : styles.redonda,
            ]}
          />
          <ThemedText type="small" themeColor="textSecondary">
            {e.texto}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  leyenda: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: Spacing.three,
    rowGap: Spacing.two,
  },
  elemento: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  marca: { width: 9, height: 9 },
  redonda: { borderRadius: 5 },
  esquinas: { borderRadius: 2 },
});

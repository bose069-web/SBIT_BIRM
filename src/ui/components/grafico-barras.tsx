import { StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { ThemedText } from '@/ui/components/themed-text';
import { useAnimar } from '@/ui/hooks/use-animar';
import { useTheme } from '@/ui/hooks/use-theme';
import { Movimiento, Radius, Spacing, type ThemeColor } from '@/ui/theme/theme';

export interface Barra {
  etiqueta: string;
  valor: number;
  /** Texto encima de la barra (por ejemplo "32 h"); por defecto, el valor. */
  texto?: string;
  color?: ThemeColor;
}

/**
 * Gráfico de barras verticales sencillo (horas por mes, alumnos por estado…). Para lectores de
 * pantalla se lee como una lista "etiqueta: texto".
 */
export function GraficoBarras({
  barras,
  alto = 140,
  titulo,
}: {
  barras: Barra[];
  alto?: number;
  titulo: string;
}) {
  const theme = useTheme();
  const animar = useAnimar();
  const maximo = Math.max(1, ...barras.map((b) => b.valor));
  const resumen = barras.map((b) => `${b.etiqueta}: ${b.texto ?? b.valor}`).join(', ');
  return (
    <View accessible accessibilityLabel={`${titulo}. ${resumen}`} style={styles.grafico}>
      {barras.map((b, i) => (
        <View key={b.etiqueta} style={styles.columna}>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {b.texto ?? b.valor}
          </ThemedText>
          <View style={[styles.pista, { height: alto, backgroundColor: theme.subtle }]}>
            <Animated.View
              entering={!animar ? undefined : ZoomIn.duration(Movimiento.entrada).delay(i * 40)}
              style={[
                styles.relleno,
                {
                  height: `${(Math.max(0, b.valor) / maximo) * 100}%`,
                  backgroundColor: theme[b.color ?? 'primary'],
                },
              ]}
            />
          </View>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {b.etiqueta}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grafico: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two },
  columna: { flex: 1, alignItems: 'center', gap: Spacing.one, minWidth: 0 },
  pista: {
    width: '100%',
    maxWidth: 36,
    borderRadius: Radius.control,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  relleno: { width: '100%', borderRadius: Radius.control },
});

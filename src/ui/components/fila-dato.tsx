import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/ui/components/themed-text';
import { Spacing } from '@/ui/theme/theme';

interface Props {
  etiqueta: string;
  valor: string;
  ayuda?: string;
  vertical?: boolean;
}

/** Dato de consulta: agrupa su etiqueta, valor y ayuda para los lectores de pantalla. */
export function FilaDato({ etiqueta, valor, ayuda, vertical = false }: Props) {
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${etiqueta}: ${valor}${ayuda ? `. ${ayuda}` : ''}`}
      style={vertical ? styles.vertical : styles.fila}>
      <ThemedText type="small" themeColor="textSecondary" style={!vertical && styles.etiqueta}>
        {etiqueta}
      </ThemedText>
      <View style={!vertical && styles.contenido}>
        <ThemedText type="smallBold">{valor}</ThemedText>
        {ayuda ? (
          <ThemedText type="small" themeColor="textSecondary">
            {ayuda}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: Spacing.two },
  vertical: { gap: Spacing.one },
  etiqueta: { flexBasis: 120, flexShrink: 1 },
  contenido: { flex: 1, minWidth: 120, gap: Spacing.one },
});

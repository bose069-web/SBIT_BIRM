import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/ui/components/themed-text';
import { Spacing } from '@/ui/theme/theme';

/** Título y acciones de una tarea; en móvil las acciones pasan a la siguiente línea. */
export function CabeceraSeccion({
  titulo,
  descripcion,
  acciones,
}: {
  titulo: string;
  descripcion?: string;
  acciones?: ReactNode;
}) {
  return (
    <View style={styles.cabecera}>
      <View style={styles.textos}>
        <ThemedText accessibilityRole="header" type="subtitle">
          {titulo}
        </ThemedText>
        {descripcion ? (
          <ThemedText type="small" themeColor="textSecondary">
            {descripcion}
          </ThemedText>
        ) : null}
      </View>
      {acciones ? <View style={styles.acciones}>{acciones}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cabecera: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.three },
  textos: { flexGrow: 1, flexShrink: 1, flexBasis: 200, minWidth: 0, gap: Spacing.one },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, maxWidth: '100%' },
});

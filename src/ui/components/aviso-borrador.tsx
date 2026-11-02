import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/ui/components/themed-text';
import { Spacing } from '@/ui/theme/theme';
import { horaCorta } from '@/ui/utils/fechas';

/** Dice si hay un borrador en este dispositivo y permite descartarlo. */
export function AvisoBorrador({
  guardadoEn,
  fallo,
  onDescartar,
}: {
  guardadoEn: string | null;
  fallo: boolean;
  onDescartar: () => void;
}) {
  if (fallo) {
    return (
      <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
        No se ha podido guardar el borrador en este dispositivo.
      </ThemedText>
    );
  }
  if (!guardadoEn) return null;
  return (
    <View style={styles.caja}>
      <ThemedText type="small" themeColor="textSecondary" accessibilityLiveRegion="polite">
        Borrador guardado en este dispositivo a las {horaCorta(guardadoEn)}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Solo está en este dispositivo y navegador, y puede perderse si se borran los datos.
      </ThemedText>
      <Pressable accessibilityRole="button" onPress={onDescartar} hitSlop={8} style={styles.enlace}>
        <ThemedText type="smallBold" themeColor="danger">
          Descartar borrador
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  caja: { gap: Spacing.one },
  enlace: { minHeight: 32, justifyContent: 'center', alignSelf: 'flex-start' },
});

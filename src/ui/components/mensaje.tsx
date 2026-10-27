import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/ui/components/themed-text';
import { useTheme } from '@/ui/hooks/use-theme';
import { Radius, Spacing } from '@/ui/theme/theme';

/** Aviso de error o de éxito junto a un formulario. */
export function Mensaje({ texto, tipo }: { texto: string; tipo: 'error' | 'ok' }) {
  const theme = useTheme();
  const color = tipo === 'error' ? theme.danger : theme.estadoValidado;
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.caja, { borderColor: color, backgroundColor: theme.subtle }]}>
      <ThemedText type="small" style={{ color }}>
        {texto}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  caja: { borderWidth: 1, borderRadius: Radius.control, padding: Spacing.two },
});

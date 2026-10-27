import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { ThemedText } from '@/ui/components/themed-text';
import { useTheme } from '@/ui/hooks/use-theme';
import { Radius, Spacing } from '@/ui/theme/theme';

interface Props {
  titulo?: string;
  accion?: ReactNode;
  children: ReactNode;
  style?: ViewStyle;
}

export function Tarjeta({ titulo, accion, children, style }: Props) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.tarjeta,
        { backgroundColor: theme.surface, borderColor: theme.border },
        style,
      ]}>
      {titulo || accion ? (
        <View style={styles.cabecera}>
          {titulo ? (
            <ThemedText
              accessibilityRole="header"
              type="smallBold"
              themeColor="textSecondary"
              style={styles.titulo}>
              {titulo.toUpperCase()}
            </ThemedText>
          ) : null}
          {accion}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    borderWidth: 1,
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titulo: { fontSize: 12, letterSpacing: 0.6 },
});

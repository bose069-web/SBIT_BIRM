import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { Aparecer } from '@/ui/components/aparecer';
import { Cristal } from '@/ui/components/cristal';

import { ThemedText } from '@/ui/components/themed-text';
import { Radius, Spacing } from '@/ui/theme/theme';

interface Props {
  titulo?: string;
  accion?: ReactNode;
  children: ReactNode;
  style?: ViewStyle;
}

// Tarjeta de cristal que entra con una animación suave.
export function Tarjeta({ titulo, accion, children, style }: Props) {
  return (
    <Aparecer>
      <Cristal style={[styles.tarjeta, style]}>
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
      </Cristal>
    </Aparecer>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titulo: { fontSize: 12, letterSpacing: 0.6 },
});

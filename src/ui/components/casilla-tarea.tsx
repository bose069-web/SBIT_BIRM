import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/ui/components/themed-text';
import { useTheme } from '@/ui/hooks/use-theme';
import { Radius } from '@/ui/theme/theme';

interface Props {
  /** Título de la tarea: forma parte del nombre accesible. */
  titulo: string;
  hecha: boolean;
  onPress: () => void;
  desactivada?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Casilla para marcar una tarea como hecha. El cuadrado se ve de 24, pero el área táctil es de
 * 44 × 44 como pide el mínimo de accesibilidad.
 */
export function CasillaTarea({ titulo, hecha, onPress, desactivada, style }: Props) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={`${titulo}: ${hecha ? 'hecha' : 'pendiente'}`}
      accessibilityHint="Marca o desmarca la tarea"
      accessibilityState={{ checked: hecha, disabled: !!desactivada }}
      disabled={desactivada}
      onPress={onPress}
      style={({ pressed }) => [styles.area, style, (pressed || desactivada) && styles.atenuada]}>
      <View
        style={[
          styles.cuadrado,
          {
            borderColor: hecha ? theme.primary : theme.textSecondary,
            backgroundColor: hecha ? theme.primary : 'transparent',
          },
        ]}>
        {hecha ? (
          <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
            ✓
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  area: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cuadrado: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderRadius: Radius.control / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  atenuada: { opacity: 0.6 },
});

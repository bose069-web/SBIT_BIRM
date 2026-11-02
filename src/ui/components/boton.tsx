import { ActivityIndicator, Platform, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/ui/components/themed-text';
import { useTheme } from '@/ui/hooks/use-theme';
import { useMovimientoReducido } from '@/ui/hooks/use-movimiento-reducido';
import { fondoHoverWeb, transicionWeb, type EstadoPressable } from '@/ui/utils/interaccion-web';
import { Radius, Spacing } from '@/ui/theme/theme';

interface Props {
  texto: string;
  onPress: () => void;
  variante?: 'primario' | 'secundario' | 'peligro';
  cargando?: boolean;
  desactivado?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function Boton({
  texto,
  onPress,
  variante = 'primario',
  cargando,
  desactivado,
  accessibilityLabel,
  accessibilityHint,
}: Props) {
  const theme = useTheme();
  const reducido = useMovimientoReducido();
  const primario = variante === 'primario';
  const color = primario ? theme.onPrimary : variante === 'peligro' ? theme.danger : theme.text;
  const inactivo = desactivado || cargando;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? texto}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactivo, busy: !!cargando }}
      disabled={inactivo}
      onPress={onPress}
      style={({ hovered, pressed }: EstadoPressable) => [
        styles.boton,
        primario
          ? { backgroundColor: theme.primary }
          : { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 },
        transicionWeb(reducido, 'background-color, transform'),
        !inactivo &&
          fondoHoverWeb(
            hovered,
            primario
              ? theme.primaryHover
              : variante === 'peligro'
                ? theme.fondoAusencia
                : theme.subtle,
          ),
        Platform.OS === 'web' &&
          !reducido &&
          !inactivo && {
            transform: [
              { translateY: hovered && !pressed ? -1 : 0 },
              { scale: pressed ? 0.98 : 1 },
            ],
          },
        (pressed || inactivo) && { opacity: 0.6 },
      ]}>
      {cargando ? (
        <ActivityIndicator color={color} />
      ) : (
        <ThemedText type="smallBold" style={{ color }}>
          {texto}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  boton: {
    minHeight: 44,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

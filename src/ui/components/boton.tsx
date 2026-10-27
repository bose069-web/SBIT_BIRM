import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/ui/components/themed-text';
import { useTheme } from '@/ui/hooks/use-theme';
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
      style={({ pressed }) => [
        styles.boton,
        primario
          ? { backgroundColor: theme.primary }
          : { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 },
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

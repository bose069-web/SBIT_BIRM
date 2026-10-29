import { useId } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/ui/components/themed-text';
import { useTheme } from '@/ui/hooks/use-theme';
import { FontFamily, Radius, Spacing } from '@/ui/theme/theme';

interface Props extends TextInputProps {
  etiqueta: string;
  ayuda?: string;
}

export function Campo({ etiqueta, ayuda, style, multiline, ...props }: Props) {
  const theme = useTheme();
  const idEtiqueta = `campo-${useId().replace(/:/g, '')}`;
  return (
    <View style={styles.contenedor}>
      <ThemedText nativeID={idEtiqueta} type="smallBold">
        {etiqueta}
      </ThemedText>
      <TextInput
        accessibilityLabel={etiqueta}
        accessibilityLabelledBy={idEtiqueta}
        accessibilityHint={ayuda}
        placeholderTextColor={theme.textSecondary}
        multiline={multiline}
        style={[
          styles.input,
          { color: theme.text, borderColor: theme.borderStrong, backgroundColor: theme.surface },
          multiline && styles.multilinea,
          // Solo lectura: se distingue de un campo que se puede escribir.
          props.editable === false && {
            color: theme.textSecondary,
            backgroundColor: theme.subtle,
            borderColor: theme.border,
          },
          style,
        ]}
        {...props}
      />
      {ayuda ? (
        <ThemedText type="small" themeColor="textSecondary">
          {ayuda}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: Spacing.one },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    fontFamily: FontFamily.regular,
  },
  multilinea: { minHeight: 88, textAlignVertical: 'top' },
});

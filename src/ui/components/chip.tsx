import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/ui/components/themed-text';
import { useTheme } from '@/ui/hooks/use-theme';
import { Radius, Spacing, type ThemeColor } from '@/ui/theme/theme';

interface Props {
  texto: string;
  /** El color solo acompaña: el texto siempre dice el estado. */
  color?: ThemeColor;
}

export function Chip({ texto, color = 'textSecondary' }: Props) {
  const theme = useTheme();
  return (
    <View style={[styles.chip, { borderColor: theme.border, backgroundColor: theme.subtle }]}>
      <View style={[styles.punto, { backgroundColor: theme[color] }]} />
      <ThemedText type="small">{texto}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  punto: { width: 8, height: 8, borderRadius: 4 },
});

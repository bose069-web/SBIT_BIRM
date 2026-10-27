import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/ui/components/themed-text';
import { useTheme } from '@/ui/hooks/use-theme';
import { BottomTabInset, MaxContentWidth, Spacing, TopTabInset } from '@/ui/theme/theme';

interface Props {
  titulo: string;
  subtitulo?: string;
  children: ReactNode;
}

/** Contenedor común de las pantallas: scroll, ancho máximo y hueco para las pestañas. */
export function Pantalla({ titulo, subtitulo, children }: Props) {
  const theme = useTheme();
  return (
    <SafeAreaView edges={['top']} style={[styles.fondo, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.contenido}>
          <View style={styles.cabecera}>
            <ThemedText type="title">{titulo}</ThemedText>
            {subtitulo ? <ThemedText themeColor="textSecondary">{subtitulo}</ThemedText> : null}
          </View>
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1 },
  scroll: {
    alignItems: 'center',
    paddingTop: TopTabInset + Spacing.four,
    paddingBottom: BottomTabInset + Spacing.five,
    paddingHorizontal: Spacing.three,
  },
  contenido: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.three },
  cabecera: { gap: Spacing.one, marginBottom: Spacing.two },
});

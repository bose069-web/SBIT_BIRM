import { useEffect, type ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ponerDesplazado } from '@/ui/estado/preferencias-web';
import { ThemedText } from '@/ui/components/themed-text';
import { useTheme } from '@/ui/hooks/use-theme';
import { BottomTabInset, MaxContentWidth, Spacing, TopTabInset } from '@/ui/theme/theme';

interface Props {
  titulo: string;
  subtitulo?: string;
  children: ReactNode;
  /** En la web ancha la pantalla usa más anchura (paneles en columnas). */
  amplia?: boolean;
}

/** Contenedor común de las pantallas: scroll, ancho máximo y hueco para las pestañas. */
export function Pantalla({ titulo, subtitulo, children, amplia }: Props) {
  const theme = useTheme();
  const web = Platform.OS === 'web';
  // Cada pantalla empieza arriba: la cabecera de la web vuelve a mostrar el logotipo entero.
  useEffect(() => {
    if (web) ponerDesplazado(false);
  }, [web]);
  return (
    <SafeAreaView edges={['top']} style={[styles.fondo, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        // Los campos de los formularios se pueden tocar con el teclado abierto y, al arrastrar,
        // el teclado se cierra en vez de quedarse tapando el contenido.
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <View style={[styles.contenido, amplia && styles.amplia]}>
          <View style={styles.cabecera}>
            <ThemedText accessibilityRole="header" type="title">
              {titulo}
            </ThemedText>
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
  amplia: { maxWidth: 1200 },
  cabecera: { gap: Spacing.one, marginBottom: Spacing.two },
});

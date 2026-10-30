import { useEffect, useState, type ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ponerDesplazado } from '@/ui/estado/preferencias-web';
import { ThemedText } from '@/ui/components/themed-text';
import { useTheme } from '@/ui/hooks/use-theme';
import { BottomTabInset, MaxContentWidth, Spacing, TopTabInset } from '@/ui/theme/theme';

interface Props {
  titulo: string;
  subtitulo?: string;
  /** Junto al título, a la derecha (en la web ancha): un estado o una acción. */
  accion?: ReactNode;
  children: ReactNode;
  /** En la web ancha la pantalla usa más anchura (paneles en columnas). */
  amplia?: boolean;
  /** Menos aire arriba: para pantallas de trabajo como el chat, donde manda el contenido. */
  compacta?: boolean;
  /** La cabecera nativa de la pila ya reserva el área segura superior. */
  bajoCabecera?: boolean;
  /** Acción fija fuera del scroll, situada por encima de las pestañas en móvil. */
  pie?: ReactNode;
}

/** Contenedor común de las pantallas: scroll, ancho máximo y hueco para las pestañas. */
export function Pantalla({
  titulo,
  subtitulo,
  accion,
  children,
  amplia,
  compacta,
  bajoCabecera,
  pie,
}: Props) {
  const theme = useTheme();
  const web = Platform.OS === 'web';
  const areaSegura = useSafeAreaInsets();
  const [altoPie, setAltoPie] = useState(0);
  // En iOS el área segura de las pestañas nativas ya incluye la altura de la barra.
  const huecoInferior = web
    ? 0
    : Platform.OS === 'ios'
      ? areaSegura.bottom
      : BottomTabInset + areaSegura.bottom;
  // Cada pantalla empieza arriba: la cabecera de la web vuelve a mostrar el logotipo entero.
  useEffect(() => {
    if (web) ponerDesplazado(false);
  }, [web]);
  return (
    <SafeAreaView
      edges={bajoCabecera && !web ? [] : ['top']}
      style={[styles.fondo, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.fondo}
        contentContainerStyle={[
          styles.scroll,
          compacta && styles.scrollCompacta,
          bajoCabecera && !web && styles.bajoCabecera,
          { paddingBottom: huecoInferior + Spacing.five + (pie ? altoPie : 0) },
        ]}
        // Los campos de los formularios se pueden tocar con el teclado abierto y, al arrastrar,
        // el teclado se cierra en vez de quedarse tapando el contenido.
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <View style={[styles.contenido, amplia && styles.amplia]}>
          <View
            style={[
              styles.cabecera,
              accion ? styles.conAccion : null,
              compacta && styles.sinMargen,
            ]}>
            <View style={styles.titulos}>
              <ThemedText accessibilityRole="header" type="title">
                {titulo}
              </ThemedText>
              {subtitulo ? <ThemedText themeColor="textSecondary">{subtitulo}</ThemedText> : null}
            </View>
            {accion}
          </View>
          {children}
        </View>
      </ScrollView>
      {pie ? (
        <View
          onLayout={({ nativeEvent }) => setAltoPie(nativeEvent.layout.height)}
          style={[
            styles.pie,
            {
              bottom: huecoInferior,
              backgroundColor: theme.background,
              borderTopColor: theme.border,
              paddingLeft: Spacing.three + (web ? 0 : areaSegura.left),
              paddingRight: Spacing.three + (web ? 0 : areaSegura.right),
            },
          ]}>
          <View style={[styles.contenido, amplia && styles.amplia]}>{pie}</View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1 },
  scroll: {
    alignItems: 'center',
    paddingTop: TopTabInset + Spacing.four,
    paddingHorizontal: Spacing.three,
  },
  scrollCompacta: { paddingTop: TopTabInset + Spacing.two },
  bajoCabecera: { paddingTop: Spacing.two },
  pie: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sinMargen: { marginBottom: 0 },
  contenido: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.three },
  amplia: { maxWidth: 1200 },
  cabecera: { gap: Spacing.three, marginBottom: Spacing.two },
  conAccion: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  titulos: { gap: Spacing.one },
});

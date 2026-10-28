import type { ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Quesito } from '@/ui/components/quesito';
import { ThemedText } from '@/ui/components/themed-text';
import { cambiarEsquemaWeb, useEsquemaWeb } from '@/ui/estado/preferencias-web';
import { useTheme } from '@/ui/hooks/use-theme';
import { FontFamily, Radius, Spacing } from '@/ui/theme/theme';

const LOGOTIPO = {
  light: require('@/assets/brand/kampus-logotipo.png'),
  dark: require('@/assets/brand/kampus-logotipo-blanco.png'),
};
const ANCHO = 1120;

/** Portada horizontal de la web: presentación a la izquierda y acceso/app a la derecha. */
export function Portada({ acceso }: { acceso: ReactNode }) {
  const theme = useTheme();
  const esquema = useEsquemaWeb();
  const oscuro = esquema === 'dark';

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.pagina}>
      <View style={[styles.franja, styles.cabecera]}>
        <Image accessibilityLabel="Kampus" source={LOGOTIPO[esquema]} style={styles.logo} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          onPress={() => cambiarEsquemaWeb(oscuro ? 'light' : 'dark')}
          style={[styles.botonModo, { borderColor: theme.border }]}>
          <ThemedText type="small">{oscuro ? 'Modo claro' : 'Modo oscuro'}</ThemedText>
        </Pressable>
      </View>

      {/* Bloque principal: mensaje y vista de la app a la izquierda, acceso a la derecha. */}
      <View style={[styles.franja, styles.heroe]}>
        <View style={styles.columnaTexto}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.antetitulo}>
            PRÁCTICAS DE FP · FCT Y DUAL
          </ThemedText>
          <ThemedText style={styles.titular}>Las prácticas de FP,{'\n'}sin papeles.</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.entradilla}>
            Alumno, empresa, profe e instituto en el mismo sitio. Las horas se apuntan en un toque y
            se validan en dos.
          </ThemedText>
          <MovilDeMuestra />
        </View>
        <View style={styles.columnaAcceso}>{acceso}</View>
      </View>
    </ScrollView>
  );
}

/** Un móvil dibujado con el calendario y el quesito, para enseñar la app sin capturas. */
function MovilDeMuestra() {
  const theme = useTheme();
  const dias = Array.from({ length: 31 }, (_, i) => i + 1);
  return (
    <View
      style={styles.escaparate}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <View style={[styles.halo, { backgroundColor: theme.primarySuave }]} />
      <View style={[styles.movil, { backgroundColor: theme.surface, borderColor: theme.text }]}>
        <ThemedText type="smallBold">Octubre 2026</ThemedText>
        <View style={styles.mes}>
          {[...Array(3)].map((_, i) => (
            <View key={`h${i}`} style={styles.diaMovil} />
          ))}
          {dias.map((d) => (
            <View
              key={d}
              style={[
                styles.diaMovil,
                d === 28 && { backgroundColor: theme.primary, borderRadius: Radius.pill },
              ]}>
              <ThemedText
                style={[
                  styles.textoDia,
                  { color: d === 28 ? theme.onPrimary : theme.textSecondary },
                ]}>
                {d}
              </ThemedText>
            </View>
          ))}
        </View>
        <View style={[styles.horasMovil, { borderTopColor: theme.border }]}>
          <Quesito porcentaje={38} tamano={52} etiqueta="Ejemplo de progreso" />
          <View>
            <ThemedText type="smallBold">152 h</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              de 400 h
            </ThemedText>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pagina: { alignItems: 'center' },
  franja: { width: '100%', maxWidth: ANCHO, paddingHorizontal: Spacing.five },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.four,
  },
  logo: { width: 120, height: 34, resizeMode: 'contain' },
  botonModo: {
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
  },
  heroe: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.six,
    paddingVertical: Spacing.five,
  },
  columnaTexto: { flex: 1.3, gap: Spacing.three },
  columnaAcceso: { flex: 1, maxWidth: 420 },
  antetitulo: { letterSpacing: 1 },
  titular: { fontSize: 52, lineHeight: 58, letterSpacing: -1.5, fontFamily: FontFamily.semibold },
  entradilla: { fontSize: 18, lineHeight: 28, maxWidth: 520 },
  escaparate: { height: 300, justifyContent: 'center', marginTop: Spacing.three },
  halo: { position: 'absolute', width: 260, height: 260, borderRadius: 130, left: 40 },
  movil: {
    width: 230,
    borderRadius: 32,
    borderWidth: 5,
    padding: Spacing.three,
    gap: Spacing.two,
    marginLeft: 55,
  },
  mes: { flexDirection: 'row', flexWrap: 'wrap' },
  diaMovil: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoDia: { fontSize: 10, lineHeight: 12 },
  horasMovil: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderTopWidth: 1,
    paddingTop: Spacing.two,
  },
});

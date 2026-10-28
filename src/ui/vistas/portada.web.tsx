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

const TRAZOS = {
  toque: (
    <path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10m0-1.5a1.5 1.5 0 0 1 3 0V11m0-1a1.5 1.5 0 0 1 3 0v4a6 6 0 0 1-6 6h-.5a6 6 0 0 1-5-2.7L4.6 14a1.5 1.5 0 0 1 2.5-1.7L9 15" />
  ),
  validar: <path d="M3 12.5 7 16.5 15 8.5M10 16.5 11 17.5 21 7.5" />,
  chat: (
    <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4 3.5V16h0A2 2 0 0 1 4 14z" />
  ),
  informe: (
    <>
      <path d="M12 3v9h9" />
      <path d="M20.5 15A9 9 0 1 1 9 3.5" />
    </>
  ),
};

const VENTAJAS: { icono: keyof typeof TRAZOS; titulo: string; texto: string }[] = [
  {
    icono: 'toque',
    titulo: 'Registro en un toque',
    texto: 'El alumno apunta su día desde el móvil.',
  },
  { icono: 'validar', titulo: 'Doble validación', texto: 'Primero la empresa, después el profe.' },
  { icono: 'chat', titulo: 'Chat por alumno', texto: 'Alumno, tutores e instituto en un hilo.' },
  {
    icono: 'informe',
    titulo: 'Informes al día',
    texto: 'Horas y progreso de cada rol, sin Excel.',
  },
];

const PASOS = [
  { titulo: 'El instituto crea el dossier', texto: 'Alumno, empresa, tutores y periodo.' },
  { titulo: 'El alumno apunta su día', texto: 'Horas y actividades, con su calendario.' },
  { titulo: 'Empresa y profe validan', texto: 'Con un botón, y el informe sale solo.' },
];

const ANTES_AHORA = [
  ['Hojas y firmas en papel', 'Un toque en el móvil'],
  ['Validar a final de mes', 'Validar cada semana'],
  ['Correos sueltos', 'Un chat por alumno'],
  ['Contar horas a mano', 'Quesito y gráficos al día'],
];

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

      <Seccion titulo="Ventajas">
        <View style={styles.fila}>
          {VENTAJAS.map((v) => (
            <Tarjetita key={v.titulo}>
              <svg
                aria-hidden
                width={22}
                height={22}
                viewBox="0 0 24 24"
                fill="none"
                stroke={theme.primary}
                strokeWidth={1.7}
                strokeLinecap="round"
                strokeLinejoin="round">
                {TRAZOS[v.icono]}
              </svg>
              <ThemedText type="smallBold">{v.titulo}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {v.texto}
              </ThemedText>
            </Tarjetita>
          ))}
        </View>
      </Seccion>

      <View style={{ backgroundColor: theme.subtle, width: '100%', alignItems: 'center' }}>
        <Seccion titulo="Cómo funciona">
          <View style={styles.fila}>
            {PASOS.map((p, i) => (
              <View key={p.titulo} style={styles.paso}>
                <ThemedText style={[styles.numero, { color: theme.primary }]}>{i + 1}</ThemedText>
                <ThemedText type="smallBold">{p.titulo}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {p.texto}
                </ThemedText>
              </View>
            ))}
          </View>
        </Seccion>
      </View>

      <Seccion titulo="Antes y ahora">
        <Tarjetita>
          {ANTES_AHORA.map(([antes, ahora]) => (
            <View key={antes} style={[styles.comparar, { borderBottomColor: theme.border }]}>
              <ThemedText themeColor="textSecondary" style={styles.flex}>
                {antes}
              </ThemedText>
              <ThemedText style={[styles.flecha, { color: theme.primary }]}>→</ThemedText>
              <ThemedText type="smallBold" style={styles.flex}>
                {ahora}
              </ThemedText>
            </View>
          ))}
        </Tarjetita>
      </Seccion>

      <View style={[styles.franja, styles.pie, { borderTopColor: theme.border }]}>
        <ThemedText type="small" themeColor="textSecondary">
          Kampus · TEAM BIRM · DAM 2026
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Cada rol ve solo lo suyo. Datos protegidos según el RGPD.
        </ThemedText>
      </View>
    </ScrollView>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <View style={[styles.franja, styles.seccion]}>
      <ThemedText type="subtitle">{titulo}</ThemedText>
      {children}
    </View>
  );
}

function Tarjetita({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.tarjetita, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {children}
    </View>
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
  seccion: { paddingVertical: Spacing.five, gap: Spacing.four },
  fila: { flexDirection: 'row', gap: Spacing.three },
  tarjetita: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.card,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  paso: { flex: 1, gap: Spacing.one },
  numero: { fontSize: 32, lineHeight: 38, fontFamily: FontFamily.semibold },
  comparar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  flecha: { fontSize: 18 },
  flex: { flex: 1 },
  pie: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.four,
    borderTopWidth: 1,
  },
});

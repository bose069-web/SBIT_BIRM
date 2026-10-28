import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/ui/components/themed-text';
import { useTheme } from '@/ui/hooks/use-theme';
import { FontFamily, Radius, Spacing } from '@/ui/theme/theme';
import { DIAS_SEMANA, esFinDeSemana, semanasDelMes } from '@/ui/utils/calendario';
import { nombreMes } from '@/ui/utils/fechas';

/**
 * Vistazo del mes para Inicio: solo enseña el mes y el día de hoy. No se eligen días aquí; al
 * tocarlo se abre la pestaña Calendario, que es donde se trabaja con los días.
 */
export function MiniCalendario({ hoy }: { hoy: string }) {
  const theme = useTheme();
  const mes = hoy.slice(0, 7);
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${nombreMes(mes)}. Abrir el calendario`}
      onPress={() => router.navigate('/calendario')}
      style={({ pressed }) => [styles.caja, pressed && { opacity: 0.7 }]}>
      <View style={styles.cabecera}>
        <ThemedText style={styles.titulo}>
          {nombreMes(mes).charAt(0).toUpperCase() + nombreMes(mes).slice(1)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Ver calendario ›
        </ThemedText>
      </View>
      <View style={styles.semana}>
        {DIAS_SEMANA.map((d) => (
          <ThemedText key={d} style={[styles.celda, styles.letra, { color: theme.textSecondary }]}>
            {d}
          </ThemedText>
        ))}
      </View>
      {semanasDelMes(mes).map((semana, i) => (
        <View key={i} style={styles.semana}>
          {semana.map((fecha, j) => {
            if (!fecha) return <View key={j} style={styles.celda} />;
            const esHoy = fecha === hoy;
            return (
              <View key={fecha} style={styles.celda}>
                <View style={[styles.dia, esHoy && { backgroundColor: theme.primary }]}>
                  <ThemedText
                    style={[
                      styles.numero,
                      {
                        color: esHoy
                          ? theme.onPrimary
                          : esFinDeSemana(fecha) || fecha < hoy
                            ? theme.textSecondary
                            : theme.text,
                      },
                      esHoy && styles.numeroHoy,
                    ]}>
                    {Number(fecha.slice(8))}
                  </ThemedText>
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  caja: { gap: Spacing.one },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: Spacing.one,
  },
  titulo: { fontSize: 20, lineHeight: 26, fontFamily: FontFamily.semibold },
  semana: { flexDirection: 'row' },
  celda: { flex: 1, alignItems: 'center' },
  letra: { fontSize: 11, lineHeight: 16, textAlign: 'center' },
  dia: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numero: { fontSize: 14, lineHeight: 18 },
  numeroHoy: { fontFamily: FontFamily.semibold },
});

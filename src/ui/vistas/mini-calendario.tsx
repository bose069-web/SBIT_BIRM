import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { RegistroDiario } from '@/core/domain/registro-diario';

import { ThemedText } from '@/ui/components/themed-text';
import { useTheme } from '@/ui/hooks/use-theme';
import { FontFamily, Radius, Spacing } from '@/ui/theme/theme';
import { DIAS_SEMANA, esFinDeSemana, estadoDia, semanasDelMes } from '@/ui/utils/calendario';
import { nombreMes } from '@/ui/utils/fechas';

import { ESTADOS_DIA } from './calendario-mes';

interface Props {
  hoy: string;
  /** Con los días apuntados y el periodo, cada día se pinta con el color de su estado. */
  registros?: RegistroDiario[];
  periodo?: { fechaInicio: string; fechaFin: string };
  /** Mes y enlace propios; sin ellos, los pone la tarjeta que lo contiene. */
  cabecera?: boolean;
}

/**
 * Vistazo del mes para Inicio: el día de hoy y cada día pintado según su estado (trabajado, sin
 * apuntar, ausencia, festivo). No se eligen días aquí; al tocarlo se abre la pestaña Calendario.
 */
export function MiniCalendario({ hoy, registros, periodo, cabecera = true }: Props) {
  const theme = useTheme();
  const mes = hoy.slice(0, 7);
  const porFecha = new Map(registros?.map((r) => [r.fecha, r]));
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${nombreMes(mes)}. Abrir el calendario`}
      onPress={() => router.navigate('/calendario')}
      style={({ pressed }) => [styles.caja, pressed && { opacity: 0.7 }]}>
      {cabecera ? (
        <View style={styles.cabecera}>
          <ThemedText style={styles.titulo}>
            {nombreMes(mes).charAt(0).toUpperCase() + nombreMes(mes).slice(1)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Ver calendario ›
          </ThemedText>
        </View>
      ) : null}
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
            const estado = periodo
              ? ESTADOS_DIA[estadoDia(fecha, porFecha.get(fecha), periodo, hoy)]
              : null;
            // El día se pinta con el color de su estado; hoy sigue en azul.
            const fondo = esHoy ? theme.primary : estado?.fondo ? theme[estado.fondo] : undefined;
            return (
              <View key={fecha} style={styles.celda}>
                <View
                  style={[
                    styles.dia,
                    fondo ? { backgroundColor: fondo } : null,
                    !esHoy &&
                      estado?.fondo === 'fondoPendiente' && {
                        borderWidth: 1.5,
                        borderStyle: 'dashed',
                        borderColor: theme.bordePendiente,
                      },
                  ]}>
                  <ThemedText
                    style={[
                      styles.numero,
                      {
                        color: esHoy
                          ? theme.onPrimary
                          : estado?.tinta
                            ? theme[estado.tinta]
                            : !estado?.fondo && (esFinDeSemana(fecha) || fecha < hoy)
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
  celda: { flex: 1, alignItems: 'center', paddingVertical: 2 },
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

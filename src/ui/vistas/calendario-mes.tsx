import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { totalHoras, type RegistroDiario } from '@/core/domain/registro-diario';
import { mesDe } from '@/core/domain/valoracion';
import { Leyenda, type ElementoLeyenda } from '@/ui/components/leyenda';
import { ThemedText } from '@/ui/components/themed-text';
import { useAnimar } from '@/ui/hooks/use-animar';
import { useTheme } from '@/ui/hooks/use-theme';
import { FontFamily, Movimiento, Radius, Spacing, type ThemeColor } from '@/ui/theme/theme';
import {
  DIAS_SEMANA,
  estadoDia,
  semanasDelMes,
  sumarMeses,
  type EstadoDia,
} from '@/ui/utils/calendario';
import { fechaCorta, formatoHoras, nombreMes } from '@/ui/utils/fechas';

import { estilosComunes } from './comun';

type Forma = 'punto' | 'anillo' | 'cuadrado' | 'rombo';

// Cada estado tiene color y forma propios (no se distingue solo por el color) y la leyenda lo
// explica. El texto completo va en la etiqueta accesible de cada día.
export const ESTADOS_DIA: Record<
  EstadoDia,
  { texto: string; color: ThemeColor | null; forma: Forma }
> = {
  trabajo: { texto: 'Trabajo', color: 'estadoValidado', forma: 'punto' },
  ausencia: { texto: 'Ausencia', color: 'estadoAusencia', forma: 'cuadrado' },
  festivo: { texto: 'Festivo', color: 'estadoFestivo', forma: 'rombo' },
  pendiente: { texto: 'Sin apuntar', color: 'estadoPendiente', forma: 'anillo' },
  futuro: { texto: 'Próximo', color: null, forma: 'punto' },
  libre: { texto: 'Fin de semana', color: null, forma: 'punto' },
  fuera: { texto: 'Fuera del periodo', color: null, forma: 'punto' },
};
const EN_LEYENDA: EstadoDia[] = ['trabajo', 'pendiente', 'ausencia', 'festivo'];

interface Props {
  /** `AAAA-MM` */
  mes: string;
  onCambiarMes: (mes: string) => void;
  /** Días apuntados de ese mes. */
  dias: RegistroDiario[];
  periodo: { fechaInicio: string; fechaFin: string };
  hoy: string;
  /** El mes ya está valorado por la empresa. */
  cerrado: boolean;
  seleccionada?: string;
  onElegir: (fecha: string) => void;
  /** Lo que hay apuntado cada día (eventos y fechas límite de tareas), por `AAAA-MM-DD`. */
  agenda?: Map<string, string[]>;
}

/** Calendario de un mes con el estado de cada día del alumno. */
export function CalendarioMes({
  mes,
  onCambiarMes,
  dias,
  periodo,
  hoy,
  cerrado,
  seleccionada,
  onElegir,
  agenda,
}: Props) {
  const theme = useTheme();
  const animar = useAnimar();
  const porFecha = new Map(dias.map((d) => [d.fecha, d]));
  const horasMes = dias.reduce((s, d) => s + totalHoras(d), 0);
  const leyenda: ElementoLeyenda[] = EN_LEYENDA.map((e) => ({
    texto: ESTADOS_DIA[e].texto,
    color: ESTADOS_DIA[e].color ?? 'textSecondary',
    forma: ESTADOS_DIA[e].forma,
  }));
  if (agenda) leyenda.push({ texto: 'Evento o entrega', color: 'primary', forma: 'punto' });

  return (
    <View style={styles.contenedor}>
      <View style={styles.cabecera}>
        <View style={styles.titulo}>
          <ThemedText type="subtitle" style={estilosComunes.capital}>
            {nombreMes(mes)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatoHoras(horasMes)} este mes{cerrado ? ' · valorado' : ''}
          </ThemedText>
        </View>
        <BotonMes
          texto="‹"
          etiqueta="Mes anterior"
          desactivado={mes <= mesDe(periodo.fechaInicio)}
          onPress={() => onCambiarMes(sumarMeses(mes, -1))}
        />
        <BotonMes
          texto="›"
          etiqueta="Mes siguiente"
          desactivado={mes >= mesDe(periodo.fechaFin)}
          onPress={() => onCambiarMes(sumarMeses(mes, 1))}
        />
      </View>

      <View style={styles.semana}>
        {DIAS_SEMANA.map((d) => (
          <ThemedText key={d} type="small" themeColor="textSecondary" style={styles.diaSemana}>
            {d}
          </ThemedText>
        ))}
      </View>

      {/* La clave hace que al cambiar de mes la rejilla entre con un fundido. */}
      <Animated.View
        key={mes}
        entering={!animar ? undefined : FadeIn.duration(Movimiento.normal)}
        style={styles.rejilla}>
        {semanasDelMes(mes).map((semana, i) => (
          <View key={i} style={styles.semana}>
            {semana.map((fecha, j) => {
              if (!fecha) return <View key={j} style={styles.celda} />;
              const registro = porFecha.get(fecha);
              const estado = estadoDia(fecha, registro, periodo, hoy);
              const info = ESTADOS_DIA[estado];
              const horas = estado === 'trabajo' && registro ? totalHoras(registro) : 0;
              const elegida = fecha === seleccionada;
              const esHoy = fecha === hoy;
              const delDia = agenda?.get(fecha) ?? [];
              const apagado = estado === 'libre' || estado === 'futuro' || estado === 'fuera';
              return (
                <Pressable
                  key={fecha}
                  accessibilityRole="button"
                  accessibilityLabel={`${fechaCorta(fecha)}${esHoy ? ', hoy' : ''}: ${info.texto}${horas ? `, ${formatoHoras(horas)}` : ''}${delDia.length ? `. ${delDia.join('; ')}` : ''}`}
                  accessibilityState={{ disabled: estado === 'fuera', selected: elegida }}
                  disabled={estado === 'fuera'}
                  onPress={() => onElegir(fecha)}
                  style={({ pressed }) => [
                    styles.celda,
                    styles.dia,
                    {
                      backgroundColor: elegida
                        ? theme.primarySuave
                        : pressed
                          ? theme.subtle
                          : 'transparent',
                      opacity: estado === 'fuera' ? 0.35 : 1,
                    },
                  ]}>
                  <View style={[styles.numero, esHoy && { backgroundColor: theme.primary }]}>
                    <ThemedText
                      style={[
                        styles.textoNumero,
                        {
                          color: esHoy
                            ? theme.onPrimary
                            : apagado
                              ? theme.textSecondary
                              : theme.text,
                        },
                      ]}>
                      {Number(fecha.slice(8))}
                    </ThemedText>
                  </View>
                  <View style={styles.marcas}>
                    {info.color ? <Marca forma={info.forma} color={theme[info.color]} /> : null}
                    {delDia.length ? <Marca forma="punto" color={theme.primary} /> : null}
                  </View>
                  {horas ? (
                    <ThemedText style={[styles.horas, { color: theme.textSecondary }]}>
                      {formatoHoras(horas).replace(' ', '')}
                    </ThemedText>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </Animated.View>

      <Leyenda elementos={leyenda} />
    </View>
  );
}

function BotonMes({
  texto,
  etiqueta,
  desactivado,
  onPress,
}: {
  texto: string;
  etiqueta: string;
  desactivado: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled: desactivado }}
      disabled={desactivado}
      onPress={onPress}
      style={({ pressed }) => [
        styles.botonMes,
        { backgroundColor: pressed ? theme.border : theme.subtle, opacity: desactivado ? 0.4 : 1 },
      ]}>
      <ThemedText type="subtitle" style={styles.flecha}>
        {texto}
      </ThemedText>
    </Pressable>
  );
}

function Marca({ forma, color }: { forma: Forma; color: string }) {
  return (
    <View
      style={[
        styles.marca,
        forma === 'anillo' || forma === 'rombo'
          ? { borderColor: color, borderWidth: 1.5 }
          : { backgroundColor: color },
        forma === 'punto' || forma === 'anillo' ? styles.redonda : styles.esquinas,
        forma === 'rombo' && styles.girada,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: Spacing.three },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  titulo: { flex: 1 },
  botonMes: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flecha: { lineHeight: 28 },
  rejilla: { gap: Spacing.one },
  semana: { flexDirection: 'row', gap: Spacing.one },
  diaSemana: { flex: 1, textAlign: 'center' },
  celda: { flex: 1, minHeight: 56 },
  dia: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 3,
    borderRadius: Radius.button,
    paddingVertical: Spacing.one,
  },
  numero: {
    width: 30,
    height: 30,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoNumero: { fontSize: 15, lineHeight: 20, fontFamily: FontFamily.medium },
  marcas: { flexDirection: 'row', gap: 3, minHeight: 7, alignItems: 'center' },
  marca: { width: 7, height: 7 },
  redonda: { borderRadius: 4 },
  esquinas: { borderRadius: 1.5 },
  girada: { transform: [{ rotate: '45deg' }] },
  horas: { fontSize: 10, lineHeight: 12, fontFamily: FontFamily.medium },
});

import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { totalHoras, type RegistroDiario } from '@/core/domain/registro-diario';
import { mesDe } from '@/core/domain/valoracion';
import { Leyenda, type ElementoLeyenda } from '@/ui/components/leyenda';
import { ThemedText } from '@/ui/components/themed-text';
import { useAnimar } from '@/ui/hooks/use-animar';
import { useTheme } from '@/ui/hooks/use-theme';
import { FontFamily, Movimiento, Radius, Spacing, type ThemeColor } from '@/ui/theme/theme';
import { estadoDia, semanasDelMes, sumarMeses, type EstadoDia } from '@/ui/utils/calendario';
import { fechaCorta, formatoHoras, nombreMes } from '@/ui/utils/fechas';

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

  const mesHoy = mesDe(hoy);

  return (
    <View style={styles.contenedor}>
      <View style={styles.cabecera}>
        <View style={styles.titulo}>
          <ThemedText accessibilityRole="header" style={styles.textoTitulo}>
            {capitalizar(nombreMes(mes))}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatoHoras(horasMes)} este mes{cerrado ? ' · valorado' : ''}
          </ThemedText>
        </View>
        <View style={[styles.controles, { backgroundColor: theme.subtle }]}>
          <BotonMes
            texto="‹"
            etiqueta="Mes anterior"
            desactivado={mes <= mesDe(periodo.fechaInicio)}
            onPress={() => onCambiarMes(sumarMeses(mes, -1))}
          />
          <BotonMes
            texto="Hoy"
            etiqueta="Ir al mes de hoy"
            desactivado={mes === mesHoy}
            onPress={() => onCambiarMes(mesHoy)}
          />
          <BotonMes
            texto="›"
            etiqueta="Mes siguiente"
            desactivado={mes >= mesDe(periodo.fechaFin)}
            onPress={() => onCambiarMes(sumarMeses(mes, 1))}
          />
        </View>
      </View>

      <View>
        <View style={styles.semana}>
          {DIAS_SEMANA_CORTOS.map((d) => (
            <ThemedText key={d} type="small" themeColor="textSecondary" style={styles.diaSemana}>
              {d}
            </ThemedText>
          ))}
        </View>

        {/* La clave hace que al cambiar de mes la rejilla entre con un fundido. */}
        <Animated.View
          key={mes}
          entering={!animar ? undefined : FadeIn.duration(Movimiento.normal)}>
          {rejillaCompleta(mes).map((semana, i) => (
            <View key={i} style={[styles.semana, styles.fila, { borderTopColor: theme.border }]}>
              {semana.map((fecha, j) => {
                const borde = j > 0 && {
                  borderLeftWidth: StyleSheet.hairlineWidth,
                  borderLeftColor: theme.border,
                };
                const dia = Number(fecha.slice(8));
                // Días del mes de antes o de después: solo el número, apagado.
                if (fecha.slice(0, 7) !== mes) {
                  return (
                    <View key={fecha} style={[styles.celda, borde]}>
                      <ThemedText
                        style={[styles.textoNumero, styles.ajeno, { color: theme.textSecondary }]}>
                        {dia === 1 ? fechaCorta(fecha).replace(/ \d{4}$/, '') : dia}
                      </ThemedText>
                    </View>
                  );
                }
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
                      borde,
                      {
                        backgroundColor: elegida || pressed ? theme.subtle : 'transparent',
                        opacity: estado === 'fuera' ? 0.35 : 1,
                      },
                    ]}>
                    <View style={styles.arriba}>
                      {info.color ? (
                        <Marca forma={info.forma} color={theme[info.color]} />
                      ) : (
                        <View />
                      )}
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
                          {dia}
                        </ThemedText>
                      </View>
                    </View>
                    {delDia.slice(0, 2).map((texto, k) => (
                      <View
                        key={k}
                        style={[styles.pastilla, { backgroundColor: theme.primarySuave }]}>
                        <ThemedText
                          numberOfLines={1}
                          style={[styles.textoPastilla, { color: theme.text }]}>
                          {texto}
                        </ThemedText>
                      </View>
                    ))}
                    {delDia.length > 2 ? (
                      <ThemedText style={[styles.textoPastilla, { color: theme.textSecondary }]}>
                        +{delDia.length - 2} más
                      </ThemedText>
                    ) : null}
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
      </View>

      <Leyenda elementos={leyenda} />
    </View>
  );
}

const DIAS_SEMANA_CORTOS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];

const capitalizar = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** Como `semanasDelMes`, pero rellenando los huecos con los días del mes de antes y de después. */
function rejillaCompleta(mes: string): string[][] {
  const [a, m] = mes.split('-').map(Number);
  return semanasDelMes(mes).map((semana, i) =>
    semana.map((fecha, j) => {
      if (fecha) return fecha;
      const primera = semanasDelMes(mes)[0].findIndex((f) => f !== null);
      const d = new Date(a, m - 1, 1 + i * 7 + j - primera);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }),
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
        { backgroundColor: pressed ? theme.border : 'transparent', opacity: desactivado ? 0.4 : 1 },
      ]}>
      <ThemedText type="smallBold">{texto}</ThemedText>
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
  textoTitulo: { fontSize: 26, lineHeight: 32, fontFamily: FontFamily.semibold },
  controles: { flexDirection: 'row', borderRadius: Radius.pill, padding: 2 },
  botonMes: {
    minWidth: 44,
    height: 40,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  semana: { flexDirection: 'row' },
  fila: { borderTopWidth: StyleSheet.hairlineWidth },
  diaSemana: {
    flex: 1,
    textAlign: 'right',
    paddingHorizontal: Spacing.one,
    paddingBottom: Spacing.one,
  },
  celda: { flex: 1, minHeight: 76, padding: 3, gap: 2, overflow: 'hidden' },
  arriba: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 2,
  },
  numero: {
    minWidth: 26,
    height: 26,
    paddingHorizontal: 4,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoNumero: { fontSize: 14, lineHeight: 18, fontFamily: FontFamily.medium },
  ajeno: { textAlign: 'right', paddingHorizontal: 4, paddingTop: 4 },
  pastilla: { borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  textoPastilla: { fontSize: 10, lineHeight: 13, fontFamily: FontFamily.medium },
  marca: { width: 7, height: 7 },
  redonda: { borderRadius: 4 },
  esquinas: { borderRadius: 1.5 },
  girada: { transform: [{ rotate: '45deg' }] },
  horas: { fontSize: 10, lineHeight: 12, fontFamily: FontFamily.medium, textAlign: 'right' },
});

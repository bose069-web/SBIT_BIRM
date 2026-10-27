import { Pressable, StyleSheet, View } from 'react-native';

import { totalHoras, type RegistroDiario } from '@/core/domain/registro-diario';
import { mesDe } from '@/core/domain/valoracion';
import { Boton } from '@/ui/components/boton';
import { Chip } from '@/ui/components/chip';
import { ThemedText } from '@/ui/components/themed-text';
import { useTheme } from '@/ui/hooks/use-theme';
import { FontFamily, Radius, Spacing, type ThemeColor } from '@/ui/theme/theme';
import {
  DIAS_SEMANA,
  estadoDia,
  semanasDelMes,
  sumarMeses,
  type EstadoDia,
} from '@/ui/utils/calendario';
import { fechaCorta, formatoHoras, nombreMes } from '@/ui/utils/fechas';

import { estilosComunes } from './comun';

// El color solo acompaña: cada día lleva también un texto corto y la leyenda lo explica.
const ESTADOS: Record<EstadoDia, { texto: string; corto: string; color: ThemeColor | null }> = {
  trabajo: { texto: 'Trabajo', corto: '', color: 'estadoValidado' },
  ausencia: { texto: 'Ausencia', corto: 'Aus.', color: 'estadoAusencia' },
  festivo: { texto: 'Festivo', corto: 'Fest.', color: 'estadoFestivo' },
  pendiente: { texto: 'Sin apuntar', corto: 'Falta', color: 'estadoPendiente' },
  futuro: { texto: 'Próximo', corto: '', color: null },
  libre: { texto: 'Fin de semana', corto: '', color: null },
  fuera: { texto: 'Fuera del periodo', corto: '', color: null },
};
const LEYENDA: EstadoDia[] = ['trabajo', 'ausencia', 'festivo', 'pendiente'];

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
  const porFecha = new Map(dias.map((d) => [d.fecha, d]));
  const horasMes = dias.reduce((s, d) => s + totalHoras(d), 0);

  return (
    <View style={styles.contenedor}>
      <View style={styles.cabecera}>
        <Boton
          texto="‹"
          variante="secundario"
          desactivado={mes <= mesDe(periodo.fechaInicio)}
          onPress={() => onCambiarMes(sumarMeses(mes, -1))}
        />
        <View style={styles.titulo}>
          <ThemedText type="smallBold" style={estilosComunes.capital}>
            {nombreMes(mes)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatoHoras(horasMes)}
            {cerrado ? ' · valorado' : ''}
          </ThemedText>
        </View>
        <Boton
          texto="›"
          variante="secundario"
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

      {semanasDelMes(mes).map((semana, i) => (
        <View key={i} style={styles.semana}>
          {semana.map((fecha, j) => {
            if (!fecha) return <View key={j} style={styles.celda} />;
            const registro = porFecha.get(fecha);
            const estado = estadoDia(fecha, registro, periodo, hoy);
            const info = ESTADOS[estado];
            const corto =
              estado === 'trabajo' && registro
                ? formatoHoras(totalHoras(registro)).replace(' ', '')
                : info.corto;
            const elegida = fecha === seleccionada;
            const esHoy = fecha === hoy;
            const delDia = agenda?.get(fecha) ?? [];
            return (
              <Pressable
                key={fecha}
                accessibilityRole="button"
                accessibilityLabel={`${fechaCorta(fecha)}: ${info.texto}${corto && estado === 'trabajo' ? `, ${corto}` : ''}${delDia.length ? `. ${delDia.join('; ')}` : ''}`}
                accessibilityState={{ disabled: estado === 'fuera', selected: elegida }}
                disabled={estado === 'fuera'}
                onPress={() => onElegir(fecha)}
                style={({ pressed }) => [
                  styles.celda,
                  styles.dia,
                  {
                    borderColor: elegida
                      ? theme.primary
                      : esHoy
                        ? theme.textSecondary
                        : 'transparent',
                    backgroundColor: elegida || pressed ? theme.subtle : 'transparent',
                    opacity: estado === 'fuera' ? 0.35 : 1,
                  },
                ]}>
                {delDia.length ? (
                  <View style={[styles.marcaAgenda, { borderColor: theme.text }]} />
                ) : null}
                <ThemedText
                  type={esHoy ? 'smallBold' : 'small'}
                  themeColor={estado === 'libre' || estado === 'futuro' ? 'textSecondary' : 'text'}>
                  {Number(fecha.slice(8))}
                </ThemedText>
                <View style={styles.estado}>
                  {info.color ? (
                    <View style={[styles.punto, { backgroundColor: theme[info.color] }]} />
                  ) : null}
                  <ThemedText
                    style={[styles.corto, { color: theme.textSecondary }]}
                    numberOfLines={1}>
                    {corto}
                  </ThemedText>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}

      <View style={estilosComunes.fila}>
        {LEYENDA.map((e) => (
          <Chip key={e} texto={ESTADOS[e].texto} color={ESTADOS[e].color ?? undefined} />
        ))}
        {agenda ? (
          <View style={styles.leyendaAgenda}>
            <View style={[styles.marcaLeyenda, { borderColor: theme.text }]} />
            <ThemedText type="small">Evento o entrega</ThemedText>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: Spacing.two },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  titulo: { flex: 1, alignItems: 'center' },
  semana: { flexDirection: 'row', gap: Spacing.one },
  diaSemana: { flex: 1, textAlign: 'center' },
  celda: { flex: 1, minHeight: 48 },
  dia: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
    borderWidth: 1,
    borderRadius: Radius.control,
    paddingVertical: Spacing.one,
  },
  estado: { flexDirection: 'row', alignItems: 'center', gap: 3, minHeight: 14 },
  punto: { width: 6, height: 6, borderRadius: 3 },
  leyendaAgenda: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  marcaLeyenda: { width: 8, height: 8, borderWidth: 1.5, transform: [{ rotate: '45deg' }] },
  // Rombo hueco arriba a la derecha: ese día hay un evento o vence una tarea.
  marcaAgenda: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderWidth: 1.5,
    transform: [{ rotate: '45deg' }],
  },
  corto: { fontSize: 10, lineHeight: 14, fontFamily: FontFamily.medium },
});

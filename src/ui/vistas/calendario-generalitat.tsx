import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { listarEventosMes } from '@/core/application/calendario';
import { TIPOS_EVENTO_RED, type TipoEvento } from '@/core/domain/evento';
import { container } from '@/config/container';
import { ChipTipoEvento, TEXTO_TIPO_EVENTO } from '@/ui/components/chip-tipo-evento';
import { Pantalla } from '@/ui/components/pantalla';
import { Tarjeta } from '@/ui/components/tarjeta';
import { ThemedText } from '@/ui/components/themed-text';
import { useDatos } from '@/ui/hooks/use-datos';
import { useRecargarAlVolver } from '@/ui/hooks/use-recargar-al-volver';
import { useTheme } from '@/ui/hooks/use-theme';
import { useWebAncha } from '@/ui/hooks/use-web-ancha';
import { Radius, Spacing, type ThemeColor } from '@/ui/theme/theme';
import { diasSemana, semanasDelMes, sumarMeses } from '@/ui/utils/calendario';
import { fechasDeLaRed, type FechaRed } from '@/ui/utils/calendario-red';
import { fechaCorta, hoyISO, nombreMes } from '@/ui/utils/fechas';

import { NuevoEvento } from './agenda';
import { ErrorCarga, EsqueletoPanel } from './comun';

// Mismo color que el chip de cada tipo, para los puntos del mes.
const COLOR_PUNTO: Record<TipoEvento, ThemeColor> = {
  evento: 'textSecondary',
  entrega: 'estadoPendiente',
  reunion: 'primary',
  festivo: 'estadoFestivo',
  plazo: 'avisoMedio',
  curso: 'estadoValidado',
};

const TODOS = 'todos';

/**
 * Calendario de la generalitat: solo lo que afecta a toda la red. Festivos, calendario del curso
 * de prácticas, plazos administrativos y los recordatorios automáticos de validación. Nunca fechas
 * de un alumno ni de un instituto concreto: con cien institutos sería ilegible.
 */
export function CalendarioGeneralitat() {
  const ancho = useWebAncha();
  const hoy = hoyISO();
  const [mes, setMes] = useState(hoy.slice(0, 7));
  const [filtro, setFiltro] = useState<TipoEvento | typeof TODOS>(TODOS);
  const { datos, error, cargando, recargar } = useDatos(
    () => listarEventosMes(container.eventos, mes),
    [mes],
  );
  useRecargarAlVolver(recargar);
  const fechas = datos ? fechasDeLaRed(datos, mes, filtro === TODOS ? undefined : [filtro]) : [];

  const calendario = (
    <Tarjeta
      titulo={nombreMes(mes)}
      accion={
        <View style={styles.navegar}>
          <Flecha texto="‹" etiqueta="Mes anterior" onPress={() => setMes(sumarMeses(mes, -1))} />
          {mes !== hoy.slice(0, 7) ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setMes(hoy.slice(0, 7))}
              hitSlop={8}>
              <ThemedText type="small" themeColor="textSecondary">
                Hoy
              </ThemedText>
            </Pressable>
          ) : null}
          <Flecha texto="›" etiqueta="Mes siguiente" onPress={() => setMes(sumarMeses(mes, 1))} />
        </View>
      }>
      <Mes mes={mes} hoy={hoy} fechas={fechas} />
      <Filtros valor={filtro} onCambio={setFiltro} />
    </Tarjeta>
  );

  const lista = (
    <Tarjeta titulo={`Fechas de ${nombreMes(mes).split(' ')[0]}`}>
      {error ? <ErrorCarga texto={error} onReintentar={recargar} /> : null}
      {cargando && !datos ? <EsqueletoPanel tarjetas={1} /> : null}
      {datos && fechas.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          No hay fechas de este tipo este mes.
        </ThemedText>
      ) : null}
      <View>
        {fechas.map((f, i) => (
          <FilaFecha key={f.id} fecha={f} primera={i === 0} />
        ))}
      </View>
    </Tarjeta>
  );

  const nueva = (
    <Tarjeta titulo="Nueva fecha para toda la red">
      <ThemedText type="small" themeColor="textSecondary">
        La ven todos los institutos, profes, empresas y alumnos en su calendario.
      </ThemedText>
      <NuevoEvento tipos={TIPOS_EVENTO_RED} tipoInicial="plazo" onCreado={recargar} />
    </Tarjeta>
  );

  return (
    <Pantalla
      titulo="Calendario"
      subtitulo="Festivos, curso de prácticas y plazos de toda la red"
      amplia={ancho}
      compacta>
      {ancho ? (
        <View style={styles.columnas}>
          <View style={styles.principal}>{calendario}</View>
          <View style={styles.lateral}>
            {lista}
            {nueva}
          </View>
        </View>
      ) : (
        <>
          {calendario}
          {lista}
          {nueva}
        </>
      )}
    </Pantalla>
  );
}

function Flecha({
  texto,
  etiqueta,
  onPress,
}: {
  texto: string;
  etiqueta: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => [styles.flecha, pressed && { opacity: 0.6 }]}>
      <ThemedText type="subtitle" themeColor="textSecondary">
        {texto}
      </ThemedText>
    </Pressable>
  );
}

/** Rejilla del mes con un punto por cada fecha de la red ese día. */
function Mes({ mes, hoy, fechas }: { mes: string; hoy: string; fechas: FechaRed[] }) {
  const theme = useTheme();
  const porDia = new Map<string, FechaRed[]>();
  for (const f of fechas) porDia.set(f.fecha, [...(porDia.get(f.fecha) ?? []), f]);
  return (
    <View style={styles.mes}>
      <View style={styles.semana}>
        {diasSemana().map((d) => (
          <ThemedText key={d} type="small" themeColor="textSecondary" style={styles.cabecera}>
            {d}
          </ThemedText>
        ))}
      </View>
      {semanasDelMes(mes).map((semana, i) => (
        <View key={i} style={styles.semana}>
          {semana.map((dia, j) => {
            if (!dia) return <View key={j} style={styles.dia} />;
            const delDia = porDia.get(dia) ?? [];
            const esHoy = dia === hoy;
            return (
              <View
                key={dia}
                style={styles.dia}
                accessible
                accessibilityLabel={`${fechaCorta(dia)}${delDia.length ? `: ${delDia.map((f) => f.titulo).join(', ')}` : ''}`}>
                <View
                  style={[
                    styles.numero,
                    esHoy && { backgroundColor: theme.primary },
                    !esHoy && delDia.length > 0 && { backgroundColor: theme.subtle },
                  ]}>
                  <ThemedText
                    type={delDia.length ? 'smallBold' : 'small'}
                    style={esHoy ? { color: theme.onPrimary } : undefined}>
                    {Number(dia.slice(8))}
                  </ThemedText>
                </View>
                <View style={styles.puntos}>
                  {delDia.slice(0, 3).map((f) => (
                    <View
                      key={f.id}
                      style={[styles.punto, { backgroundColor: theme[COLOR_PUNTO[f.tipo]] }]}
                    />
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/** Ver solo un tipo de fecha (el color solo acompaña: cada opción dice qué es). */
function Filtros({
  valor,
  onCambio,
}: {
  valor: TipoEvento | typeof TODOS;
  onCambio: (v: TipoEvento | typeof TODOS) => void;
}) {
  const theme = useTheme();
  const opciones: (TipoEvento | typeof TODOS)[] = [TODOS, ...TIPOS_EVENTO_RED];
  return (
    <View style={styles.filtros} accessibilityRole="radiogroup" accessibilityLabel="Ver">
      {opciones.map((o) => {
        const activo = o === valor;
        return (
          <Pressable
            key={o}
            accessibilityRole="radio"
            accessibilityState={{ checked: activo }}
            onPress={() => onCambio(o)}
            style={[
              styles.filtro,
              { borderColor: activo ? theme.primary : theme.border },
              activo && { backgroundColor: theme.subtle },
            ]}>
            {o !== TODOS ? (
              <View style={[styles.punto, { backgroundColor: theme[COLOR_PUNTO[o]] }]} />
            ) : null}
            <ThemedText type={activo ? 'smallBold' : 'small'}>
              {o === TODOS ? 'Todas' : TEXTO_TIPO_EVENTO[o]}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

function FilaFecha({ fecha, primera }: { fecha: FechaRed; primera: boolean }) {
  const theme = useTheme();
  return (
    <View style={[styles.fila, !primera && { borderTopWidth: 1, borderColor: theme.border }]}>
      <ThemedText type="smallBold" style={styles.fecha}>
        {fechaCorta(fecha.fecha)}
      </ThemedText>
      <View style={styles.flex}>
        <ThemedText type="small">{fecha.titulo}</ThemedText>
        <View style={styles.chips}>
          <ChipTipoEvento tipo={fecha.tipo} />
          {fecha.automatico ? (
            <ThemedText type="small" themeColor="textSecondary">
              Automático
            </ThemedText>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  columnas: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  principal: { flex: 1.4, gap: Spacing.three },
  lateral: { flex: 1, gap: Spacing.three },
  navegar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  flecha: { minWidth: 32, minHeight: 32, alignItems: 'center', justifyContent: 'center' },
  mes: { gap: Spacing.one },
  semana: { flexDirection: 'row' },
  cabecera: { flex: 1, textAlign: 'center' },
  dia: { flex: 1, alignItems: 'center', minHeight: 52, gap: 2 },
  numero: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  puntos: { flexDirection: 'row', gap: 3, height: 6 },
  punto: { width: 6, height: 6, borderRadius: 3 },
  filtros: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  filtro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    minHeight: 36,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.control,
  },
  fila: { flexDirection: 'row', gap: Spacing.three, paddingVertical: Spacing.two },
  fecha: { width: 92 },
  flex: { flex: 1, gap: Spacing.one },
  chips: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});

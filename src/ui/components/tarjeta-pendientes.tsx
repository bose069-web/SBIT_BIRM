import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Chip } from '@/ui/components/chip';
import { Correcto } from '@/ui/components/correcto';
import { Tarjeta } from '@/ui/components/tarjeta';
import { ThemedText } from '@/ui/components/themed-text';
import { usePreferenciasAvisos } from '@/ui/hooks/use-preferencias-avisos';
import { useTheme } from '@/ui/hooks/use-theme';
import { Spacing } from '@/ui/theme/theme';
import { organizarPendientes, type Pendiente } from '@/ui/utils/pendientes';

/** A partir de aquí la lista se pliega: el Inicio no debe convertirse en un listado sin fin. */
const MAXIMO_VISIBLES = 5;

interface Props {
  pendientes: Pendiente[];
  /** Explica el estado "Todo al día": qué se ha comprobado. */
  textoAlDia: string;
  /** Si algo no se ha podido comprobar, no se dice "Todo al día": se avisa con este texto. */
  sinConfirmar?: string | null;
  /** Contexto bajo el título, solo cuando hay pendientes. */
  descripcion?: string;
  /** Pendientes que se resuelven dentro de la propia tarjeta (cuentas por incorporar…). */
  extra?: ReactNode;
  onSeccion?: (seccion: 'tareas') => void;
  style?: ViewStyle;
}

/** "Qué tienes pendiente": cada aviso dice la siguiente acción y lleva a donde se hace. */
export function TarjetaPendientes({
  pendientes,
  textoAlDia,
  sinConfirmar,
  descripcion,
  extra,
  onSeccion,
  style,
}: Props) {
  const theme = useTheme();
  const [verTodos, setVerTodos] = useState(false);
  const { preferencias, cambiar } = usePreferenciasAvisos();
  const { importantes, secundarios, ocultos, haySecundarios } = organizarPendientes(
    pendientes,
    preferencias.ocultarSecundarios,
  );
  const total = importantes.length + secundarios.length;
  const hayAlgo = total > 0 || Boolean(extra);
  // Lo importante va primero: lo secundario es lo primero que se pliega.
  const visiblesImportantes = verTodos ? importantes : importantes.slice(0, MAXIMO_VISIBLES);
  const visiblesSecundarios = verTodos
    ? secundarios
    : secundarios.slice(0, Math.max(0, MAXIMO_VISIBLES - visiblesImportantes.length));

  function abrir({ destino }: Pendiente) {
    if ('seccion' in destino) onSeccion?.(destino.seccion);
    else router.push({ pathname: destino.pathname, params: destino.params });
  }

  return (
    <Tarjeta
      titulo="Qué tienes pendiente"
      style={{ ...style, ...(hayAlgo ? { borderColor: theme.primary } : null) }}>
      {hayAlgo && descripcion ? (
        <ThemedText type="small" themeColor="textSecondary">
          {descripcion}
        </ThemedText>
      ) : null}
      {!hayAlgo && !sinConfirmar && ocultos === 0 ? (
        <View style={styles.alDia}>
          <Correcto />
          <View style={styles.flex}>
            <ThemedText type="subtitle">Todo al día</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {textoAlDia}
            </ThemedText>
          </View>
        </View>
      ) : null}
      {sinConfirmar ? (
        <ThemedText type="small" themeColor="textSecondary">
          {sinConfirmar}
        </ThemedText>
      ) : null}
      {!hayAlgo && !sinConfirmar && ocultos > 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          No tienes obligaciones pendientes.
        </ThemedText>
      ) : null}
      <ListaAvisos pendientes={visiblesImportantes} onAbrir={abrir} />
      {visiblesSecundarios.length > 0 ? (
        <View style={styles.seccion}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Para tener en cuenta
          </ThemedText>
          <ListaAvisos pendientes={visiblesSecundarios} onAbrir={abrir} />
        </View>
      ) : null}
      {total > MAXIMO_VISIBLES ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: verTodos }}
          onPress={() => setVerTodos((v) => !v)}
          style={({ pressed }) => [styles.mas, pressed && styles.pulsada]}>
          <ThemedText type="small" themeColor="textSecondary">
            {verTodos ? 'Ver menos' : `Ver los ${total}`}
          </ThemedText>
        </Pressable>
      ) : null}
      {haySecundarios ? (
        <Pressable
          accessibilityRole="button"
          accessibilityHint="Se guarda en este dispositivo. Las obligaciones se ven siempre."
          onPress={() => cambiar({ ocultarSecundarios: !preferencias.ocultarSecundarios })}
          style={({ pressed }) => [styles.mas, pressed && styles.pulsada]}>
          <ThemedText type="small" themeColor="textSecondary">
            {preferencias.ocultarSecundarios
              ? `Mostrar ${ocultos === 1 ? '1 aviso secundario' : `${ocultos} avisos secundarios`}`
              : 'Ocultar avisos secundarios'}
          </ThemedText>
        </Pressable>
      ) : null}
      {extra}
    </Tarjeta>
  );
}

function ListaAvisos({
  pendientes,
  onAbrir,
}: {
  pendientes: Pendiente[];
  onAbrir: (pendiente: Pendiente) => void;
}) {
  const theme = useTheme();
  if (pendientes.length === 0) return null;
  return (
    <View>
      {pendientes.map((p, i) => (
        <Pressable
          key={p.id}
          accessibilityRole="button"
          accessibilityLabel={`${p.titulo}. ${p.detalle}.${
            p.etiqueta ? ` ${p.etiqueta}.` : ''
          } ${p.accion}`}
          onPress={() => onAbrir(p)}
          style={({ pressed }) => [
            styles.fila,
            i > 0 && { borderTopWidth: 1, borderColor: theme.border },
            pressed && styles.pulsada,
          ]}>
          <View style={styles.flex}>
            <ThemedText type="smallBold" numberOfLines={2}>
              {p.titulo}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
              {p.detalle}
            </ThemedText>
            {p.etiqueta ? <Chip texto={p.etiqueta} color="estadoPendiente" /> : null}
          </View>
          <ThemedText type="smallBold" themeColor="primary">
            {p.accion} ›
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  seccion: { gap: Spacing.one },
  alDia: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  flex: { flex: 1, gap: 2 },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 56,
    paddingVertical: Spacing.two,
  },
  mas: { minHeight: 44, justifyContent: 'center' },
  pulsada: { opacity: 0.6 },
});

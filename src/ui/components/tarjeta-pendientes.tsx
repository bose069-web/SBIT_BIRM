import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Chip } from '@/ui/components/chip';
import { Correcto } from '@/ui/components/correcto';
import { Tarjeta } from '@/ui/components/tarjeta';
import { ThemedText } from '@/ui/components/themed-text';
import { useTheme } from '@/ui/hooks/use-theme';
import { Spacing } from '@/ui/theme/theme';
import type { Pendiente } from '@/ui/utils/pendientes';

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
  const hayAlgo = pendientes.length > 0 || Boolean(extra);
  const visibles = verTodos ? pendientes : pendientes.slice(0, MAXIMO_VISIBLES);

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
      {!hayAlgo && !sinConfirmar ? (
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
      {visibles.length > 0 ? (
        <View>
          {visibles.map((p, i) => (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              accessibilityLabel={`${p.titulo}. ${p.detalle}.${
                p.etiqueta ? ` ${p.etiqueta}.` : ''
              } ${p.accion}`}
              onPress={() => abrir(p)}
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
      ) : null}
      {pendientes.length > MAXIMO_VISIBLES ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: verTodos }}
          onPress={() => setVerTodos((v) => !v)}
          style={({ pressed }) => [styles.mas, pressed && styles.pulsada]}>
          <ThemedText type="small" themeColor="textSecondary">
            {verTodos ? 'Ver menos' : `Ver los ${pendientes.length}`}
          </ThemedText>
        </Pressable>
      ) : null}
      {extra}
    </Tarjeta>
  );
}

const styles = StyleSheet.create({
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

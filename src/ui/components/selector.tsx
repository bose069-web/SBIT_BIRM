import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/ui/components/themed-text';
import { useTheme } from '@/ui/hooks/use-theme';
import { useMovimientoReducido } from '@/ui/hooks/use-movimiento-reducido';
import { fondoHoverWeb, transicionWeb, type EstadoPressable } from '@/ui/utils/interaccion-web';
import { Radius, Spacing } from '@/ui/theme/theme';

interface Opcion<T extends string> {
  valor: T;
  texto: string;
}

interface Props<T extends string> {
  etiqueta?: string;
  opciones: Opcion<T>[];
  valor: T | null;
  onCambio: (valor: T) => void;
}

/** Grupo de opciones excluyentes (como un control segmentado). */
export function Selector<T extends string>({ etiqueta, opciones, valor, onCambio }: Props<T>) {
  const theme = useTheme();
  const reducido = useMovimientoReducido();
  return (
    <View style={styles.contenedor}>
      {etiqueta ? <ThemedText type="smallBold">{etiqueta}</ThemedText> : null}
      <View accessibilityRole="radiogroup" accessibilityLabel={etiqueta} style={styles.fila}>
        {opciones.map((o) => {
          const activa = o.valor === valor;
          return (
            <Pressable
              key={o.valor}
              accessibilityRole="radio"
              accessibilityLabel={o.texto}
              accessibilityState={{ checked: activa }}
              onPress={() => onCambio(o.valor)}
              style={({ hovered }: EstadoPressable) => [
                styles.opcion,
                { borderColor: activa ? theme.primary : theme.border },
                { backgroundColor: activa ? theme.primary : theme.surface },
                transicionWeb(reducido),
                fondoHoverWeb(hovered, activa ? theme.primaryHover : theme.subtle),
              ]}>
              <ThemedText type="small" style={{ color: activa ? theme.onPrimary : theme.text }}>
                {o.texto}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: Spacing.one },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  opcion: {
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
  },
});

import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Campo } from '@/ui/components/campo';
import { ThemedText } from '@/ui/components/themed-text';
import { useMovimientoReducido } from '@/ui/hooks/use-movimiento-reducido';
import { useTheme } from '@/ui/hooks/use-theme';
import { fondoHoverWeb, transicionWeb, type EstadoPressable } from '@/ui/utils/interaccion-web';
import { Radius, Spacing } from '@/ui/theme/theme';

export interface OpcionBuscador {
  valor: string;
  texto: string;
  /** Lo que distingue dos opciones con el mismo nombre (correo, fecha del convenio…). */
  detalle?: string;
}

interface Props {
  etiqueta: string;
  opciones: OpcionBuscador[];
  valor: string | null;
  onCambio: (valor: string) => void;
  placeholder?: string;
  /** Sin poder cambiar la elección (por ejemplo, el alumno al editar un dossier). */
  fijo?: boolean;
}

const MAXIMO = 6;

/** Sin mayúsculas ni acentos: «lopez» encuentra «López». */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Campo para escribir un nombre y elegirlo de la lista que aparece debajo. Cada opción enseña su
 * detalle, así dos personas que se llaman igual no se confunden.
 */
export function Buscador({ etiqueta, opciones, valor, onCambio, placeholder, fijo }: Props) {
  const theme = useTheme();
  const reducido = useMovimientoReducido();
  const [texto, setTexto] = useState('');
  const elegida = opciones.find((o) => o.valor === valor) ?? null;

  if (elegida) {
    return (
      <View style={styles.contenedor}>
        <ThemedText type="smallBold">{etiqueta}</ThemedText>
        <View
          style={[styles.elegida, { borderColor: theme.primary, backgroundColor: theme.surface }]}>
          <View style={styles.textos}>
            <ThemedText>{elegida.texto}</ThemedText>
            {elegida.detalle ? (
              <ThemedText type="small" themeColor="textSecondary">
                {elegida.detalle}
              </ThemedText>
            ) : null}
          </View>
          {fijo ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Cambiar ${etiqueta.toLowerCase()}`}
              onPress={() => {
                setTexto('');
                onCambio('');
              }}
              style={({ hovered }: EstadoPressable) => [
                styles.cambiar,
                transicionWeb(reducido),
                fondoHoverWeb(hovered, theme.subtle),
              ]}>
              <ThemedText type="small" themeColor="primary">
                Cambiar
              </ThemedText>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  const busqueda = normalizar(texto.trim());
  const encontradas = busqueda
    ? opciones.filter((o) => normalizar(`${o.texto} ${o.detalle ?? ''}`).includes(busqueda))
    : opciones;

  return (
    <View style={styles.contenedor}>
      <Campo
        etiqueta={etiqueta}
        value={texto}
        onChangeText={setTexto}
        placeholder={placeholder ?? 'Escribe para buscar'}
        autoCorrect={false}
        autoCapitalize="none"
      />
      <View
        accessibilityRole="list"
        style={[styles.lista, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        {encontradas.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.vacia}>
            Nadie coincide con «{texto.trim()}».
          </ThemedText>
        ) : null}
        {encontradas.slice(0, MAXIMO).map((o, i) => (
          <Pressable
            key={o.valor}
            accessibilityRole="button"
            accessibilityLabel={o.detalle ? `${o.texto}, ${o.detalle}` : o.texto}
            onPress={() => onCambio(o.valor)}
            style={({ hovered }: EstadoPressable) => [
              styles.fila,
              i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.border },
              transicionWeb(reducido),
              fondoHoverWeb(hovered, theme.subtle),
            ]}>
            <ThemedText>{o.texto}</ThemedText>
            {o.detalle ? (
              <ThemedText type="small" themeColor="textSecondary">
                {o.detalle}
              </ThemedText>
            ) : null}
          </Pressable>
        ))}
        {encontradas.length > MAXIMO ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.vacia}>
            {encontradas.length - MAXIMO} más: escribe para afinar.
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: Spacing.one },
  lista: { borderWidth: 1, borderRadius: Radius.button, overflow: 'hidden' },
  fila: { minHeight: 44, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  vacia: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  elegida: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 52,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.one,
    borderWidth: 1.5,
    borderRadius: Radius.button,
  },
  textos: { flex: 1, paddingVertical: Spacing.two },
  cambiar: {
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
    borderRadius: Radius.control,
  },
});

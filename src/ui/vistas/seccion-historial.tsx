import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { consultarHistorial } from '@/core/application/historial';
import type { Dossier } from '@/core/domain/dossier';
import { container } from '@/config/container';
import { Boton } from '@/ui/components/boton';
import { Tarjeta } from '@/ui/components/tarjeta';
import { ThemedText } from '@/ui/components/themed-text';
import { useDatos } from '@/ui/hooks/use-datos';
import { useUsuario } from '@/ui/hooks/use-sesion';
import { useTheme } from '@/ui/hooks/use-theme';
import { Spacing } from '@/ui/theme/theme';
import { autorEntrada, cuandoEntrada, textoEntrada } from '@/ui/utils/historial';

const VISIBLES = 5;

/** Carga por su cuenta: si el historial falla, el resto de la ficha sigue en pie. */
export function SeccionHistorial({ dossier }: { dossier: Dossier }) {
  const usuario = useUsuario();
  const theme = useTheme();
  const [verTodo, setVerTodo] = useState(false);
  const { datos, error, cargando, recargar } = useDatos(
    () => consultarHistorial(container.historial, usuario, dossier),
    [dossier.id, usuario.id],
  );

  return (
    <Tarjeta titulo="Historial">
      {error ? (
        <>
          <ThemedText type="small" themeColor="textSecondary">
            No se ha podido cargar el historial.
          </ThemedText>
          <Boton texto="Reintentar" variante="secundario" onPress={recargar} />
        </>
      ) : null}
      {!datos && !error && cargando ? (
        <ThemedText type="small" themeColor="textSecondary">
          Cargando el historial…
        </ThemedText>
      ) : null}
      {datos && !datos.disponible ? (
        <ThemedText type="small" themeColor="textSecondary">
          Historial no disponible todavía
        </ThemedText>
      ) : null}
      {datos?.disponible && datos.entradas.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Todavía no hay cambios anotados. Se anotan a partir de ahora, no los anteriores.
        </ThemedText>
      ) : null}
      {datos?.disponible
        ? (verTodo ? datos.entradas : datos.entradas.slice(0, VISIBLES)).map((entrada) => (
            <View
              key={entrada.id}
              accessible
              style={[styles.fila, { borderBottomColor: theme.border }]}>
              <ThemedText type="smallBold">{textoEntrada(entrada)}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {autorEntrada(entrada, dossier, usuario.id)} · {cuandoEntrada(entrada.ocurridoEn)}
              </ThemedText>
            </View>
          ))
        : null}
      {datos?.disponible && datos.entradas.length > VISIBLES ? (
        <Boton
          texto={verTodo ? 'Ver menos' : `Ver los ${datos.entradas.length}`}
          variante="secundario"
          onPress={() => setVerTodo((v) => !v)}
        />
      ) : null}
    </Tarjeta>
  );
}

const styles = StyleSheet.create({
  fila: {
    gap: Spacing.half,
    paddingBottom: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});

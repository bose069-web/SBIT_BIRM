import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, View } from 'react-native';

import type {
  ResultadoFinal,
  ValoracionFinal,
  ValoracionMensual,
  ValoracionMes,
} from '@/core/domain/valoracion';
import { Boton } from '@/ui/components/boton';
import { Chip } from '@/ui/components/chip';
import { Mensaje } from '@/ui/components/mensaje';
import { Tarjeta } from '@/ui/components/tarjeta';
import { ThemedText } from '@/ui/components/themed-text';
import { useTheme } from '@/ui/hooks/use-theme';
import type { ThemeColor } from '@/ui/theme/theme';
import { Radius, Spacing } from '@/ui/theme/theme';
import { nombreMes } from '@/ui/utils/fechas';

export const TEXTO_VALORACION: Record<ValoracionMes, string> = {
  positiva: 'Positiva',
  mejorable: 'Mejorable',
  negativa: 'Negativa',
};
export const COLOR_VALORACION: Record<ValoracionMes, ThemeColor> = {
  positiva: 'estadoValidado',
  mejorable: 'estadoPendiente',
  negativa: 'danger',
};
export const TEXTO_RESULTADO: Record<ResultadoFinal, string> = { apto: 'Apto', no_apto: 'No apto' };

/** Historial de valoraciones mensuales y final de un dossier. */
export function ListaValoraciones({
  mensuales,
  final,
}: {
  mensuales: ValoracionMensual[];
  final: ValoracionFinal | null;
}) {
  const theme = useTheme();
  if (mensuales.length === 0 && !final) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        Todavía no hay valoraciones.
      </ThemedText>
    );
  }
  return (
    <View style={styles.lista}>
      {final ? (
        <View style={[styles.fila, { borderBottomColor: theme.border }]}>
          <ThemedText type="smallBold">Valoración final</ThemedText>
          <Chip
            texto={TEXTO_RESULTADO[final.resultado]}
            color={final.resultado === 'apto' ? 'estadoValidado' : 'danger'}
          />
          {final.comentario ? <ThemedText type="small">{final.comentario}</ThemedText> : null}
        </View>
      ) : null}
      {[...mensuales].reverse().map((v) => (
        <View key={v.id} style={[styles.fila, { borderBottomColor: theme.border }]}>
          <ThemedText type="smallBold" style={styles.capital}>
            {nombreMes(v.mes)}
          </ThemedText>
          <Chip texto={TEXTO_VALORACION[v.valoracion]} color={COLOR_VALORACION[v.valoracion]} />
          {v.comentario ? (
            <ThemedText type="small" themeColor="textSecondary">
              {v.comentario}
            </ThemedText>
          ) : null}
        </View>
      ))}
    </View>
  );
}

/** Carga dentro de una tarjeta o de una parte de la pantalla. */
export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.cargando} accessibilityRole="progressbar" accessibilityLabel={texto}>
      <ActivityIndicator color={theme.textSecondary} />
      <ThemedText type="small" themeColor="textSecondary">
        {texto}
      </ThemedText>
    </View>
  );
}

/** Mientras carga una pantalla entera: tarjetas grises con la forma de lo que va a aparecer. */
export function EsqueletoPanel({ tarjetas = 2 }: { tarjetas?: number }) {
  const theme = useTheme();
  // useState (no useRef) para crear el valor una sola vez sin leer refs al pintar.
  const [opacidad] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const latido = Animated.loop(
      Animated.sequence([
        Animated.timing(opacidad, { toValue: 0.5, duration: 700, useNativeDriver: true }),
        Animated.timing(opacidad, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    latido.start();
    return () => latido.stop();
  }, [opacidad]);

  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Cargando" style={styles.esqueleto}>
      {Array.from({ length: tarjetas }, (_, i) => (
        <Animated.View
          key={i}
          style={[
            styles.tarjetaEsqueleto,
            { opacity: opacidad, backgroundColor: theme.surface, borderColor: theme.border },
          ]}>
          {['35%', '70%', '55%'].map((ancho) => (
            <View
              key={ancho}
              style={[
                styles.barra,
                { width: ancho as `${number}%`, backgroundColor: theme.subtle },
              ]}
            />
          ))}
        </Animated.View>
      ))}
    </View>
  );
}

/** Pantalla o tarjeta sin nada que mostrar todavía: dice por qué y qué pasará. */
export function EstadoVacio({
  titulo,
  texto,
  accion,
}: {
  titulo: string;
  texto: string;
  accion?: { texto: string; onPress: () => void };
}) {
  return (
    <Tarjeta>
      <ThemedText type="smallBold">{titulo}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {texto}
      </ThemedText>
      {accion ? (
        <Boton texto={accion.texto} variante="secundario" onPress={accion.onPress} />
      ) : null}
    </Tarjeta>
  );
}

/** Error al cargar, con botón para volver a intentarlo. */
export function ErrorCarga({ texto, onReintentar }: { texto: string; onReintentar: () => void }) {
  return (
    <View style={styles.error}>
      <Mensaje tipo="error" texto={`No se ha podido cargar: ${texto}`} />
      <Boton texto="Reintentar" variante="secundario" onPress={onReintentar} />
    </View>
  );
}

export const estilosComunes = StyleSheet.create({
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, alignItems: 'center' },
  capital: { textTransform: 'capitalize' },
});

const styles = StyleSheet.create({
  cargando: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  esqueleto: { gap: Spacing.three },
  tarjetaEsqueleto: {
    borderWidth: 1,
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  barra: { height: 14, borderRadius: 7 },
  error: { gap: Spacing.two },
  lista: { gap: Spacing.two },
  fila: {
    gap: Spacing.one,
    paddingBottom: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  capital: { textTransform: 'capitalize' },
});

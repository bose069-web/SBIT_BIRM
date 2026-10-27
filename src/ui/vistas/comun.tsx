import { StyleSheet, View } from 'react-native';

import type {
  ResultadoFinal,
  ValoracionFinal,
  ValoracionMensual,
  ValoracionMes,
} from '@/core/domain/valoracion';
import { Chip } from '@/ui/components/chip';
import { ThemedText } from '@/ui/components/themed-text';
import { useTheme } from '@/ui/hooks/use-theme';
import type { ThemeColor } from '@/ui/theme/theme';
import { Spacing } from '@/ui/theme/theme';
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

export function Cargando() {
  return <ThemedText themeColor="textSecondary">Cargando…</ThemedText>;
}

export const estilosComunes = StyleSheet.create({
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, alignItems: 'center' },
  capital: { textTransform: 'capitalize' },
});

const styles = StyleSheet.create({
  lista: { gap: Spacing.two },
  fila: {
    gap: Spacing.one,
    paddingBottom: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  capital: { textTransform: 'capitalize' },
});

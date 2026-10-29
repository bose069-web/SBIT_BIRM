import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';

import { ThemedText } from '@/ui/components/themed-text';
import { useAnimar } from '@/ui/hooks/use-animar';
import { useTheme } from '@/ui/hooks/use-theme';
import { FontFamily, Movimiento, Radius, Spacing } from '@/ui/theme/theme';
import { DIAS_SEMANA, semanasDelMes, sumarMeses } from '@/ui/utils/calendario';
import { fechaCorta, hoyISO, nombreMes } from '@/ui/utils/fechas';

interface Props {
  etiqueta: string;
  /** `AAAA-MM-DD` o vacío si no hay día elegido. */
  valor: string;
  onCambio: (fecha: string) => void;
  /** Permite dejarlo sin día (fechas opcionales). */
  opcional?: boolean;
}

/** Campo de fecha que despliega un calendario del mes al tocarlo, en vez de escribir la fecha. */
export function SelectorFecha({ etiqueta, valor, onCambio, opcional }: Props) {
  const theme = useTheme();
  const animar = useAnimar();
  const hoy = hoyISO();
  const [abierto, setAbierto] = useState(false);
  const [mes, setMes] = useState((valor || hoy).slice(0, 7));

  function elegir(fecha: string) {
    onCambio(fecha);
    setAbierto(false);
  }

  return (
    <View style={styles.contenedor}>
      <ThemedText type="smallBold">{etiqueta}</ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${etiqueta}: ${valor ? fechaCorta(valor) : 'sin elegir'}`}
        accessibilityHint={
          abierto ? 'Cierra el calendario' : 'Abre un calendario para elegir el día'
        }
        accessibilityState={{ expanded: abierto }}
        onPress={() => setAbierto(!abierto)}
        style={[
          styles.campo,
          {
            borderColor: abierto ? theme.primary : theme.borderStrong,
            backgroundColor: theme.surface,
          },
        ]}>
        <ThemedText themeColor={valor ? 'text' : 'textSecondary'}>
          {valor ? fechaCorta(valor) : 'Elegir día'}
        </ThemedText>
        <ThemedText themeColor="textSecondary">{abierto ? '▴' : '▾'}</ThemedText>
      </Pressable>

      {abierto ? (
        <Animated.View
          entering={!animar ? undefined : FadeInUp.duration(Movimiento.normal)}
          exiting={!animar ? undefined : FadeOutUp.duration(Movimiento.rapido)}
          style={[
            styles.desplegable,
            { borderColor: theme.border, backgroundColor: theme.surface },
          ]}>
          <View style={styles.cabecera}>
            <BotonFlecha
              texto="‹"
              etiqueta="Mes anterior"
              onPress={() => setMes(sumarMeses(mes, -1))}
            />
            <ThemedText type="smallBold" style={styles.mes}>
              {nombreMes(mes).replace(/^./, (l) => l.toUpperCase())}
            </ThemedText>
            <BotonFlecha
              texto="›"
              etiqueta="Mes siguiente"
              onPress={() => setMes(sumarMeses(mes, 1))}
            />
          </View>
          <View style={styles.semana}>
            {DIAS_SEMANA.map((d) => (
              <ThemedText key={d} type="small" themeColor="textSecondary" style={styles.letra}>
                {d}
              </ThemedText>
            ))}
          </View>
          {semanasDelMes(mes).map((semana, i) => (
            <View key={i} style={styles.semana}>
              {semana.map((fecha, j) => {
                if (!fecha) return <View key={j} style={styles.hueco} />;
                const elegido = fecha === valor;
                const esHoy = fecha === hoy;
                return (
                  <Pressable
                    key={fecha}
                    accessibilityRole="button"
                    accessibilityLabel={`${fechaCorta(fecha)}${esHoy ? ', hoy' : ''}`}
                    accessibilityState={{ selected: elegido }}
                    onPress={() => elegir(fecha)}
                    style={({ pressed }) => [
                      styles.dia,
                      {
                        backgroundColor: elegido
                          ? theme.primary
                          : pressed
                            ? theme.subtle
                            : 'transparent',
                        borderColor: esHoy && !elegido ? theme.primary : 'transparent',
                      },
                    ]}>
                    <ThemedText
                      style={[styles.numero, { color: elegido ? theme.onPrimary : theme.text }]}>
                      {Number(fecha.slice(8))}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          ))}
          <View style={styles.pie}>
            <BotonTexto texto="Hoy" onPress={() => elegir(hoy)} />
            {opcional && valor ? <BotonTexto texto="Sin fecha" onPress={() => elegir('')} /> : null}
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

function BotonFlecha({
  texto,
  etiqueta,
  onPress,
}: {
  texto: string;
  etiqueta: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      onPress={onPress}
      style={({ pressed }) => [
        styles.flecha,
        { backgroundColor: pressed ? theme.border : theme.subtle },
      ]}>
      <ThemedText type="smallBold">{texto}</ThemedText>
    </Pressable>
  );
}

function BotonTexto({ texto, onPress }: { texto: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.botonTexto}>
      <ThemedText type="smallBold" themeColor="primary">
        {texto}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: Spacing.two },
  campo: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  desplegable: {
    borderWidth: 1,
    borderRadius: Radius.card,
    padding: Spacing.two,
    gap: Spacing.one,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.one,
  },
  mes: { flex: 1, textAlign: 'center' },
  flecha: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  semana: { flexDirection: 'row', gap: Spacing.one },
  letra: { flex: 1, textAlign: 'center' },
  dia: {
    flex: 1,
    height: 44,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hueco: { flex: 1, height: 44 },
  numero: { fontSize: 15, lineHeight: 20, fontFamily: FontFamily.medium },
  pie: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.two },
  botonTexto: { minHeight: 44, paddingHorizontal: Spacing.three, justifyContent: 'center' },
});

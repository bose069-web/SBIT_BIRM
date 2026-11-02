import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/ui/components/themed-text';
import { useTheme } from '@/ui/hooks/use-theme';
import { Radius, Spacing } from '@/ui/theme/theme';
import { fechaCorta, limitesMes, nombreMes } from '@/ui/utils/fechas';
import { pasosDelMes, type PasoMes } from '@/ui/utils/progreso';

const PASOS = [
  { clave: 'alumno', texto: 'Apuntas' },
  { clave: 'empresa', texto: 'Valida la empresa' },
  { clave: 'profe', texto: 'Confirma el tutor' },
] as const;

const NOMBRE_PASO: Record<PasoMes, string> = {
  hecho: 'hecho',
  actual: 'en curso',
  pendiente: 'pendiente',
};

/** En qué punto está la validación del mes: alumno → empresa → tutor. */
export function EstadoMes({
  hoy,
  mesesValidados,
  enTarjeta,
}: {
  hoy: string;
  mesesValidados: string[];
  /** Dentro de una tarjeta va sin caja propia (sin doble borde). */
  enTarjeta?: boolean;
}) {
  const theme = useTheme();
  const mes = hoy.slice(0, 7);
  const pasos = pasosDelMes(mes, mesesValidados);
  const cierre = limitesMes(hoy)[1];
  const color = (p: PasoMes) =>
    p === 'hecho' ? theme.estadoValidado : p === 'actual' ? theme.primary : theme.borderStrong;

  return (
    <View
      accessibilityLabel={`${nombreMes(mes)}: ${PASOS.map((p) => `${p.texto}, ${NOMBRE_PASO[pasos[p.clave]]}`).join('; ')}`}
      style={
        enTarjeta
          ? styles.suelto
          : [styles.caja, { backgroundColor: theme.surface, borderColor: theme.border }]
      }>
      <ThemedText type="small" themeColor="textSecondary">
        {nombreMes(mes).charAt(0).toUpperCase() + nombreMes(mes).slice(1)} · se valida al acabar el
        mes ({fechaCorta(cierre)})
      </ThemedText>
      <View style={styles.pasos}>
        {PASOS.map((p, i) => {
          const estado = pasos[p.clave];
          return (
            <Fragment key={p.clave}>
              {i > 0 ? <View style={[styles.linea, { backgroundColor: theme.border }]} /> : null}
              <View style={styles.paso}>
                <View
                  style={[
                    styles.marca,
                    estado === 'pendiente'
                      ? { borderColor: color(estado), borderWidth: 1.5 }
                      : { backgroundColor: color(estado) },
                  ]}
                />
                <ThemedText
                  type={estado === 'actual' ? 'smallBold' : 'small'}
                  themeColor={estado === 'pendiente' ? 'textSecondary' : 'text'}>
                  {p.texto}
                </ThemedText>
              </View>
            </Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  caja: {
    borderWidth: 1,
    borderRadius: Radius.card,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  suelto: { gap: Spacing.two },
  pasos: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.two },
  paso: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  marca: { width: 10, height: 10, borderRadius: 5 },
  linea: { width: 20, height: 1 },
});

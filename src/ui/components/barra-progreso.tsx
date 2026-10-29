import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/ui/hooks/use-theme';
import { Radius } from '@/ui/theme/theme';

export function BarraProgreso({
  porcentaje,
  marca,
  etiqueta = 'Progreso',
}: {
  porcentaje: number;
  /** Dónde debería ir el progreso (por ejemplo, las horas que tocan por calendario). */
  marca?: number;
  etiqueta?: string;
}) {
  const theme = useTheme();
  const valor = Math.max(0, Math.min(100, porcentaje));
  const puntoMarca = marca === undefined ? null : Math.max(0, Math.min(100, marca));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={etiqueta}
      accessibilityValue={{ min: 0, max: 100, now: valor }}
      style={[styles.pista, { backgroundColor: theme.subtle }]}>
      <View style={[styles.relleno, { width: `${valor}%`, backgroundColor: theme.primary }]} />
      {puntoMarca === null ? null : (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.marca, { left: `${puntoMarca}%`, backgroundColor: theme.borderStrong }]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pista: { height: 8, borderRadius: Radius.pill, overflow: 'hidden' },
  relleno: { height: '100%', borderRadius: Radius.pill },
  marca: { position: 'absolute', top: 0, bottom: 0, width: 2, marginLeft: -1 },
});

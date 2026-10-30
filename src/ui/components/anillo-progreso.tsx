import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { ThemedText } from '@/ui/components/themed-text';
import { useTheme } from '@/ui/hooks/use-theme';

const GROSOR = 8;

/**
 * Progreso en anillo con el porcentaje en el centro. `marca` señala dónde debería ir (por ejemplo,
 * las horas que tocan por calendario).
 */
export function AnilloProgreso({
  porcentaje,
  marca,
  etiqueta,
  tamano = 88,
}: {
  porcentaje: number;
  marca?: number;
  etiqueta: string;
  tamano?: number;
}) {
  const theme = useTheme();
  const valor = Math.max(0, Math.min(100, porcentaje));
  const centro = tamano / 2;
  const radio = centro - GROSOR / 2;
  const perimetro = 2 * Math.PI * radio;
  const angulo =
    marca === undefined ? null : (Math.min(100, Math.max(0, marca)) / 100) * 2 * Math.PI;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={etiqueta}
      accessibilityValue={{ min: 0, max: 100, now: valor }}
      style={{ width: tamano, height: tamano }}>
      <Svg width={tamano} height={tamano}>
        <Circle
          cx={centro}
          cy={centro}
          r={radio}
          stroke={theme.subtle}
          strokeWidth={GROSOR}
          fill="none"
        />
        {valor > 0 ? (
          <Circle
            cx={centro}
            cy={centro}
            r={radio}
            stroke={theme.primary}
            strokeWidth={GROSOR}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${(valor / 100) * perimetro} ${perimetro}`}
            // El trazo de un círculo empieza a las 3: se gira para que salga de las 12.
            transform={`rotate(-90 ${centro} ${centro})`}
          />
        ) : null}
        {angulo === null ? null : (
          <Line
            x1={centro + (radio - GROSOR / 2 - 2) * Math.sin(angulo)}
            y1={centro - (radio - GROSOR / 2 - 2) * Math.cos(angulo)}
            x2={centro + (radio + GROSOR / 2) * Math.sin(angulo)}
            y2={centro - (radio + GROSOR / 2) * Math.cos(angulo)}
            stroke={theme.text}
            strokeWidth={2}
          />
        )}
      </Svg>
      <View style={styles.centro}>
        <ThemedText type="smallBold">{Math.round(valor)}%</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centro: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

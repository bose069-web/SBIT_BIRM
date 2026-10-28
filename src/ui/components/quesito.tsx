import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useAnimar } from '@/ui/hooks/use-animar';
import { useTheme } from '@/ui/hooks/use-theme';
import { Movimiento } from '@/ui/theme/theme';

/** Porción de círculo desde las 12 en punto, en sentido horario. */
function porcion(r: number, fraccion: number): string {
  const angulo = fraccion * 2 * Math.PI;
  const x = r + r * Math.sin(angulo);
  const y = r - r * Math.cos(angulo);
  return `M${r} ${r} L${r} 0 A${r} ${r} 0 ${fraccion > 0.5 ? 1 : 0} 1 ${x} ${y} Z`;
}

/** Quesito que se va llenando con el porcentaje (horas hechas de las totales). */
export function Quesito({
  porcentaje,
  tamano = 112,
  etiqueta = 'Progreso',
}: {
  porcentaje: number;
  tamano?: number;
  etiqueta?: string;
}) {
  const theme = useTheme();
  const animar = useAnimar();
  const valor = Math.max(0, Math.min(100, porcentaje));
  // Al aparecer, el quesito se llena desde cero.
  const [animado, setAnimado] = useState(0);
  useEffect(() => {
    if (!animar) return;
    const inicio = Date.now();
    let id = 0;
    const paso = () => {
      const t = Math.min(1, (Date.now() - inicio) / (Movimiento.entrada * 2));
      setAnimado(valor * (1 - (1 - t) ** 3));
      if (t < 1) id = requestAnimationFrame(paso);
    };
    id = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(id);
  }, [valor, animar]);

  const mostrado = animar ? animado : valor;
  const r = tamano / 2;
  const fraccion = mostrado / 100;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={etiqueta}
      accessibilityValue={{ min: 0, max: 100, now: valor }}
      style={{ width: tamano, height: tamano }}>
      <Svg width={tamano} height={tamano}>
        <Circle cx={r} cy={r} r={r} fill={theme.subtle} />
        {fraccion >= 0.999 ? (
          <Circle cx={r} cy={r} r={r} fill={theme.primary} />
        ) : fraccion > 0 ? (
          <Path d={porcion(r, fraccion)} fill={theme.primary} />
        ) : null}
      </Svg>
    </View>
  );
}

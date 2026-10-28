import { router, useLocalSearchParams } from 'expo-router';

import { Pantalla } from '@/ui/components/pantalla';
import { Tarjeta } from '@/ui/components/tarjeta';
import { ThemedText } from '@/ui/components/themed-text';

import { BandejaIncidencias, DetalleIncidencia } from './incidencias';

/**
 * Pestaña Chat. De momento, las incidencias con su conversación; el chat por alumno (alumno,
 * profe, tutor de empresa e instituto) llega cuando PC 2 y PC 3 lo tengan.
 */
export function VistaChat() {
  const { incidencia } = useLocalSearchParams<{ incidencia?: string }>();
  if (incidencia) {
    return (
      <DetalleIncidencia
        key={incidencia}
        id={incidencia}
        onVolver={() => router.replace('/chat')}
      />
    );
  }
  return (
    <Pantalla titulo="Chat" subtitulo="Incidencias y conversaciones">
      <BandejaIncidencias />
      <Tarjeta titulo="Chat por alumno">
        <ThemedText type="small" themeColor="textSecondary">
          Muy pronto: un chat por cada alumno en prácticas con su profe, el tutor de empresa y el
          instituto.
        </ThemedText>
      </Tarjeta>
    </Pantalla>
  );
}

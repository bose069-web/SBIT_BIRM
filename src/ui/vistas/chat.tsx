import { router, useLocalSearchParams } from 'expo-router';

import { Pantalla } from '@/ui/components/pantalla';
import { Tarjeta } from '@/ui/components/tarjeta';
import { ThemedText } from '@/ui/components/themed-text';
import { useUsuario } from '@/ui/hooks/use-sesion';

import { ChatEmpresa } from './chat-empresa';
import { BandejaIncidencias, DetalleIncidencia } from './incidencias';

/**
 * Pestaña Chat. La empresa habla aquí con sus alumnos y con sus profes; los demás roles siguen
 * viendo las incidencias con su conversación.
 */
export function VistaChat() {
  const usuario = useUsuario();
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
  if (usuario.rol === 'empresa') return <ChatEmpresa />;
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

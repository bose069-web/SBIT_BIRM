import { useLocalSearchParams } from 'expo-router';

import { VistaChat } from '@/ui/vistas/chat';

export default function ChatScreen() {
  // La clave reinicia la vista cuando se entra a un hilo concreto desde la bandeja de Inicio.
  const { conversacion } = useLocalSearchParams<{ conversacion?: string }>();
  return <VistaChat key={conversacion ?? 'chat'} />;
}

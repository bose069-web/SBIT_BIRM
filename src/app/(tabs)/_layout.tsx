import AppTabs from '@/ui/components/app-tabs';
import { useChat } from '@/ui/estado/chat-empresa';
import { useUsuario } from '@/ui/hooks/use-sesion';
import { textoContador, totalNoLeidos } from '@/ui/utils/chat';

/** Las pestañas de cada rol. Registrar y Centro se abren encima, desde la pila de la raíz. */
export default function PestanasLayout() {
  const usuario = useUsuario();
  const { mensajes, leidoHasta } = useChat(usuario);
  const contadorChat = textoContador(totalNoLeidos(mensajes, leidoHasta, usuario.id));
  return <AppTabs rol={usuario.rol} contadorChat={contadorChat} />;
}

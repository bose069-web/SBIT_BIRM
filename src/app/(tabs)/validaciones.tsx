import { useUsuario } from '@/ui/hooks/use-sesion';
import { VistaCalendario } from '@/ui/vistas/calendario';
import { VistaValidaciones } from '@/ui/vistas/validaciones';

// La pestaña Validaciones es la de la empresa (donde antes tenía el Calendario). Si otro rol
// llega a esta ruta, ve el calendario de siempre.
export default function ValidacionesScreen() {
  const { rol } = useUsuario();
  return rol === 'empresa' ? <VistaValidaciones /> : <VistaCalendario />;
}

import { useUsuario } from '@/ui/hooks/use-sesion';
import { VistaCalendario } from '@/ui/vistas/calendario';
import { SeguimientoProfe } from '@/ui/vistas/seguimiento-profe';

// El profe no lleva calendario propio: en esta pestaña tiene el seguimiento de su clase.
export default function CalendarioScreen() {
  const { rol } = useUsuario();
  if (rol === 'profe') return <SeguimientoProfe />;
  return <VistaCalendario />;
}

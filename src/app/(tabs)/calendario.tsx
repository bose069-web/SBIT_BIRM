import { useUsuario } from '@/ui/hooks/use-sesion';
import { VistaCalendario } from '@/ui/vistas/calendario';
import { CalendarioGeneralitat } from '@/ui/vistas/calendario-generalitat';
import { SeguimientoProfe } from '@/ui/vistas/seguimiento-profe';

// El profe no lleva calendario propio: en esta pestaña tiene el seguimiento de su clase.
export default function CalendarioScreen() {
  const { rol } = useUsuario();
  if (rol === 'profe') return <SeguimientoProfe />;
  // La generalitat solo ve las fechas de toda la red.
  if (rol === 'generalitat') return <CalendarioGeneralitat />;
  return <VistaCalendario />;
}

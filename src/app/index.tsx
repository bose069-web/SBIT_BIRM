import { useUsuario } from '@/ui/hooks/use-sesion';
import { PanelAlumno } from '@/ui/vistas/panel-alumno';
import { PanelEmpresa } from '@/ui/vistas/panel-empresa';
import { PanelProfe } from '@/ui/vistas/panel-profe';

// Inicio distinto según el rol: el alumno ve sus horas, la empresa valora y el profe hace el
// seguimiento. El admin usa el mismo panel que el profe, pero ve todos los dossiers.
export default function InicioScreen() {
  const { rol } = useUsuario();
  if (rol === 'empresa') return <PanelEmpresa />;
  if (rol === 'profe' || rol === 'admin') return <PanelProfe />;
  return <PanelAlumno />;
}

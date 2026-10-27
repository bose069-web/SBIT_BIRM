import { haceSeguimiento } from '@/core/domain/usuario';
import { useUsuario } from '@/ui/hooks/use-sesion';
import { PanelAlumno } from '@/ui/vistas/panel-alumno';
import { PanelEmpresa } from '@/ui/vistas/panel-empresa';
import { PanelProfe } from '@/ui/vistas/panel-profe';

// Inicio distinto según el rol: el alumno ve sus horas, la empresa valora y profe, instituto y
// generalitat hacen el seguimiento (cada uno de los dossiers que le deja ver la base).
export default function InicioScreen() {
  const { rol } = useUsuario();
  if (rol === 'empresa') return <PanelEmpresa />;
  if (haceSeguimiento(rol)) return <PanelProfe />;
  return <PanelAlumno />;
}

import { router, useLocalSearchParams } from 'expo-router';

import { haceSeguimiento } from '@/core/domain/usuario';
import { useUsuario } from '@/ui/hooks/use-sesion';
import { FichaDossier } from '@/ui/vistas/ficha-dossier';
import { PanelAlumno } from '@/ui/vistas/panel-alumno';
import { PanelEmpresa } from '@/ui/vistas/panel-empresa';
import { PanelProfe } from '@/ui/vistas/panel-profe';

// Inicio distinto según el rol: el alumno ve sus horas, la empresa valora y profe, instituto y
// generalitat hacen el seguimiento (cada uno de los dossiers que le deja ver la base).
// Con ?dossier=<id> se ve la ficha de ese dossier dentro de la misma pestaña (así no hace
// falta una ruta nueva en la barra de pestañas).
export default function InicioScreen() {
  const { rol } = useUsuario();
  const { dossier } = useLocalSearchParams<{ dossier?: string }>();
  if (dossier)
    return <FichaDossier key={dossier} dossierId={dossier} onVolver={() => router.replace('/')} />;
  if (rol === 'empresa') return <PanelEmpresa />;
  if (haceSeguimiento(rol)) return <PanelProfe />;
  return <PanelAlumno />;
}

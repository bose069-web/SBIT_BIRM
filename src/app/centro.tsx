import { Redirect } from 'expo-router';

import { useUsuario } from '@/ui/hooks/use-sesion';
import { PanelInstituto } from '@/ui/vistas/panel-instituto';

export default function CentroScreen() {
  const { rol } = useUsuario();
  // El instituto gestiona el suyo; la generalitat, el que elija.
  if (rol !== 'instituto' && rol !== 'generalitat') return <Redirect href="/" />;
  return <PanelInstituto />;
}

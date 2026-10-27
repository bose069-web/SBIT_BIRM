import { Redirect } from 'expo-router';

import { useUsuario } from '@/ui/hooks/use-sesion';
import { PanelInstituto } from '@/ui/vistas/panel-instituto';

export default function CentroScreen() {
  const { rol } = useUsuario();
  if (rol !== 'instituto') return <Redirect href="/" />;
  return <PanelInstituto />;
}

import { Redirect } from 'expo-router';

import { useUsuario } from '@/ui/hooks/use-sesion';
import { VistaRegistroDia } from '@/ui/vistas/registro-dia';

export default function RegistroScreen() {
  const { rol } = useUsuario();
  if (rol !== 'alumno') return <Redirect href="/" />;
  return <VistaRegistroDia />;
}

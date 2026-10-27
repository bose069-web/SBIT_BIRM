import { Redirect, useLocalSearchParams } from 'expo-router';

import { useUsuario } from '@/ui/hooks/use-sesion';
import { VistaRegistroDia } from '@/ui/vistas/registro-dia';

export default function RegistroScreen() {
  const { rol } = useUsuario();
  // Desde el calendario se abre un día concreto: /registro?fecha=2026-10-27
  const { fecha } = useLocalSearchParams<{ fecha?: string }>();
  if (rol !== 'alumno') return <Redirect href="/" />;
  const valida = fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : undefined;
  // La clave hace que, al llegar con otra fecha, la vista empiece en ese día.
  return <VistaRegistroDia key={valida ?? 'hoy'} fechaInicial={valida} />;
}

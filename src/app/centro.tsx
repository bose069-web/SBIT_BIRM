import { Redirect, useLocalSearchParams } from 'expo-router';

import { useUsuario } from '@/ui/hooks/use-sesion';
import { ConveniosCentro } from '@/ui/vistas/convenios-centro';

export default function CentroScreen() {
  const { rol } = useUsuario();
  const { centro } = useLocalSearchParams<{ centro?: string }>();
  // El instituto gestiona el suyo; la generalitat, el que eligió en Inicio.
  if (rol !== 'instituto' && rol !== 'generalitat') return <Redirect href="/" />;
  return <ConveniosCentro centroPedido={centro ?? null} />;
}

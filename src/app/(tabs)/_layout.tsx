import AppTabs from '@/ui/components/app-tabs';
import { useUsuario } from '@/ui/hooks/use-sesion';

/** Las pestañas de cada rol. Registrar y Centro se abren encima, desde la pila de la raíz. */
export default function PestanasLayout() {
  const { rol } = useUsuario();
  return <AppTabs rol={rol} />;
}

import { router, useLocalSearchParams } from 'expo-router';

import { haceSeguimiento } from '@/core/domain/usuario';
import { useUsuario } from '@/ui/hooks/use-sesion';
import { FichaDossier } from '@/ui/vistas/ficha-dossier';
import { FormularioDossier } from '@/ui/vistas/formulario-dossier';
import { PanelAlumno } from '@/ui/vistas/panel-alumno';
import { PanelEmpresa } from '@/ui/vistas/panel-empresa';
import { PanelInstituto } from '@/ui/vistas/panel-instituto';
import { PanelProfe } from '@/ui/vistas/panel-profe';
import { SeguimientoProfe } from '@/ui/vistas/seguimiento-profe';

// Inicio distinto según el rol: el alumno ve sus horas, la empresa valora, el profe ve lo que
// tiene pendiente (mensajes, horas por validar y quién no apunta), el instituto gestiona su
// centro y la generalitat hace el seguimiento de todos los dossiers.
// Las subpartes de Inicio van en la URL (`?dossier=`, `?editar=`, `?nuevo=`, `?valorar=`): así la
// pestaña Inicio lleva siempre a la pantalla principal aunque ya estés dentro.
export default function InicioScreen() {
  const { rol } = useUsuario();
  const { dossier, editar, nuevo, valorar, mes } = useLocalSearchParams<{
    dossier?: string;
    editar?: string;
    nuevo?: string;
    valorar?: string;
    mes?: string;
  }>();
  // Al terminar el formulario se vuelve a la ficha del dossier guardado (o a Inicio).
  const alTerminar = (id: string | null) =>
    router.replace(id ? { pathname: '/', params: { dossier: id } } : '/');
  if (nuevo) return <FormularioDossier onTerminar={alTerminar} />;
  if (editar) return <FormularioDossier key={editar} dossierId={editar} onTerminar={alTerminar} />;
  if (dossier)
    return <FichaDossier key={dossier} dossierId={dossier} onVolver={() => router.replace('/')} />;
  // La clave hace que el panel se vuelva a cargar al entrar y salir de la valoración.
  if (rol === 'empresa')
    return <PanelEmpresa key={valorar ?? 'inicio'} validar={valorar ?? null} mes={mes ?? null} />;
  if (rol === 'profe') return <PanelProfe />;
  if (rol === 'instituto') return <PanelInstituto />;
  if (haceSeguimiento(rol)) return <SeguimientoProfe />;
  return <PanelAlumno />;
}

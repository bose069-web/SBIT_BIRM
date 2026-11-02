import { Redirect, router, useLocalSearchParams } from 'expo-router';

import { useUsuario } from '@/ui/hooks/use-sesion';
import { FichaDossier } from '@/ui/vistas/ficha-dossier';
import { FormularioDossier } from '@/ui/vistas/formulario-dossier';
import { GestionAlumnos } from '@/ui/vistas/gestion-alumnos';

// Vuelve a la pantalla anterior o, si se entró directo por la URL, a la lista de alumnos.
function volver() {
  if (router.canGoBack()) router.back();
  else router.replace('/alumnos');
}

/** Segundo nivel del panel del centro. Ficha y formulario quedan en la misma pila, y se vuelve aquí. */
export default function AlumnosScreen() {
  const { rol } = useUsuario();
  const { centro, dossier, editar, nuevo } = useLocalSearchParams<{
    centro?: string;
    dossier?: string;
    editar?: string;
    nuevo?: string;
  }>();
  if (rol !== 'instituto' && rol !== 'generalitat') return <Redirect href="/" />;
  if (nuevo) return <FormularioDossier onTerminar={volver} />;
  if (editar) return <FormularioDossier key={editar} dossierId={editar} onTerminar={volver} />;
  if (dossier)
    return (
      <FichaDossier
        key={dossier}
        dossierId={dossier}
        onVolver={volver}
        onEditar={() => router.push({ pathname: '/alumnos', params: { editar: dossier } })}
      />
    );
  return <GestionAlumnos centroPedido={centro ?? null} />;
}

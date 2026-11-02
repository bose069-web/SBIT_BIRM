import { useEffect, useState } from 'react';

import { container } from '@/config/container';
import {
  PREFERENCIAS_AVISOS_INICIALES,
  type PreferenciasAvisos,
} from '@/core/domain/preferencias-avisos';
import { useUsuario } from '@/ui/hooks/use-sesion';

/** Lo que se ve cambia al momento; si no se puede guardar, solo dura hasta cerrar la app. */
export function usePreferenciasAvisos() {
  const usuario = useUsuario();
  const [preferencias, setPreferencias] = useState(PREFERENCIAS_AVISOS_INICIALES);

  useEffect(() => {
    let vigente = true;
    container.preferencias
      .leerAvisos(usuario.id)
      .then((leidas) => vigente && setPreferencias(leidas))
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [usuario.id]);

  function cambiar(nuevas: PreferenciasAvisos) {
    setPreferencias(nuevas);
    container.preferencias.guardarAvisos(usuario.id, nuevas).catch(() => undefined);
  }

  return { preferencias, cambiar };
}

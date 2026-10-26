import { useEffect, useState } from 'react';

import { obtenerUsuarioActual } from '@/core/application/auth';
import type { Usuario } from '@/core/domain/usuario';
import { container } from '@/config/container';

export function useUsuarioActual() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    obtenerUsuarioActual(container.auth)
      .then(setUsuario)
      .finally(() => setCargando(false));
  }, []);

  return { usuario, cargando };
}

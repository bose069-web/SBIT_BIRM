import { useState } from 'react';

import { listarCentros, obtenerPanelCentro } from '@/core/application/centro';
import { container } from '@/config/container';
import { useDatos } from '@/ui/hooks/use-datos';
import { useRecargarAlVolver } from '@/ui/hooks/use-recargar-al-volver';
import { useUsuario } from '@/ui/hooks/use-sesion';

export type AvisoCentro = { tipo: 'error' | 'ok'; texto: string } | null;
export type HacerEnCentro = (accion: () => Promise<unknown>, ok: string) => Promise<void>;

/**
 * Datos del centro que se gestiona. El instituto siempre gestiona el suyo; la generalitat elige
 * entre todos (`centroPedido` llega en la URL de las pantallas secundarias).
 */
export function usePanelCentro(centroPedido: string | null = null) {
  const usuario = useUsuario();
  const esGeneralitat = usuario.rol === 'generalitat';
  const [elegido, setElegido] = useState<string | null>(centroPedido);
  const [aviso, setAviso] = useState<AvisoCentro>(null);
  const centros = useDatos(
    async () => (esGeneralitat ? listarCentros(container.centros) : []),
    [esGeneralitat],
  );
  const centroId = esGeneralitat ? (elegido ?? centros.datos?.[0]?.id ?? null) : usuario.centroId;
  const panel = useDatos(
    async () => (centroId ? obtenerPanelCentro(container.centros, usuario, centroId) : null),
    [centroId, usuario.id],
  );
  useRecargarAlVolver(panel.recargar);

  // Ejecuta una acción, muestra el resultado y recarga el panel.
  const hacer: HacerEnCentro = async (accion, ok) => {
    setAviso(null);
    try {
      await accion();
      setAviso({ tipo: 'ok', texto: ok });
      panel.recargar();
    } catch (e) {
      setAviso({ tipo: 'error', texto: e instanceof Error ? e.message : String(e) });
    }
  };

  return {
    esGeneralitat,
    centros,
    centroId,
    elegirCentro: (id: string) => {
      setAviso(null);
      setElegido(id);
    },
    ...panel,
    aviso,
    hacer,
  };
}

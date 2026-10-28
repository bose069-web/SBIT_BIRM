import type { TipoEvento } from '@/core/domain/evento';

import { Chip } from '@/ui/components/chip';
import type { ThemeColor } from '@/ui/theme/theme';

/** Texto de cada tipo de fecha; el color solo acompaña, nunca sustituye al texto. */
export const TEXTO_TIPO_EVENTO: Record<TipoEvento, string> = {
  evento: 'Evento',
  entrega: 'Entrega',
  reunion: 'Reunión',
  festivo: 'Festivo',
};

const COLOR_TIPO_EVENTO: Record<TipoEvento, ThemeColor> = {
  evento: 'textSecondary',
  entrega: 'estadoPendiente',
  reunion: 'primary',
  festivo: 'estadoFestivo',
};

interface Props {
  tipo: TipoEvento;
  /** Marca las fechas que son para todo el mundo, no de un dossier. */
  general?: boolean;
}

/** Chip del tipo de una fecha del calendario: evento, entrega, reunión o festivo. */
export function ChipTipoEvento({ tipo, general }: Props) {
  return (
    <Chip
      texto={`${TEXTO_TIPO_EVENTO[tipo]}${general ? ' · general' : ''}`}
      color={COLOR_TIPO_EVENTO[tipo]}
    />
  );
}

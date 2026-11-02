import type { Idioma } from '@/core/domain/perfil';

/** Cada idioma escrito en su propio idioma, para que se reconozca aunque no entiendas el otro. */
export const OPCIONES_IDIOMA: { valor: Idioma; texto: string }[] = [
  { valor: 'es', texto: 'Castellano' },
  { valor: 'ca', texto: 'Català' },
];

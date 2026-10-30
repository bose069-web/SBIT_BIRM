/** Solo se pueden ocultar los avisos secundarios: las obligaciones se ven siempre. */
export interface PreferenciasAvisos {
  ocultarSecundarios: boolean;
}

export const PREFERENCIAS_AVISOS_INICIALES: PreferenciasAvisos = { ocultarSecundarios: false };

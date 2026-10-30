export type TonoEstado = 'trabajo' | 'ausencia' | 'festivo' | 'pendiente';

export interface EstadoRegistro {
  texto: string;
  tono: TonoEstado;
}

/** Dónde está lo apuntado este día: solo se afirma lo que ha pasado de verdad. */
export function estadoEnvio(dia: {
  hayBorrador: boolean;
  pendienteEnvio: boolean;
  enServidor: boolean;
}): EstadoRegistro | null {
  if (dia.pendienteEnvio) return { texto: 'Pendiente de enviar', tono: 'ausencia' };
  if (dia.hayBorrador) return { texto: 'Borrador en este dispositivo', tono: 'pendiente' };
  if (dia.enServidor) return { texto: 'Guardado en el servidor', tono: 'trabajo' };
  return null;
}

export function estadoMes(mes: { cerrado: boolean; enServidor: boolean }): EstadoRegistro | null {
  if (mes.cerrado) return { texto: 'Mes validado', tono: 'trabajo' };
  if (mes.enServidor) return { texto: 'Mes pendiente de validación', tono: 'festivo' };
  return null;
}

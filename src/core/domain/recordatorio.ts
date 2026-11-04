import { DatosInvalidosError } from './errores';

/** Hora local a la que el alumno quiere que le recuerden apuntar el día. */
export interface HoraRecordatorio {
  hora: number;
  minuto: number;
}

export const HORA_RECORDATORIO_INICIAL: HoraRecordatorio = { hora: 18, minuto: 0 };

export const TEXTO_RECORDATORIO = {
  titulo: '¿Has apuntado hoy?',
  cuerpo: 'Registra tus horas de prácticas antes de que se te olvide.',
};

export function comprobarHoraRecordatorio({ hora, minuto }: HoraRecordatorio): HoraRecordatorio {
  if (
    !Number.isInteger(hora) ||
    hora < 0 ||
    hora > 23 ||
    !Number.isInteger(minuto) ||
    minuto < 0 ||
    minuto > 59
  )
    throw new DatosInvalidosError('Hora del recordatorio no válida');
  return { hora, minuto };
}

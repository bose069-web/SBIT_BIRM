import type { Dossier } from '@/core/domain/dossier';
import type { EntradaHistorial } from '@/core/domain/historial';
import type { Rol } from '@/core/domain/usuario';

import { fechaCorta, horaCorta, nombreMes } from './fechas';

const NOMBRE_ROL: Record<Rol, string> = {
  alumno: 'Alumno',
  empresa: 'Tutor de empresa',
  profe: 'Profe',
  instituto: 'Instituto',
  generalitat: 'Generalitat',
};

const VERBO: Record<EntradaHistorial['accion'], string> = {
  crear: 'creado',
  editar: 'editado',
  borrar: 'borrado',
};

const VERBO_FEMENINO: Record<EntradaHistorial['accion'], string> = {
  crear: 'puesta',
  editar: 'cambiada',
  borrar: 'quitada',
};

const TEXTO_VALORACION: Record<string, string> = {
  positiva: 'positiva',
  mejorable: 'mejorable',
  negativa: 'negativa',
  apto: 'apto',
  no_apto: 'no apto',
};

/** Qué ha pasado, en una frase. */
export function textoEntrada({ entidad, accion, detalle }: EntradaHistorial): string {
  switch (entidad) {
    case 'dossier':
      return `Dossier ${VERBO[accion]}`;
    case 'registro':
      return `Día ${detalle.fecha ? fechaCorta(detalle.fecha) : ''} ${VERBO[accion]}`.replace(
        '  ',
        ' ',
      );
    case 'valoracion_mensual': {
      const mes = detalle.mes ? ` de ${nombreMes(detalle.mes)}` : '';
      const valor = detalle.valoracion ? `: ${TEXTO_VALORACION[detalle.valoracion]}` : '';
      return `Valoración${mes} ${VERBO_FEMENINO[accion]}${valor}`;
    }
    case 'valoracion_final': {
      const valor = detalle.resultado ? `: ${TEXTO_VALORACION[detalle.resultado]}` : '';
      return `Valoración final ${VERBO_FEMENINO[accion]}${valor}`;
    }
  }
}

/** Quién lo ha hecho, con los nombres que el dossier ya enseña; si no, solo su papel. */
export function autorEntrada(
  { actorId, actorRol }: Pick<EntradaHistorial, 'actorId' | 'actorRol'>,
  dossier: Pick<
    Dossier,
    | 'alumnoId'
    | 'alumnoNombre'
    | 'tutorId'
    | 'tutorNombre'
    | 'tutorEmpresaId'
    | 'tutorEmpresaNombre'
  >,
  usuarioId: string,
): string {
  if (!actorId) return 'Sistema';
  if (actorId === usuarioId) return 'Tú';
  if (actorId === dossier.alumnoId) return dossier.alumnoNombre;
  if (actorId === dossier.tutorId && dossier.tutorNombre) return dossier.tutorNombre;
  if (actorId === dossier.tutorEmpresaId && dossier.tutorEmpresaNombre) {
    return dossier.tutorEmpresaNombre;
  }
  return actorRol ? NOMBRE_ROL[actorRol] : 'Otra persona';
}

/** Fecha y hora en la zona del dispositivo: el instante guardado va en UTC. */
export function cuandoEntrada(ocurridoEn: string): string {
  const d = new Date(ocurridoEn);
  const dia = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `${fechaCorta(dia)}, ${horaCorta(ocurridoEn)}`;
}

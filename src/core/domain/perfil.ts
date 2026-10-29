import { DatosInvalidosError } from './errores';
import type { Rol } from './usuario';

// Datos personales que cada usuario gestiona desde su perfil. Nada sensible (DNI, NUSS,
// salud): solo contacto, preferencias y lo propio de cada rol. Rol, centro y empresa no se
// tocan desde aquí.

export const IDIOMAS = ['es', 'ca'] as const;
export type Idioma = (typeof IDIOMAS)[number];

export interface DatosPersonales {
  telefono: string | null;
  idioma: Idioma;
  notificaciones: boolean;
  // Alumno
  emergenciaNombre: string | null;
  emergenciaTelefono: string | null;
  // Profe
  departamento: string | null;
  horarioTutoria: string | null;
  // Empresa e instituto
  cargo: string | null;
  // Empresa
  telefonoTrabajo: string | null;
  centroTrabajo: string | null;
}

export const DATOS_PERSONALES_VACIOS: DatosPersonales = {
  telefono: null,
  idioma: 'es',
  notificaciones: true,
  emergenciaNombre: null,
  emergenciaTelefono: null,
  departamento: null,
  horarioTutoria: null,
  cargo: null,
  telefonoTrabajo: null,
  centroTrabajo: null,
};

type CampoTexto = Exclude<
  {
    [K in keyof DatosPersonales]: DatosPersonales[K] extends string | null ? K : never;
  }[keyof DatosPersonales],
  'idioma'
>;

/** Campos de texto propios de cada rol (los comunes los tienen todos). */
export const CAMPOS_ROL: Record<Rol, readonly CampoTexto[]> = {
  alumno: ['emergenciaNombre', 'emergenciaTelefono'],
  profe: ['departamento', 'horarioTutoria'],
  empresa: ['cargo', 'telefonoTrabajo', 'centroTrabajo'],
  instituto: ['cargo'],
  generalitat: [],
};

const CAMPOS_TEXTO: readonly CampoTexto[] = [
  'telefono',
  ...new Set(Object.values(CAMPOS_ROL).flat()),
];
const TELEFONOS: readonly CampoTexto[] = ['telefono', 'emergenciaTelefono', 'telefonoTrabajo'];
const MAXIMO_TEXTO = 120;

/** Dígitos, espacios y un + inicial; entre 9 y 15 cifras. */
export function telefonoValido(telefono: string): boolean {
  if (!/^\+?[\d\s]+$/.test(telefono)) return false;
  const cifras = telefono.replace(/\D/g, '').length;
  return cifras >= 9 && cifras <= 15;
}

/** Recorta textos, vacía los que no son de su rol y comprueba teléfonos y longitudes. */
export function limpiarDatosPersonales(datos: DatosPersonales, rol: Rol): DatosPersonales {
  const propios = new Set<CampoTexto>(['telefono', ...CAMPOS_ROL[rol]]);
  const limpio: DatosPersonales = { ...datos };
  for (const campo of CAMPOS_TEXTO) {
    limpio[campo] = propios.has(campo) ? datos[campo]?.trim() || null : null;
  }
  if (!(IDIOMAS as readonly string[]).includes(limpio.idioma)) {
    throw new DatosInvalidosError('Idioma no válido');
  }
  for (const campo of TELEFONOS) {
    const valor = limpio[campo];
    if (valor && !telefonoValido(valor)) throw new DatosInvalidosError('Teléfono no válido');
  }
  for (const campo of propios) {
    if ((limpio[campo]?.length ?? 0) > MAXIMO_TEXTO) {
      throw new DatosInvalidosError(`Máximo ${MAXIMO_TEXTO} caracteres por campo`);
    }
  }
  return limpio;
}

/** El nombre del alumno lo gestionan su tutor y su instituto: así nadie suplanta a otro. */
export function puedeCambiarSuNombre(rol: Rol): boolean {
  return rol !== 'alumno';
}

export function comprobarNombre(nombre: string): string {
  const limpio = nombre.trim().replace(/\s+/g, ' ');
  if (limpio.length < 2) throw new DatosInvalidosError('Escribe tu nombre y apellidos');
  if (limpio.length > 80) throw new DatosInvalidosError('Nombre demasiado largo');
  return limpio;
}

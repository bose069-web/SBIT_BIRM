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

/**
 * Teléfono español: 9 cifras que empiezan por 6, 7, 8 o 9, con +34 (o 0034) delante si se quiere.
 * Se admiten espacios, puntos y guiones al escribirlo; se devuelven solo las 9 cifras, o `null`
 * si no es válido.
 */
export function normalizarTelefono(telefono: string): string | null {
  const cifras = telefono.trim().replace(/[\s.-]/g, '');
  const sinPrefijo = cifras.replace(/^(\+34|0034)/, '');
  return /^[6-9]\d{8}$/.test(sinPrefijo) ? sinPrefijo : null;
}

export function telefonoValido(telefono: string): boolean {
  return normalizarTelefono(telefono) !== null;
}

/** `600123456` → `600 123 456`; lo que no son 9 cifras se deja tal cual. */
export function formatoTelefono(telefono: string): string {
  return /^\d{9}$/.test(telefono)
    ? telefono.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')
    : telefono;
}

/** Recorta textos, vacía los que no son de su rol y comprueba teléfonos y longitudes. */
export function limpiarDatosPersonales(
  datos: DatosPersonales,
  rol: Rol,
  exigirTelefono = true,
): DatosPersonales {
  const propios = new Set<CampoTexto>(['telefono', ...CAMPOS_ROL[rol]]);
  const limpio: DatosPersonales = { ...datos };
  for (const campo of CAMPOS_TEXTO) {
    limpio[campo] = propios.has(campo) ? datos[campo]?.trim() || null : null;
  }
  if (!(IDIOMAS as readonly string[]).includes(limpio.idioma)) {
    throw new DatosInvalidosError('Idioma no válido');
  }
  if (exigirTelefono && !limpio.telefono)
    throw new DatosInvalidosError('El teléfono es obligatorio');
  for (const campo of TELEFONOS) {
    const valor = limpio[campo];
    if (!valor) continue;
    const normalizado = normalizarTelefono(valor);
    if (!normalizado) {
      throw new DatosInvalidosError(
        'Teléfono no válido: 9 cifras que empiecen por 6, 7, 8 o 9 (el +34 es opcional)',
      );
    }
    limpio[campo] = normalizado;
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

/**
 * El tutor de empresa es una cuenta propia, fuera del centro: su correo de acceso lo gestiona él
 * mismo. Los demás dependen de su centro (o de su instituto y su profe, el alumno).
 */
export function puedeCambiarSuEmail(rol: Rol): boolean {
  return rol === 'empresa';
}

/** Resultado de pedir un correo nuevo: si hay que confirmarlo desde el buzón, queda pendiente. */
export type ResultadoCambioEmail = 'cambiado' | 'pendiente';

/** Correo de acceso: minúsculas y con forma de correo. */
export function comprobarEmail(email: string): string {
  const limpio = email.trim().toLowerCase();
  if (limpio.length < 5 || limpio.length > 120) {
    throw new DatosInvalidosError('Escribe un correo válido');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(limpio)) {
    throw new DatosInvalidosError('Escribe un correo válido');
  }
  return limpio;
}

/** Mínimo común a la contraseña inicial y a la que elige el usuario. */
export function comprobarContrasena(contrasena: string): string {
  if (contrasena.length < 8) {
    throw new DatosInvalidosError('La contraseña debe tener al menos 8 caracteres');
  }
  return contrasena;
}

export function comprobarNombre(nombre: string): string {
  const limpio = nombre.trim().replace(/\s+/g, ' ');
  if (limpio.length < 2) throw new DatosInvalidosError('Escribe tu nombre y apellidos');
  if (limpio.length > 80) throw new DatosInvalidosError('Nombre demasiado largo');
  return limpio;
}

// Identidad del alumno: la pone su instituto o su tutor y el alumno solo la consulta. Si ve un
// error, se lo comunica a su tutor. Va aparte de los datos personales y la empresa no la ve.
export interface Identidad {
  dni: string | null;
}

/** Deja ver las dos primeras cifras y la letra: 12****78Z. */
export function enmascararDni(dni: string): string {
  const limpio = dni.replace(/[\s-]/g, '').toUpperCase();
  if (limpio.length < 5) return '*'.repeat(limpio.length);
  return limpio.slice(0, 2) + '*'.repeat(limpio.length - 5) + limpio.slice(-3);
}

export type NivelContrasena = 0 | 1 | 2 | 3;

// Orientativo para la barra visual: las reglas que obligan son las de `comprobarContrasena`.
const CONTRASENAS_TIPICAS = ['kampus', 'contrasena', 'password', '12345678', 'qwerty', 'abc123'];

/** 0 poco segura, 1 aceptable, 2 bien, 3 muy segura. */
export function nivelContrasena(contrasena: string): NivelContrasena {
  const minusculas = contrasena.toLowerCase();
  if (contrasena.length < 8 || CONTRASENAS_TIPICAS.some((c) => minusculas.includes(c))) return 0;
  const variedad = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) =>
    r.test(contrasena),
  ).length;
  const puntos = variedad + (contrasena.length >= 12 ? 1 : 0) + (contrasena.length >= 16 ? 1 : 0);
  if (puntos >= 5) return 3;
  if (puntos >= 4) return 2;
  if (puntos >= 2) return 1;
  return 0;
}

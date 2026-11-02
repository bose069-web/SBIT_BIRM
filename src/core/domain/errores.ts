export class CredencialesInvalidasError extends Error {
  constructor() {
    super('Email o contraseña incorrectos');
    this.name = 'CredencialesInvalidasError';
  }
}

export class RegistroInvalidoError extends Error {
  constructor(motivo: string) {
    super(motivo);
    this.name = 'RegistroInvalidoError';
  }
}

export class ValoracionInvalidaError extends Error {
  constructor(motivo: string) {
    super(motivo);
    this.name = 'ValoracionInvalidaError';
  }
}

export class ValoracionYaExisteError extends Error {
  constructor() {
    super('Este mes ya está valorado');
    this.name = 'ValoracionYaExisteError';
  }
}

export class HistorialNoDisponibleError extends Error {
  constructor() {
    super('El historial todavía no está disponible');
    this.name = 'HistorialNoDisponibleError';
  }
}

export class SinPermisoError extends Error {
  constructor(accion: string) {
    super(`No tienes permiso para ${accion}`);
    this.name = 'SinPermisoError';
  }
}

export class DatosInvalidosError extends Error {
  constructor(motivo: string) {
    super(motivo);
    this.name = 'DatosInvalidosError';
  }
}

/** Credenciales correctas, pero la cuenta sigue sin confirmar en el servidor. */
export class CuentaSinConfirmarError extends Error {
  constructor() {
    super('Tu cuenta aún no está confirmada. Revisa tu correo o avisa a tu centro.');
    this.name = 'CuentaSinConfirmarError';
  }
}

export class CorreoYaRegistradoError extends Error {
  constructor() {
    super('Ya existe una cuenta con ese correo. Si no tiene centro, está en Cuentas nuevas.');
    this.name = 'CorreoYaRegistradoError';
  }
}

export class SinConexionError extends Error {
  constructor() {
    super('Sin conexión con el servidor');
    this.name = 'SinConexionError';
  }
}

/** Mensajes de fetch en Chrome, Firefox, Safari, React Native y Node, también vía supabase-js. */
const PATRON_FALLO_RED =
  /failed to fetch|fetch failed|network request failed|networkerror|load failed|network error|err_internet|err_network|timed? ?out/i;

/** Si un error significa que no se ha llegado al servidor (no que el servidor lo haya rechazado). */
export function esFalloDeRed(error: unknown): boolean {
  if (error instanceof SinConexionError) return true;
  const mensaje = error instanceof Error ? error.message : String(error);
  return PATRON_FALLO_RED.test(mensaje);
}

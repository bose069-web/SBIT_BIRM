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

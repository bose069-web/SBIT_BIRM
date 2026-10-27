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

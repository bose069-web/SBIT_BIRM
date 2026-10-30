import type { Centro, Convenio, Empresa, Persona } from '../domain/centro';

export interface GestionCentroPort {
  listarCentros(): Promise<Centro[]>;
  crearCentro(datos: { nombre: string; codigo: string }): Promise<Centro>;
  obtenerCentro(centroId: string): Promise<Centro | null>;
  /** Alumnos, profes e institutos del centro, más las cuentas nuevas sin centro. */
  listarPersonas(centroId: string): Promise<Persona[]>;
  /** Mete una cuenta nueva en el centro como alumno. */
  incorporarAlumno(personaId: string, centroId: string): Promise<void>;
  /**
   * Crea la cuenta de un alumno y lo mete en el centro, sin tocar la sesión de quien lo hace.
   * Lanza `CorreoYaRegistradoError` si el correo ya tiene cuenta y `AltaSinIncorporarError` si la
   * cuenta se crea pero no entra en el centro.
   */
  crearAlumno(
    datos: { nombre: string; email: string; contrasena: string },
    centroId: string,
  ): Promise<Persona>;
  /** `profeId` null deja al alumno sin profe. */
  asignarProfe(alumnoId: string, profeId: string | null): Promise<void>;
  listarEmpresas(): Promise<Empresa[]>;
  /** Tutores (rol empresa) que trabajan en esa empresa. */
  listarTutoresEmpresa(empresaId: string): Promise<Persona[]>;
  crearEmpresa(nombre: string, cif: string | null): Promise<Empresa>;
  listarConvenios(centroId: string): Promise<Convenio[]>;
  crearConvenio(centroId: string, empresaId: string, firmadoEn: string | null): Promise<void>;
  eliminarConvenio(centroId: string, empresaId: string): Promise<void>;
}

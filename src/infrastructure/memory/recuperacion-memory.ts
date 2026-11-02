import { EnlaceCaducadoError } from '@/core/domain/errores';
import type { CredencialRecuperacion, SolicitudContrasena } from '@/core/domain/recuperacion';
import type { RecuperacionPort } from '@/core/ports/recuperacion-port';

import type { CuentasMemory } from './cuentas-memory';

interface Pendiente extends SolicitudContrasena {
  alumnoId: string;
}

export class RecuperacionMemory implements RecuperacionPort {
  #pendientes: Pendiente[] = [];
  #tokens = new Map<string, string>();

  constructor(private readonly cuentas: CuentasMemory) {}

  async pedir(email: string) {
    const cuenta = this.cuentas.buscar(email);
    if (cuenta?.rol !== 'alumno' || this.#pendientes.some((p) => p.alumnoId === cuenta.id)) return;
    this.#pendientes.push({
      id: crypto.randomUUID(),
      alumnoId: cuenta.id,
      alumnoNombre: cuenta.nombre,
      alumnoEmail: cuenta.email,
      creadaEn: new Date().toISOString(),
    });
  }

  async listarPendientes(): Promise<SolicitudContrasena[]> {
    return this.#pendientes;
  }

  async generarToken(solicitudId: string) {
    const solicitud = this.#pendientes.find((p) => p.id === solicitudId);
    if (!solicitud) throw new Error('Esta solicitud ya está atendida');
    this.#pendientes = this.#pendientes.filter((p) => p !== solicitud);
    const token = crypto.randomUUID();
    this.#tokens.set(token, solicitud.alumnoId);
    return token;
  }

  async restablecer(credencial: CredencialRecuperacion, contrasena: string) {
    const alumnoId = 'token' in credencial ? this.#tokens.get(credencial.token) : undefined;
    if (!alumnoId || !('token' in credencial)) throw new EnlaceCaducadoError();
    this.cuentas.cambiarContrasena(alumnoId, contrasena);
    this.#tokens.delete(credencial.token);
  }
}

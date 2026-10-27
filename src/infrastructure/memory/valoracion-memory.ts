import type {
  BorradorValoracionFinal,
  BorradorValoracionMensual,
  ValoracionFinal,
  ValoracionMensual,
} from '@/core/domain/valoracion';
import type { AuthPort } from '@/core/ports/auth-port';
import type { ValoracionPort } from '@/core/ports/valoracion-port';

// Ejemplo: la empresa ya ha valorado septiembre del dossier de prueba.
const VALORACIONES_DEMO: ValoracionMensual[] = [
  {
    id: 'valoracion-demo',
    dossierId: 'dossier-demo',
    mes: '2026-09',
    valoracion: 'positiva',
    comentario: 'Buen inicio, se adapta rápido al equipo.',
    valoradaPor: '3',
    valoradaEn: '2026-10-01T09:00:00.000Z',
  },
];

export class ValoracionMemory implements ValoracionPort {
  private mensuales = [...VALORACIONES_DEMO];
  private finales = new Map<string, ValoracionFinal>();
  private siguienteId = 1;

  /** Necesita la sesión para saber quién valora, como hace Supabase. */
  constructor(private readonly auth: AuthPort) {}

  private async quienValora(): Promise<string> {
    const usuario = await this.auth.usuarioActual();
    if (!usuario) throw new Error('No hay sesión iniciada');
    return usuario.id;
  }

  async listarMensuales(dossierId: string) {
    return this.mensuales
      .filter((v) => v.dossierId === dossierId)
      .sort((a, b) => a.mes.localeCompare(b.mes));
  }

  async guardarMensual(b: BorradorValoracionMensual) {
    const existente = this.mensuales.find((v) => v.dossierId === b.dossierId && v.mes === b.mes);
    const valoracion: ValoracionMensual = {
      ...b,
      id: existente?.id ?? `valoracion-${this.siguienteId++}`,
      valoradaPor: await this.quienValora(),
      valoradaEn: new Date().toISOString(),
    };
    this.mensuales = [...this.mensuales.filter((v) => v.id !== valoracion.id), valoracion];
    return valoracion;
  }

  async obtenerFinal(dossierId: string) {
    return this.finales.get(dossierId) ?? null;
  }

  async guardarFinal(b: BorradorValoracionFinal) {
    const valoracion: ValoracionFinal = {
      ...b,
      valoradaPor: await this.quienValora(),
      valoradaEn: new Date().toISOString(),
    };
    this.finales.set(b.dossierId, valoracion);
    return valoracion;
  }
}

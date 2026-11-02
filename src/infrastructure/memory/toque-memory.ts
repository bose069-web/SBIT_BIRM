import { ToqueYaExisteError } from '@/core/domain/errores';
import { estaPendiente, type Toque } from '@/core/domain/toque';
import type { AuthPort } from '@/core/ports/auth-port';
import type { ToquePort } from '@/core/ports/toque-port';

import { DOSSIERS_DEMO, IDS_DEMO } from './datos-demo';

/** Un toque pendiente para el alumno y otro ya resuelto, para ver los dos estados. */
const TOQUES_DEMO: Toque[] = [
  {
    id: 'toque-demo-1',
    dossierId: IDS_DEMO.dossier,
    dadoPor: IDS_DEMO.profe,
    diasSinApuntar: 3,
    fecha: '2026-10-27',
    creadoEn: '2026-10-27T07:30:00.000Z',
    vistoEn: null,
    resueltoEn: null,
  },
  {
    id: 'toque-demo-2',
    dossierId: 'cccccccc-0000-0000-0000-000000000002',
    dadoPor: IDS_DEMO.profe,
    diasSinApuntar: 4,
    fecha: '2026-10-21',
    creadoEn: '2026-10-21T15:10:00.000Z',
    vistoEn: '2026-10-21T18:00:00.000Z',
    resueltoEn: '2026-10-22T06:40:00.000Z',
  },
];

/** Lo que necesita el adaptador para el equivalente en memoria del trigger `resolver_toques`. */
export interface DiasApuntados {
  listar(dossierId: string, desde: string, hasta: string): Promise<{ fecha: string }[]>;
}

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

export class ToqueMemory implements ToquePort {
  private toques = TOQUES_DEMO.map((t) => ({ ...t }));
  private siguienteId = 1;

  /**
   * Con sesión, como Supabase, para saber quién da el toque. `dias` es opcional: si se pasa (el
   * mismo `RegistroDiarioMemory`), un toque se resuelve solo cuando el alumno apunta un día.
   */
  constructor(
    private readonly auth: AuthPort,
    private readonly dias?: DiasApuntados,
  ) {}

  async dar(dossierId: string, diasSinApuntar: number) {
    const usuario = await this.auth.usuarioActual();
    if (!usuario) throw new Error('No hay sesión iniciada');
    const fecha = hoy();
    if (this.toques.some((t) => t.dossierId === dossierId && t.fecha === fecha)) {
      throw new ToqueYaExisteError();
    }
    const toque: Toque = {
      id: `toque-${this.siguienteId++}`,
      dossierId,
      dadoPor: usuario.id,
      diasSinApuntar,
      fecha,
      creadoEn: new Date().toISOString(),
      vistoEn: null,
      resueltoEn: null,
    };
    this.toques = [toque, ...this.toques];
    return { ...toque };
  }

  async pendientesDelAlumno() {
    const usuario = await this.auth.usuarioActual();
    if (!usuario) return [];
    const suyos = new Set(DOSSIERS_DEMO.filter((d) => d.alumnoId === usuario.id).map((d) => d.id));
    const pendientes = this.toques
      .filter((t) => suyos.has(t.dossierId) && estaPendiente(t))
      .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
    if (!this.dias) return pendientes.map((t) => ({ ...t }));
    const resueltos: Toque[] = [];
    for (const toque of pendientes) {
      const apuntados = await this.dias.listar(toque.dossierId, toque.fecha, hoy());
      if (apuntados.length === 0) {
        resueltos.push({ ...toque });
        continue;
      }
      // Como el trigger: apuntar un día resuelve los toques pendientes de ese dossier.
      const guardado = this.toques.find((t) => t.id === toque.id);
      if (guardado) guardado.resueltoEn = new Date().toISOString();
    }
    return resueltos;
  }

  async ultimosPorDossier(dossierIds: string[]) {
    const ultimos = new Map<string, Toque>();
    for (const toque of this.toques) {
      if (!dossierIds.includes(toque.dossierId)) continue;
      const actual = ultimos.get(toque.dossierId);
      if (!actual || toque.creadoEn > actual.creadoEn) ultimos.set(toque.dossierId, toque);
    }
    return [...ultimos.values()].map((t) => ({ ...t }));
  }

  async marcarVisto(id: string) {
    const toque = this.toques.find((t) => t.id === id);
    if (!toque) throw new Error('El toque no existe');
    // Como el trigger: solo se puede marcar, y solo la primera vez.
    toque.vistoEn = toque.vistoEn ?? new Date().toISOString();
    return { ...toque };
  }
}

import type { BorradorTarea, Tarea } from '@/core/domain/tarea';
import type { AuthPort } from '@/core/ports/auth-port';

import { IDS_DEMO } from './datos-demo';
import type { TareaPort } from '@/core/ports/tarea-port';

// Ejemplo: tareas del profe en los dossiers de prueba (pendientes, vencida y hechas).
const TAREAS_DEMO: Tarea[] = [
  {
    id: 'tarea-demo-1',
    dossierId: IDS_DEMO.dossier,
    titulo: 'Entregar el plan de actividades firmado',
    descripcion: 'Firmado por la empresa y por ti.',
    fechaLimite: '2026-10-31',
    completada: false,
    creadaPor: IDS_DEMO.profe,
  },
  {
    id: 'tarea-demo-2',
    dossierId: IDS_DEMO.dossier,
    titulo: 'Presentarte a tu tutor de empresa',
    descripcion: null,
    fechaLimite: null,
    completada: true,
    creadaPor: IDS_DEMO.profe,
  },
  {
    id: 'tarea-demo-3',
    dossierId: IDS_DEMO.dossier,
    titulo: 'Subir la memoria de la primera quincena',
    descripcion: 'Un resumen de una página con lo que has aprendido.',
    fechaLimite: '2026-10-20',
    completada: false,
    creadaPor: IDS_DEMO.profe,
  },
  {
    id: 'tarea-demo-4',
    dossierId: IDS_DEMO.dossier,
    titulo: 'Preparar la presentación del prototipo',
    descripcion: '10 minutos, para la reunión de seguimiento.',
    fechaLimite: '2026-11-06',
    completada: false,
    creadaPor: IDS_DEMO.profe,
  },
  {
    id: 'tarea-demo-5',
    dossierId: IDS_DEMO.dossier,
    titulo: 'Firmar el acuerdo de confidencialidad',
    descripcion: null,
    fechaLimite: '2026-09-18',
    completada: true,
    creadaPor: IDS_DEMO.profe,
  },
  {
    id: 'tarea-demo-6',
    dossierId: 'cccccccc-0000-0000-0000-000000000002',
    titulo: 'Entregar el plan de actividades firmado',
    descripcion: null,
    fechaLimite: '2026-10-31',
    completada: false,
    creadaPor: IDS_DEMO.profe,
  },
  {
    id: 'tarea-demo-7',
    dossierId: 'cccccccc-0000-0000-0000-000000000003',
    titulo: 'Documentar la incidencia del servidor',
    descripcion: 'Qué pasó, cómo se resolvió y cómo evitarlo.',
    fechaLimite: '2026-10-23',
    completada: false,
    creadaPor: IDS_DEMO.profe,
  },
];

export class TareaMemory implements TareaPort {
  private tareas = TAREAS_DEMO.map((t) => ({ ...t }));
  private siguienteId = 1;

  constructor(private readonly auth: AuthPort) {}

  async listar(dossierId: string) {
    return this.tareas.filter((t) => t.dossierId === dossierId);
  }

  async crear(b: BorradorTarea) {
    const tarea: Tarea = {
      ...b,
      id: `tarea-${this.siguienteId++}`,
      completada: false,
      creadaPor: (await this.auth.usuarioActual())?.id ?? null,
    };
    this.tareas.push(tarea);
    return tarea;
  }

  async marcar(id: string, completada: boolean) {
    const tarea = this.tareas.find((t) => t.id === id);
    if (!tarea) throw new Error('La tarea no existe');
    tarea.completada = completada;
    return { ...tarea };
  }

  async borrar(id: string) {
    this.tareas = this.tareas.filter((t) => t.id !== id);
  }
}

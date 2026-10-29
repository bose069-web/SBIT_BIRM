import type { InformePort } from '@/core/ports/informe-port';
import { totalHoras } from '@/core/domain/registro-diario';

import { DOSSIERS_DEMO, REGISTROS_DEMO } from './datos-demo';

/** Todos los datos demo son visibles: en memoria no hay RLS que filtrar. */
export class InformesMemory implements InformePort {
  async obtenerDatos() {
    return {
      dossiers: DOSSIERS_DEMO.map((d) => ({
        id: d.id,
        alumnoId: d.alumnoId,
        alumnoNombre: d.alumnoNombre,
        tutorId: d.tutorId,
        tutorNombre: d.tutorNombre,
        tutorEmpresaId: d.tutorEmpresaId,
        centroId: d.centroId,
        centro: d.centro,
        empresaId: d.empresaId,
        empresa: d.empresa,
        horasTotales: d.horasTotales,
      })),
      dias: REGISTROS_DEMO.map((r) => ({
        dossierId: r.dossierId,
        fecha: r.fecha,
        horas: totalHoras(r),
      })),
    };
  }
}

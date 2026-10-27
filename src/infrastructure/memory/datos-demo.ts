import type { Dossier } from '@/core/domain/dossier';
import type { HorasActividad, RegistroDiario } from '@/core/domain/registro-diario';
import type { Usuario } from '@/core/domain/usuario';
import type { ValoracionMensual } from '@/core/domain/valoracion';

// Datos de prueba alineados con `supabase/seed.sql`: mismos IDs para el primer dossier
// y datos de septiembre y octubre para tres alumnos.
export const CONTRASENA_DEMO = 'kampus';

const ALUMNO_1 = '11111111-1111-1111-1111-111111111111';
const ALUMNO_2 = '44444444-4444-4444-4444-444444444444';
const ALUMNO_3 = '55555555-5555-5555-5555-555555555555';
const PROFE = '22222222-2222-2222-2222-222222222222';
const EMPRESA_1 = '33333333-3333-3333-3333-333333333333';
const EMPRESA_2 = '66666666-6666-6666-6666-666666666666';

export const USUARIOS_DEMO: Usuario[] = [
  { id: ALUMNO_1, nombre: 'Alumno Demo', email: 'alumno@kampus.test', rol: 'alumno' },
  { id: ALUMNO_2, nombre: 'Lucía Ferrer', email: 'alumno2@kampus.test', rol: 'alumno' },
  { id: ALUMNO_3, nombre: 'Marc Vidal', email: 'alumno3@kampus.test', rol: 'alumno' },
  { id: PROFE, nombre: 'Profe Demo', email: 'profe@kampus.test', rol: 'profe' },
  {
    id: EMPRESA_1,
    nombre: 'Tutor Empresa Demo',
    email: 'empresa@kampus.test',
    rol: 'empresa',
  },
  { id: EMPRESA_2, nombre: 'Núria Soler', email: 'empresa2@kampus.test', rol: 'empresa' },
];

const DOSSIER_1 = 'cccccccc-0000-0000-0000-000000000001';
const DOSSIER_2 = 'cccccccc-0000-0000-0000-000000000002';
const DOSSIER_3 = 'cccccccc-0000-0000-0000-000000000003';

export const DOSSIERS_DEMO: Dossier[] = [
  {
    id: DOSSIER_1,
    alumnoId: ALUMNO_1,
    alumnoNombre: 'Alumno Demo',
    tutorId: PROFE,
    tutorNombre: 'Profe Demo',
    tutorEmpresaId: EMPRESA_1,
    tutorEmpresaNombre: 'Tutor Empresa Demo',
    ciclo: 'DAM',
    empresa: 'Empresa Demo SL',
    centro: 'Institut Demo',
    fechaInicio: '2026-09-15',
    fechaFin: '2027-03-15',
    horasTotales: 400,
    actividades: [
      {
        id: 'dddddddd-0000-0000-0000-000000000001',
        descripcion: 'Desarrollo de interfaces',
        orden: 1,
      },
      { id: 'dddddddd-0000-0000-0000-000000000002', descripcion: 'Acceso a datos', orden: 2 },
      {
        id: 'dddddddd-0000-0000-0000-000000000003',
        descripcion: 'Pruebas y documentación',
        orden: 3,
      },
    ],
  },
  {
    id: DOSSIER_2,
    alumnoId: ALUMNO_2,
    alumnoNombre: 'Lucía Ferrer',
    tutorId: PROFE,
    tutorNombre: 'Profe Demo',
    tutorEmpresaId: EMPRESA_2,
    tutorEmpresaNombre: 'Núria Soler',
    ciclo: 'DAW',
    empresa: 'Softcat Solutions SL',
    centro: 'Institut Demo',
    fechaInicio: '2026-09-01',
    fechaFin: '2027-03-01',
    horasTotales: 380,
    actividades: [
      {
        id: 'dddddddd-0000-0000-0000-000000000004',
        descripcion: 'Maquetación de componentes',
        orden: 1,
      },
      {
        id: 'dddddddd-0000-0000-0000-000000000005',
        descripcion: 'API REST y base de datos',
        orden: 2,
      },
      {
        id: 'dddddddd-0000-0000-0000-000000000006',
        descripcion: 'Revisión de código y pruebas',
        orden: 3,
      },
    ],
  },
  {
    id: DOSSIER_3,
    alumnoId: ALUMNO_3,
    alumnoNombre: 'Marc Vidal',
    tutorId: PROFE,
    tutorNombre: 'Profe Demo',
    tutorEmpresaId: EMPRESA_2,
    tutorEmpresaNombre: 'Núria Soler',
    ciclo: 'ASIX',
    empresa: 'Nexo Digital SL',
    centro: 'Escola Pia Demo',
    fechaInicio: '2026-09-10',
    fechaFin: '2027-02-28',
    horasTotales: 350,
    actividades: [
      {
        id: 'dddddddd-0000-0000-0000-000000000007',
        descripcion: 'Instalación de sistemas',
        orden: 1,
      },
      {
        id: 'dddddddd-0000-0000-0000-000000000008',
        descripcion: 'Monitorización de redes',
        orden: 2,
      },
      {
        id: 'dddddddd-0000-0000-0000-000000000009',
        descripcion: 'Atención a incidencias',
        orden: 3,
      },
    ],
  },
];

const PATRONES_HORAS: readonly (readonly number[])[] = [
  [6, 0, 0],
  [4, 2, 0],
  [3, 0, 3],
  [0, 5, 1],
  [5, 1, 0],
  [2, 2, 2],
  [7, 0, 0],
  [0, 6, 0],
];

function fechaISO(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

function diasLaborables(desde: string, hasta: string): string[] {
  const [anio, mes, dia] = desde.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  const dias: string[] = [];
  while (fechaISO(fecha) <= hasta) {
    const diaSemana = fecha.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) dias.push(fechaISO(fecha));
    fecha.setDate(fecha.getDate() + 1);
  }
  return dias;
}

function crearRegistros(
  dossier: Dossier,
  desde: string,
  hasta: string,
  excluir: string[],
  especiales: RegistroDiario[],
  notas: Record<string, string> = {},
): RegistroDiario[] {
  const excluidos = new Set(excluir);
  const registros = diasLaborables(desde, hasta)
    .filter((fecha) => !excluidos.has(fecha))
    .map((fecha, indice) => {
      const patron = PATRONES_HORAS[indice % PATRONES_HORAS.length];
      const horas: HorasActividad[] = [];
      patron.forEach((cantidad, posicion) => {
        const actividad = dossier.actividades[posicion];
        if (cantidad > 0 && actividad) {
          horas.push({ actividadId: actividad.id, horas: cantidad });
        }
      });
      return {
        id: `demo-${dossier.id}-${fecha}`,
        dossierId: dossier.id,
        fecha,
        tipo: 'trabajo' as const,
        horas,
        observaciones: notas[fecha] ?? null,
      };
    });
  return [...registros, ...especiales];
}

function diaEspecial(
  dossierId: string,
  fecha: string,
  tipo: 'festivo' | 'ausencia',
  observaciones: string | null = null,
): RegistroDiario {
  return {
    id: `demo-${dossierId}-${fecha}`,
    dossierId,
    fecha,
    tipo,
    horas: [],
    observaciones,
  };
}

export const REGISTROS_DEMO: RegistroDiario[] = [
  {
    id: 'eeeeeeee-0000-0000-0000-000000000001',
    dossierId: DOSSIER_1,
    fecha: '2026-09-15',
    tipo: 'trabajo',
    horas: [{ actividadId: 'dddddddd-0000-0000-0000-000000000001', horas: 6 }],
    observaciones: null,
  },
  {
    id: 'eeeeeeee-0000-0000-0000-000000000002',
    dossierId: DOSSIER_1,
    fecha: '2026-10-01',
    tipo: 'trabajo',
    horas: [
      { actividadId: 'dddddddd-0000-0000-0000-000000000002', horas: 4 },
      { actividadId: 'dddddddd-0000-0000-0000-000000000003', horas: 2 },
    ],
    observaciones: null,
  },
  ...crearRegistros(
    DOSSIERS_DEMO[0],
    '2026-09-16',
    '2026-10-26',
    ['2026-10-01', '2026-10-12', '2026-10-14', '2026-10-20', '2026-10-23'],
    [
      diaEspecial(DOSSIER_1, '2026-10-12', 'festivo', 'Día de la Hispanidad'),
      diaEspecial(DOSSIER_1, '2026-10-14', 'ausencia', 'Cita médica'),
    ],
    {
      '2026-09-22': 'Reunión de seguimiento con el tutor de empresa.',
      '2026-10-15': 'Entrega del primer prototipo.',
    },
  ),
  ...crearRegistros(
    DOSSIERS_DEMO[1],
    '2026-09-01',
    '2026-10-26',
    ['2026-09-11', '2026-09-18', '2026-09-24', '2026-10-09', '2026-10-12', '2026-10-21'],
    [
      diaEspecial(DOSSIER_2, '2026-09-11', 'festivo', 'Diada de Catalunya'),
      diaEspecial(DOSSIER_2, '2026-09-24', 'ausencia', 'Trámite personal'),
      diaEspecial(DOSSIER_2, '2026-10-12', 'festivo', 'Día de la Hispanidad'),
    ],
    {
      '2026-09-08': 'Primera demo del panel interno.',
      '2026-10-06': 'Corrección de accesibilidad en el formulario.',
    },
  ),
  ...crearRegistros(
    DOSSIERS_DEMO[2],
    '2026-09-10',
    '2026-10-26',
    ['2026-09-22', '2026-10-05', '2026-10-12', '2026-10-16'],
    [
      diaEspecial(DOSSIER_3, '2026-10-05', 'ausencia', 'Visita médica'),
      diaEspecial(DOSSIER_3, '2026-10-12', 'festivo', 'Día de la Hispanidad'),
    ],
    {
      '2026-09-17': 'Inventario del aula de informática.',
      '2026-10-19': 'Revisión de incidencias del servidor.',
    },
  ),
];

export const VALORACIONES_DEMO: ValoracionMensual[] = [
  {
    id: 'valoracion-demo-1',
    dossierId: DOSSIER_1,
    mes: '2026-09',
    valoracion: 'positiva',
    comentario: 'Buen inicio, se adapta rápido al equipo.',
    valoradaPor: EMPRESA_1,
    valoradaEn: '2026-10-01T09:00:00.000Z',
  },
  {
    id: 'valoracion-demo-2',
    dossierId: DOSSIER_2,
    mes: '2026-09',
    valoracion: 'positiva',
    comentario: 'Muy buen ritmo y buena comunicación con el equipo.',
    valoradaPor: EMPRESA_2,
    valoradaEn: '2026-10-02T10:30:00.000Z',
  },
  {
    id: 'valoracion-demo-3',
    dossierId: DOSSIER_3,
    mes: '2026-09',
    valoracion: 'mejorable',
    comentario: 'Debe ganar autonomía al resolver incidencias sencillas.',
    valoradaPor: EMPRESA_2,
    valoradaEn: '2026-10-02T11:15:00.000Z',
  },
];

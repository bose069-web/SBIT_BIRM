import { DatosInvalidosError } from '@/core/domain/errores';
import { nombreGrupo, type AlumnoEnClase, type BorradorGrupo, type Grupo } from '@/core/domain/grupo';
import type { GrupoPort } from '@/core/ports/grupo-port';

import { IDS_DEMO } from './datos-demo';

// Mismos IDs que datos-demo: el instituto demo administra IDS_DEMO.centro.
const GRUPOS_DEMO: Grupo[] = [
  { id: 'grupo-demo-1', centroId: IDS_DEMO.centro, ciclo: 'DAM', curso: 2, letra: 'A' },
  { id: 'grupo-demo-2', centroId: IDS_DEMO.centro, ciclo: 'DAM', curso: 2, letra: 'B' },
  { id: 'grupo-demo-3', centroId: IDS_DEMO.otroCentro, ciclo: 'ASIX', curso: 2, letra: 'A' },
];

// Los alumnos que reparte el instituto demo: el alumno de las prácticas y los de su centro.
const ALUMNOS_DEMO: AlumnoEnClase[] = [
  { id: IDS_DEMO.alumno, nombre: 'Alumno Demo', grupoId: 'grupo-demo-1' },
  { id: '7', nombre: 'Marc Soler', grupoId: 'grupo-demo-1' },
  { id: '8', nombre: 'Nora Vidal', grupoId: null },
];

export class GrupoMemory implements GrupoPort {
  private grupos = GRUPOS_DEMO.map((g) => ({ ...g }));
  private alumnos = ALUMNOS_DEMO.map((a) => ({ ...a }));
  private siguienteId = 1;

  async listarPorCentro(centroId: string) {
    return this.grupos.filter((g) => g.centroId === centroId).map((g) => ({ ...g }));
  }

  async crear(b: BorradorGrupo) {
    const grupo: Grupo = {
      id: `grupo-${this.siguienteId++}`,
      centroId: b.centroId,
      ciclo: b.ciclo,
      curso: b.curso,
      letra: b.letra,
    };
    this.comprobarRepetido(grupo);
    this.grupos.push(grupo);
    return { ...grupo };
  }

  async actualizar(b: BorradorGrupo) {
    if (!b.id) throw new DatosInvalidosError('Elige la clase que quieres cambiar');
    const grupo = this.grupos.find((g) => g.id === b.id);
    if (!grupo) throw new Error('La clase no existe');
    const cambiado: Grupo = { ...grupo, ciclo: b.ciclo, curso: b.curso, letra: b.letra };
    this.comprobarRepetido(cambiado);
    Object.assign(grupo, cambiado);
    return { ...grupo };
  }

  async borrar(id: string) {
    this.grupos = this.grupos.filter((g) => g.id !== id);
    // Como `on delete set null`: los alumnos se quedan sin clase, no se borran.
    for (const alumno of this.alumnos) {
      if (alumno.grupoId === id) alumno.grupoId = null;
    }
  }

  /** En memoria todos los alumnos de prueba son del centro demo. */
  async listarAlumnos(_centroId: string) {
    return this.alumnos.map((a) => ({ ...a }));
  }

  async asignarEnBloque(grupoId: string, alumnoIds: string[]) {
    for (const alumno of this.alumnos) {
      if (alumnoIds.includes(alumno.id)) alumno.grupoId = grupoId;
    }
  }

  async quitarDeClase(alumnoIds: string[]) {
    for (const alumno of this.alumnos) {
      if (alumnoIds.includes(alumno.id)) alumno.grupoId = null;
    }
  }

  private comprobarRepetido(grupo: Grupo) {
    const repetido = this.grupos.some(
      (g) =>
        g.id !== grupo.id &&
        g.centroId === grupo.centroId &&
        g.ciclo === grupo.ciclo &&
        g.curso === grupo.curso &&
        g.letra === grupo.letra,
    );
    if (repetido) {
      throw new DatosInvalidosError(`Ya hay una clase ${nombreGrupo(grupo)} en el centro`);
    }
  }
}

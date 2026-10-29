import { DATOS_PERSONALES_VACIOS, type DatosPersonales } from '@/core/domain/perfil';
import type { PerfilPort } from '@/core/ports/perfil-port';

import { sesionMemory } from './auth-memory';
import { IDS_DEMO } from './datos-demo';

// Ejemplo: el alumno y su profe ya han rellenado parte del perfil.
const PERFILES_DEMO: Record<string, Partial<DatosPersonales>> = {
  [IDS_DEMO.alumno]: {
    telefono: '600 123 456',
    emergenciaNombre: 'Madre (contacto de prueba)',
    emergenciaTelefono: '600 654 321',
  },
  [IDS_DEMO.profe]: {
    departamento: 'Informática',
    horarioTutoria: 'Martes y jueves de 15:00 a 16:00',
  },
  [IDS_DEMO.empresa]: {
    cargo: 'Responsable de desarrollo',
    telefonoTrabajo: '93 123 45 67',
    centroTrabajo: 'Oficina de Barcelona',
  },
};

export class PerfilMemory implements PerfilPort {
  private perfiles = new Map<string, DatosPersonales>(
    Object.entries(PERFILES_DEMO).map(([id, d]) => [id, { ...DATOS_PERSONALES_VACIOS, ...d }]),
  );

  private idActual(): string {
    const usuario = sesionMemory();
    if (!usuario) throw new Error('No hay sesión');
    return usuario.id;
  }

  async obtener() {
    return { ...(this.perfiles.get(this.idActual()) ?? DATOS_PERSONALES_VACIOS) };
  }

  async guardar(datos: DatosPersonales) {
    this.perfiles.set(this.idActual(), { ...datos });
    return { ...datos };
  }

  async cambiarNombre(nombre: string) {
    // La sesión en memoria es el propio objeto de USUARIOS_DEMO.
    const usuario = sesionMemory();
    if (!usuario) throw new Error('No hay sesión');
    usuario.nombre = nombre;
  }
}

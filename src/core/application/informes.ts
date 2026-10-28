import { SinPermisoError } from '../domain/errores';
import type {
  DiaParaInforme,
  DossierParaInforme,
  GrupoInforme,
  InformeAlumno,
  InformeEmpresa,
  InformeGeneralitat,
  InformeInstituto,
  InformeProfe,
  ProgresoAlumno,
} from '../domain/informe';
import { agrupar, horasPorMes, porcentaje, progresoDe, sumarHoras } from '../domain/informe';
import type { Usuario } from '../domain/usuario';
import type { InformePort } from '../ports/informe-port';

// Cada rol ve lo suyo: el alumno sus horas, el profe el progreso de sus alumnos, la empresa los
// que tutela, el instituto su centro por profe y por empresa, y la generalitat todos los centros.
// Las clases (grupos) llegarán con la migración de PC 2; hasta entonces el profe ve a sus alumnos.

export type Informe =
  | { tipo: 'alumno'; informe: InformeAlumno }
  | { tipo: 'profe'; informe: InformeProfe }
  | { tipo: 'empresa'; informe: InformeEmpresa }
  | { tipo: 'instituto'; informe: InformeInstituto }
  | { tipo: 'generalitat'; informe: InformeGeneralitat };

function diasDe(dossiers: DossierParaInforme[], dias: DiaParaInforme[]): DiaParaInforme[] {
  const ids = new Set(dossiers.map((d) => d.id));
  return dias.filter((d) => ids.has(d.dossierId));
}

function totales(dossiers: DossierParaInforme[], dias: DiaParaInforme[]) {
  const realizadas = sumarHoras(diasDe(dossiers, dias));
  return {
    realizadas,
    totales: dossiers.reduce((suma, d) => suma + d.horasTotales, 0),
  };
}

function progresos(dossiers: DossierParaInforme[], dias: DiaParaInforme[]): ProgresoAlumno[] {
  return dossiers
    .map((d) => progresoDe(d, dias))
    .sort((a, b) => a.alumnoNombre.localeCompare(b.alumnoNombre, 'es'));
}

export async function informeAlumno(port: InformePort, usuario: Usuario): Promise<InformeAlumno> {
  const { dossiers, dias } = await port.obtenerDatos();
  const mios = dossiers.filter((d) => d.alumnoId === usuario.id);
  const misDias = diasDe(mios, dias);
  const realizadas = sumarHoras(misDias);
  const totales = mios.reduce((suma, d) => suma + d.horasTotales, 0);
  return {
    alumnoNombre: mios[0]?.alumnoNombre ?? usuario.nombre,
    realizadas,
    totales,
    porcentaje: porcentaje(realizadas, totales),
    porMes: horasPorMes(misDias),
  };
}

export async function informeProfe(port: InformePort, usuario: Usuario): Promise<InformeProfe> {
  if (usuario.rol !== 'profe')
    throw new SinPermisoError('ver el informe de los alumnos de un profe');
  const { dossiers, dias } = await port.obtenerDatos();
  const mios = dossiers.filter((d) => d.tutorId === usuario.id);
  return { ...totales(mios, dias), alumnos: progresos(mios, dias) };
}

export async function informeEmpresa(port: InformePort, usuario: Usuario): Promise<InformeEmpresa> {
  if (usuario.rol !== 'empresa') throw new SinPermisoError('ver el informe de una empresa');
  const { dossiers, dias } = await port.obtenerDatos();
  const mios = dossiers.filter((d) => d.tutorEmpresaId === usuario.id);
  return { ...totales(mios, dias), alumnos: progresos(mios, dias) };
}

/** Informe de un centro: horas por profe y por empresa. */
export async function informeInstituto(
  port: InformePort,
  usuario: Usuario,
  centroId: string,
): Promise<InformeInstituto> {
  const esSuCentro = usuario.rol === 'instituto' && usuario.centroId === centroId;
  if (!esSuCentro && usuario.rol !== 'generalitat') {
    throw new SinPermisoError('ver el informe de este centro');
  }
  const { dossiers, dias } = await port.obtenerDatos();
  const delCentro = dossiers.filter((d) => d.centroId === centroId);
  const porProfe: GrupoInforme[] = agrupar(delCentro, dias, (d) =>
    d.tutorId && d.tutorNombre ? { id: d.tutorId, nombre: d.tutorNombre } : null,
  );
  const porEmpresa = agrupar(delCentro, dias, (d) => ({
    id: d.empresaId,
    nombre: d.empresa ?? 'Empresa',
  }));
  return { ...totales(delCentro, dias), porProfe, porEmpresa };
}

export async function informeGeneralitat(
  port: InformePort,
  usuario: Usuario,
): Promise<InformeGeneralitat> {
  if (usuario.rol !== 'generalitat')
    throw new SinPermisoError('ver el informe de todos los centros');
  const { dossiers, dias } = await port.obtenerDatos();
  return {
    ...totales(dossiers, dias),
    porCentro: agrupar(dossiers, dias, (d) => ({
      id: d.centroId,
      nombre: d.centro ?? 'Centro',
    })),
  };
}

/** El informe que le toca a cada rol, para que la pantalla solo tenga que pintarlo. */
export async function obtenerInforme(port: InformePort, usuario: Usuario): Promise<Informe> {
  if (usuario.rol === 'alumno')
    return { tipo: 'alumno', informe: await informeAlumno(port, usuario) };
  if (usuario.rol === 'profe') return { tipo: 'profe', informe: await informeProfe(port, usuario) };
  if (usuario.rol === 'empresa') {
    return { tipo: 'empresa', informe: await informeEmpresa(port, usuario) };
  }
  if (usuario.rol === 'instituto') {
    return {
      tipo: 'instituto',
      informe: await informeInstituto(port, usuario, usuario.centroId ?? ''),
    };
  }
  return { tipo: 'generalitat', informe: await informeGeneralitat(port, usuario) };
}

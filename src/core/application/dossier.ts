import type { Dossier } from '../domain/dossier';
import { resumirHoras, type ResumenHoras } from '../domain/registro-diario';
import type { DossierPort } from '../ports/dossier-port';
import type { RegistroDiarioPort } from '../ports/registro-diario-port';

export function listarDossiers(dossiers: DossierPort): Promise<Dossier[]> {
  return dossiers.listar();
}

/** El alumno tiene un dossier activo: el que incluye hoy o, si no, el más reciente. */
export async function obtenerDossierActual(
  dossiers: DossierPort,
  hoy: string,
): Promise<Dossier | null> {
  const lista = await dossiers.listar();
  const ordenados = [...lista].sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio));
  return ordenados.find((d) => hoy >= d.fechaInicio && hoy <= d.fechaFin) ?? ordenados[0] ?? null;
}

export async function obtenerResumenHoras(
  dossier: Dossier,
  registros: RegistroDiarioPort,
): Promise<ResumenHoras> {
  const todos = await registros.listar(dossier.id, dossier.fechaInicio, dossier.fechaFin);
  return resumirHoras(dossier, todos);
}

import { DOSSIERS_DEMO, REGISTROS_DEMO, USUARIOS_DEMO } from '../datos-demo';
import { AuthMemory } from '../auth-memory';
import { DossierMemory } from '../dossier-memory';
import { RegistroDiarioMemory } from '../registro-diario-memory';

const dossiers = new Map(DOSSIERS_DEMO.map((d) => [d.id, d]));

test('los datos demo tienen ids únicos', () => {
  expect(new Set(DOSSIERS_DEMO.map((d) => d.id)).size).toBe(DOSSIERS_DEMO.length);
  expect(new Set(REGISTROS_DEMO.map((r) => r.id)).size).toBe(REGISTROS_DEMO.length);
  expect(new Set(REGISTROS_DEMO.map((r) => `${r.dossierId}|${r.fecha}`)).size).toBe(
    REGISTROS_DEMO.length,
  );
});

test('los registros respetan el dossier y sus actividades', () => {
  for (const registro of REGISTROS_DEMO) {
    const dossier = dossiers.get(registro.dossierId);
    expect(dossier).toBeDefined();
    if (!dossier) continue;
    expect(registro.fecha >= dossier.fechaInicio).toBe(true);
    expect(registro.fecha <= dossier.fechaFin).toBe(true);
    if (registro.tipo !== 'trabajo') {
      expect(registro.horas).toHaveLength(0);
      continue;
    }
    const ids = new Set(dossier.actividades.map((a) => a.id));
    const total = registro.horas.reduce((suma, h) => suma + h.horas, 0);
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThanOrEqual(12);
    for (const hora of registro.horas) {
      expect(ids.has(hora.actividadId)).toBe(true);
      expect(hora.horas * 4).toBe(Math.round(hora.horas * 4));
    }
  }
});

test('cada rol ve sus dossiers y los días están cargados', async () => {
  const alumno = USUARIOS_DEMO.find((u) => u.email === 'alumno2@kampus.test');
  expect(alumno).toBeDefined();
  new AuthMemory(alumno ?? null);
  const visibles = await new DossierMemory().listar();
  expect(visibles).toHaveLength(1);
  const dias = await new RegistroDiarioMemory().listar(
    visibles[0].id,
    visibles[0].fechaInicio,
    '2026-10-31',
  );
  expect(dias.length).toBeGreaterThan(15);
  expect(dias.some((d) => d.fecha.startsWith('2026-09'))).toBe(true);
  expect(dias.some((d) => d.fecha.startsWith('2026-10'))).toBe(true);

  const profe = USUARIOS_DEMO.find((u) => u.rol === 'profe');
  new AuthMemory(profe ?? null);
  expect(await new DossierMemory().listar()).toHaveLength(3);

  const empresa = USUARIOS_DEMO.find((u) => u.email === 'empresa2@kampus.test');
  new AuthMemory(empresa ?? null);
  expect(await new DossierMemory().listar()).toHaveLength(2);
});

// Copia de seguridad del proyecto Supabase enlazado (`npx supabase link`).
// Guarda esquema, roles y datos en backups/AAAA-MM-DD/. La carpeta está en .gitignore:
// los datos son personales y el repo es público, así que nunca se suben.
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const carpeta = `backups/${new Date().toISOString().slice(0, 10)}`;
mkdirSync(carpeta, { recursive: true });

const volcados = [
  ['esquema.sql', []],
  ['roles.sql', ['--role-only']],
  ['datos.sql', ['--data-only', '--use-copy']],
];
for (const [archivo, opciones] of volcados) {
  execFileSync(
    'npx',
    ['supabase', 'db', 'dump', '--linked', ...opciones, '-f', `${carpeta}/${archivo}`],
    {
      stdio: 'inherit',
    },
  );
}
console.log(`Copia guardada en ${carpeta}/`);

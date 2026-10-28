# Kampus — instrucciones para agentes (OpenCode, Codex, Claude)

App móvil del TEAM BIRM. Documentación y plan: vault de Obsidian https://github.com/Izanml13/Vault-sbit

## Arquitectura hexagonal (obligatoria)

```
src/core/            Núcleo, TypeScript puro: domain/ (entidades), ports/ (interfaces), application/ (casos de uso)
src/infrastructure/  Adaptadores que implementan los puertos (memory/, supabase/…)
src/config/          container.ts: único sitio que elige e inyecta adaptadores
src/ui/              Componentes, hooks, tema y vistas (pantallas completas que usan las rutas)
src/app/             Pantallas (Expo Router)
```

- `core/` NO importa React, React Native, Expo, Supabase ni nada de `infrastructure/`, `ui/`, `config/` o `app/`.
- `app/` y `ui/` NO importan `infrastructure/`: usan casos de uso de `@/core/application` y `container` de `@/config/container`.
- Estas reglas las comprueba ESLint: si `npm run lint` falla, la tarea no está terminada.
- Módulo nuevo: entidad (`domain/`) → puerto (`ports/`) → casos de uso (`application/`) → adaptador memoria → adaptador real → registrar en `container.ts` → pantalla.

## Reparto por PCs: qué puede tocar cada uno

Reparto del sprint 4 (detalle y encargos en el vault: `01 - Planificación/Encargos sprint 4`).

| PC   | Papel            | Puede modificar                                                                                         |
| ---- | ---------------- | ------------------------------------------------------------------------------------------------------- |
| PC 1 | Front (Claude)   | `src/app/`, `src/ui/`, `src/config/`, `.github/`, `package.json` y configuración. Revisa y fusiona todo |
| PC 1 | Revisión (Codex) | Revisa las PR de PC 2 y PC 3; solo arregla lo que pida PC 1                                             |
| PC 2 | Base de datos    | `supabase/migrations/` (solo migraciones nuevas) y `supabase/seed.sql`                                  |
| PC 3 | Backend          | `src/core/` (domain, ports, application, tests y fixtures) y `src/infrastructure/` (memory y supabase)  |
| PC 4 | Ayudante general | Tests (`src/**/__tests__/`), `e2e/` y documentación. No cambia código de producción                     |

- Cadena de trabajo: PC 2 hace la migración → PC 3 el núcleo y los adaptadores → PC 1 la pantalla. Cada uno avisa al siguiente cuando su PR está en `develop`.
- Si una tarea necesita tocar una carpeta que no es tuya (por ejemplo registrar algo en `container.ts` o añadir una dependencia): NO lo cambies. Descríbelo en la PR para que lo haga su dueño.

## Base de datos (Supabase)

La base se define SOLO con los archivos de `supabase/migrations/`. Nada de SQL a mano en el panel de Supabase.

- Cambio en la base = migración nueva: `npm run db:nueva nombre_corto` crea `supabase/migrations/<fecha>_nombre_corto.sql`.
- NUNCA edites una migración que ya está en `main`: ya se aplicó en producción. Si algo está mal, otra migración que lo corrija.
- Probar en local (Docker): `npm run db:start` la primera vez y `npm run db:reset` para recrear la base con todas las migraciones y `supabase/seed.sql`.
- Las migraciones las escribe PC 2. Los demás describen en la PR el cambio que necesitan.
- Cada migración se prueba en local con cada rol (RLS) antes de abrir la PR.
- El CI aplica todas las migraciones desde cero en cada PR; al fusionar en `main`, `desplegar-db.yml` las sube a Supabase.
- Copia de seguridad: `npm run db:backup` (queda en `backups/`, que nunca se sube).

## Normas

- Todo el código, nombres de dominio y comentarios en español; TypeScript estricto, sin `any`.
- Ramas (detalle en el vault: `04 - Desarrollo/Flujo de ramas`):
  - `main` = producción (lo que se despliega a Supabase). Solo recibe PR desde `develop` (release) o `hotfix/`.
  - `develop` = integración. Toda rama de trabajo sale de `develop` y vuelve a `develop` por PR.
  - Ramas de trabajo `tipo/pcN-descripcion-corta`:
    - DEV: `feature/` (funcionalidad nueva) y `fix/` (corrección).
    - OPS: `ops/` (CI, workflows, config, scripts, dependencias). Solo PC 1.
    - QA: `test/` (tests unitarios o e2e sin cambiar funcionalidad).
    - DOCS: `docs/`.
    - `hotfix/` sale de `main` y vuelve a `main` y a `develop`. Solo PC 1.
  - Commits: `tipo(área): qué hace`, con tipo `feat`, `fix`, `ops`, `test`, `docs`, `refactor` o `chore`.
  - Nunca commits directos a `main` ni a `develop`; la rama se borra al fusionar.
- Antes de dar algo por terminado: `npm run lint`, `npm run typecheck` y `npm run format:check`.
- Nunca subas `.env.local` ni claves.

---

This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

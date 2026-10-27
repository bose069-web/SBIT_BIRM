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

| PC   | Agente              | Puede modificar                                                                                                  |
| ---- | ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| PC 1 | Claude Code + Codex | Todo. Dueño de `core/`, `config/`, `infrastructure/` (salvo `memory/`), `.github/`, configuración y dependencias |
| PC 2 | OpenCode            | `src/app/`, `src/ui/hooks/`, `src/ui/vistas/`, `src/ui/utils/`                                                   |
| PC 3 | OpenCode            | `src/ui/components/`, `src/ui/theme/`, `src/infrastructure/memory/`                                              |
| PC 4 | OpenCode            | Panel web, `e2e/`, diseño                                                                                        |

Si una tarea de PC 2-4 necesita cambiar un puerto, caso de uso, `container.ts`, `package.json` o la configuración: NO lo cambies. Descríbelo en la PR para que lo haga PC 1.

## Normas

- Todo el código, nombres de dominio y comentarios en español; TypeScript estricto, sin `any`.
- Rama por tarea `feature/pcN-descripcion`; nunca commits directos a `main`.
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

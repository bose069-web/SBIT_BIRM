# Kampus

App móvil del **TEAM BIRM** (Boubacar · Izan · Richard · Marco). Reúne en el móvil las funciones del SBIT del Departamento de Educación.

Documentación, plan de trabajo y decisiones: vault de Obsidian → https://github.com/Izanml13/Vault-sbit

## Stack

- **App:** React Native + Expo (TypeScript, Expo Router)
- **Backend:** intercambiable gracias a la arquitectura hexagonal. Ahora: memoria (datos de prueba). Candidato: Supabase (pendiente de confirmar).
- **Web (panel de administración y página):** Next.js en Vercel (pendiente)

## Puesta en marcha

1. Instala [Node.js 22](https://nodejs.org) y, en el móvil, la app **Expo Go**.
2. Clona e instala:
   ```bash
   git clone https://github.com/bose069-web/SBIT_BIRM.git
   cd SBIT_BIRM
   npm install
   ```
3. (Opcional) Copia `.env.example` como `.env.local`. Sin él, la app usa el backend en memoria con datos de prueba.
4. Arranca: `npm start` y escanea el QR con Expo Go (o pulsa `w` para abrirla en el navegador).

La pantalla de Inicio muestra qué backend se usa y si está conectado.

## Arquitectura hexagonal

El núcleo de la app no sabe nada de Expo, React ni del backend. Se comunica con el exterior por **puertos** (interfaces) que implementan los **adaptadores**. Así podemos cambiar de backend (memoria → Supabase → API propia) sin tocar la lógica ni las pantallas.

```
src/
  core/                 ⬡ Núcleo: TypeScript puro, sin frameworks
    domain/             Entidades y errores (Usuario, Rol…)
    ports/              Interfaces que el núcleo necesita (AuthPort…)
    application/        Casos de uso (iniciarSesion, obtenerUsuarioActual…)
  infrastructure/       Adaptadores que implementan los puertos
    memory/             Backend en memoria con datos de prueba (por defecto)
    supabase/           Backend Supabase (opcional)
  config/
    container.ts        Composition root: elige qué adaptador se usa
  ui/                   Adaptador de entrada: componentes, hooks y tema
  app/                  Pantallas (rutas de Expo Router)
```

Reglas (las comprueba ESLint):

- `core/` no importa nada de `infrastructure/`, `ui/`, `config/`, React, Expo ni Supabase.
- `ui/` y `app/` no importan adaptadores: usan los casos de uso y `container`.

### Elegir backend

En `.env.local`, `EXPO_PUBLIC_BACKEND=memory` (por defecto) o `EXPO_PUBLIC_BACKEND=supabase`.
Con `memory` hay usuarios de prueba (`alumno@kampus.test`, `profesor@kampus.test`, `familia@kampus.test`, `admin@kampus.test`; contraseña `kampus`).

### Añadir una funcionalidad nueva (ej. notas)

1. Entidad en `core/domain/` (`nota.ts`).
2. Puerto en `core/ports/` (`notas-port.ts`).
3. Casos de uso en `core/application/`.
4. Adaptador en `infrastructure/memory/` (y en `infrastructure/supabase/` cuando toque).
5. Registrarlo en `config/container.ts`.
6. Pantalla en `app/` que llama a los casos de uso.

## Forma de trabajar

- `main` siempre estable. Cada tarea en una rama `feature/<nombre>`.
- Pull Request revisada por otro compañero antes de fusionar.
- Antes de subir: `npm run lint`, `npm run typecheck` y `npm run format`.
- GitHub Actions comprueba lint, tipos y formato en cada PR.
- Nunca subas `.env.local` ni claves secretas.
- Para añadir paquetes usa `npx expo install <paquete>` (elige versiones compatibles con Expo).

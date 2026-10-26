# Kampus

App móvil del **TEAM BIRM** (Boubacar · Izan · Richard · Marco). Reúne en el móvil las funciones del SBIT del Departamento de Educación.

Documentación, plan de trabajo y decisiones: vault de Obsidian → https://github.com/Izanml13/Vault-sbit

## Stack

- **App:** React Native + Expo (TypeScript, Expo Router)
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Web (panel de administración y página):** Next.js en Vercel (pendiente)

## Puesta en marcha

1. Instala [Node.js 22](https://nodejs.org) y, en el móvil, la app **Expo Go**.
2. Clona e instala:
   ```bash
   git clone https://github.com/bose069-web/SBIT_BIRM.git
   cd SBIT_BIRM
   npm install
   ```
3. Copia `.env.example` como `.env.local` y pon la URL y la clave pública de Supabase (Project Settings → API).
4. Arranca: `npm start` y escanea el QR con Expo Go (o pulsa `w` para abrirla en el navegador).

La pantalla de Inicio muestra si la conexión con Supabase funciona.

## Estructura

```
src/
  app/          Pantallas (cada archivo es una ruta de Expo Router)
  components/   Componentes reutilizables
  constants/    Tema: colores, espaciados, fuentes
  hooks/        Hooks propios
  lib/          Clientes y utilidades (supabase.ts)
```

## Forma de trabajar

- `main` siempre estable. Cada tarea en una rama `feature/<nombre>`.
- Pull Request revisada por otro compañero antes de fusionar.
- Antes de subir: `npm run lint`, `npm run typecheck` y `npm run format`.
- GitHub Actions comprueba lint, tipos y formato en cada PR.
- Nunca subas `.env.local` ni claves secretas.
- Para añadir paquetes usa `npx expo install <paquete>` (elige versiones compatibles con Expo).

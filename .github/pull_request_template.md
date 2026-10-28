<!-- Base: `develop` (o `main` solo si es una release desde develop o un hotfix/). -->
<!-- Título: tipo(área): qué hace — p. ej. feat(app): pantalla de tareas -->

## Tipo

- [ ] DEV · `feature/` o `fix/`
- [ ] OPS · `ops/` (CI, despliegue, Supabase, scripts)
- [ ] QA · `test/`
- [ ] DOCS · `docs/`
- [ ] Hotfix · `hotfix/` (contra `main`)

## Qué cambia

-

## Cómo probarlo

-

## Checklist

- [ ] `npm run lint`, `npm run typecheck` y `npm run format:check` pasan
- [ ] Probado en móvil (Expo Go) o web
- [ ] Documentado en el vault si es un módulo nuevo
- [ ] Si toca `supabase/migrations/`: migración nueva, sin editar ninguna ya aplicada

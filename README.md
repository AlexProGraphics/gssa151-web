# GSSA 151 — Web + Creador de Parrillas Kraal

Web del Grupo Scout San Agustín 151, con la herramienta interactiva para
asignar scouters a las unidades cada ronda (2026/27 por ahora).

## Qué hay aquí

- `/` — portada del grupo.
- **Login unificado, arriba a la derecha en todas las páginas**
  (`components/SiteHeader.tsx` + `components/LoginWidget.tsx`): un único
  desplegable con los 33 scouters (admins incluidos). Login y registro son
  el mismo paso — la contraseña que escribes la primera vez se queda
  fijada como la tuya. Admin y scouter son sesiones independientes (dos
  cookies): se puede estar logueado como las dos cosas a la vez si tu
  nombre tiene ambos roles (caso de Gabi/Alex Muñoz), y el widget sigue
  ofreciendo el rol que aún te falte.
- `/parrillas` — dashboard público: las 10 unidades con sus scouters
  debajo (solo nombre + unidad, sin puntuaciones). No requiere login.
- `/encuesta` — encuesta de preferencias; requiere estar logueado como
  scouter (usa el login del header). Solo puedes enviar tu propia
  respuesta.
- `/mi-parrilla` — "Crea tu parrilla": cada scouter monta su propia
  propuesta de tablero (arrastra/mueve entre unidades) sin tocar la
  parrilla oficial — vive en `proposal_draft_assignments`, un scratch
  personal por scouter. Tiene sus propios botones de WhatsApp/Excel
  (exportan tu borrador, no la parrilla oficial). "Enviar propuesta al
  kraal" congela una copia en `proposals`/`proposal_assignments` — cada
  envío se guarda como un historial, no se pisa el anterior.
- `/login` — versión de página completa del mismo login del header (útil
  como destino de redirect); mismo desplegable y misma acción.
- `/admin/board` — tablero editable (arrastrar o seleccionar+mover) con
  botón "Generar sugerencia" (`lib/scoring.ts`).
- `/admin/scouters` — alta de scouters, edición de su puntuación
  confidencial (MTL, experiencia, confianza, líder) y reseteo de la
  contraseña de encuesta de un scouter si la olvida.
- `/admin/units` — listado de las 10 unidades.
- `/admin/respuestas` — bandeja con quién ha respondido la encuesta (y
  qué respondió), quién tiene cuenta registrada, y las propuestas de
  parrilla que han ido llegando de "Crea tu parrilla" (historial completo,
  no solo la última de cada uno).

## Stack — deliberadamente sencillo

- **Next.js 16** (App Router, Turbopack).
- **SQLite embebido** (`node:sqlite`, incluido en Node — sin Docker, sin
  cuentas externas, sin servicios que instalar). Vive en un único archivo:
  `data/gssa151.db`. Se crea y se rellena solo la primera vez que arranca
  la app (roster real de la ronda 2026/27, ver `lib/seedData.ts`).
- **Autenticación propia**, mínima (`lib/auth.ts`, hash con `scrypt`,
  sesión por cookie httpOnly):
  - **Scouters** (`scouter_users`): "reclaman" su identidad en `/encuesta`
    — la primera vez que alguien elige su nombre, la contraseña que
    escribe se queda fijada como la suya; nadie más puede volver a
    registrarse con ese nombre. Si la olvida, solo un admin se la puede
    resetear desde `/admin/scouters` (no hay recuperación propia).
  - **Admins** (`admin_users`, exactamente dos: Gabi y Alex Muñoz): cuenta
    ligada a su identidad de scouter (mismo desplegable de nombres, no
    email) con contraseña fija `akela151` — no hay pantalla para
    cambiarla; se reafirma en cada arranque del servidor
    (`ensureFixedAdmins` en `lib/db.ts`). Para cambiarla de verdad hay que
    editar `FIXED_ADMIN_PASSWORD`/`FIXED_ADMIN_NAMES` en ese archivo.
- **Confidencialidad por código, no por infraestructura**: las tablas
  `scouter_scores`, `scouter_branch_experience`, `survey_responses` y
  `survey_compatibility` solo se leen desde páginas/Server Actions que
  comprueban `getCurrentAdmin()`/`requireAdmin()` primero. El tablero
  público, la encuesta (solo escritura de la propia respuesta) y el
  export a Excel/WhatsApp jamás importan esas tablas.

## Puesta en marcha (local)

Requiere **Node ≥ 20.9** (usa Node 24 vía nvm si tu sistema tiene una
versión más antigua — hay un `.nvmrc`).

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). El archivo
`data/gssa151.db` se crea automáticamente con el roster real la primera
vez que se sirve cualquier página (no hace falta ejecutar SQL a mano), y
las dos cuentas admin (Gabi, Alex Muñoz) se crean solas con la contraseña
fija `akela151`.

## Desplegar (pendiente): esto no sirve tal cual en Vercel

Vercel ejecuta cada función en un entorno **sin disco persistente**: el
archivo `data/gssa151.db` se perdería entre peticiones. Este proyecto está
pensado para funcionar así en local o en un servidor propio (un Mac mini,
una VPS barata, Railway, Fly.io con volumen persistente…) sin tocar nada.

Para desplegar específicamente en Vercel hará falta cambiar `lib/db.ts`
para que apunte a una base de datos alojada en vez de al archivo local —
las opciones más sencillas, sin reescribir el resto de la app:

- **Turso** (SQLite alojado, plan gratuito): cambiar `node:sqlite` por
  `@libsql/client`, mismo SQL.
- **Supabase / Postgres**: más trabajo (adaptar las queries a Postgres),
  pero añade RLS a nivel de base de datos si en algún momento se prefiere
  esa capa extra de garantía además de los checks de `requireAdmin()`.

Aviso esto para que quede explícito: hoy la app **funciona perfectamente
en local**, pero el paso a Vercel requiere esa migración de base de datos
antes de desplegar.

## Notas

- El tablero no es en tiempo real entre varios admins a la vez (se
  refresca al navegar).
- `/admin/units` es de solo lectura por ahora; los cambios de nombre/color
  se hacen editando `lib/seedData.ts` (y borrando `data/gssa151.db` para
  que se regenere, o vía SQL directo sobre ese archivo).

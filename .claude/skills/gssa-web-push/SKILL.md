---
name: gssa-web-push
description: Sube y despliega los cambios pendientes del proyecto GSSA 151 web (gssa151-web) — pasa comprobaciones de tipos/lint, commitea, hace push a GitHub y despliega a producción en Vercel, verificando al final que la web en vivo responde bien. Úsala siempre que el usuario diga "gssa web push", "push gssa", "sube esto a producción", "despliega la web del grupo scout", o pida publicar/actualizar/sincronizar la web de GSSA 151 después de haber hecho cambios de desarrollo en gssa151-web — no hace falta que lo pida con esas palabras exactas, cualquier petición de subir/desplegar este proyecto cuenta. Es específica de este proyecto: si se invoca desde otro directorio o repo, para y dilo claramente en vez de intentar adaptarla.
---

# gssa-web-push

Automatiza el único flujo de publicación que usa este proyecto: local → GitHub → Vercel. La base de datos (Turso) nunca necesita un paso manual — el propio código migra y siembra el esquema solo, la primera vez que una función serverless llama a `getDb()` después del deploy (ver `lib/db.ts`). Esta skill no toca esa lógica ni las variables de entorno; asume que `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN` ya están puestas en Vercel (Production y Preview) de una vez, y nunca debe leerlas, imprimirlas ni pedirlas.

Sigue los pasos en orden. Si uno falla, para ahí y explica el fallo — no continúes al siguiente paso con algo roto a medias.

## 0. Confirma que estás en el sitio correcto

Esta skill es solo para el proyecto `gssa151-web`. Antes de tocar nada:

```bash
cd /Users/alejandromunozdelamorena/Documents/CLAUDE/gssa151-web
git remote get-url origin
```

Si el comando falla, si el directorio no existe, o la URL del remoto no es `AlexProGraphics/gssa151-web`, para inmediatamente y dile al usuario que esta skill es específica de ese proyecto — no intentes "adaptarla" a otro repo aunque se parezca.

Node 24 (necesario para `tsc`, el build y `npx vercel`) vive en:
`/Users/alejandromunozdelamorena/.nvm/versions/node/v24.15.0/bin`
Antepon esa ruta al `PATH` en cada comando de este flujo, tal como se muestra abajo.

## 1. Comprueba que hay algo que subir

```bash
git status --short
```

Si no hay cambios sin commitear **y** la rama local `main` ya está al día con `origin/main` (`git log origin/main..HEAD --oneline` vacío), dile al usuario que no hay nada pendiente y termina aquí — no fuerces un commit ni un deploy vacíos.

Si hay cambios de una sesión anterior sin commitear, inclúyelos igualmente en el paso 3: el objetivo es que todo lo que exista en el árbol de trabajo acabe subido, no solo lo de "ahora mismo".

## 2. Comprobaciones antes de subir nada

Este es el paso que de verdad importa: nunca subas ni despliegues código que no compila o no pasa el lint, porque eso rompería la web para las ~30 personas que la usan.

```bash
PATH="/Users/alejandromunozdelamorena/.nvm/versions/node/v24.15.0/bin:$PATH" npx tsc --noEmit
PATH="/Users/alejandromunozdelamorena/.nvm/versions/node/v24.15.0/bin:$PATH" npm run lint
```

Si cualquiera de los dos falla, para aquí, enséñale al usuario los errores tal cual salen, y no sigas con el commit/push/deploy hasta que estén arreglados (arréglalos tú si es evidente cómo, o pregunta si no lo es).

## 3. Commit

```bash
git add -A
git status --short   # revisa qué se va a commitear antes de seguir
```

Antes de commitear, mira la lista: si aparece algo que no debería estar ahí (por ejemplo un fichero de credenciales, algo dentro de `data/`, o un `.env*`) — no debería pasar porque `.gitignore` ya los excluye, pero si lo ves, para y avisa en vez de commitearlo.

Escribe un mensaje de commit que resuma de verdad el cambio (no algo genérico tipo "update"), mirando el diff. Sigue el estilo de los commits ya existentes en este repo: un resumen corto en la primera línea, cuerpo opcional explicando el porqué si el cambio no es obvio. Termina siempre el mensaje con:

```
Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
```

```bash
git commit -m "$(cat <<'EOF'
<resumen del cambio aquí>

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

## 4. Push a GitHub

```bash
git push origin main
```

## 5. Despliega a Vercel producción

No dependas solo del auto-deploy de GitHub — puede que todavía no esté conectado, o que el usuario quiera el deploy ya mismo sin esperar al webhook. Despliega explícitamente:

```bash
cd /Users/alejandromunozdelamorena/Documents/CLAUDE/gssa151-web
PATH="/Users/alejandromunozdelamorena/.nvm/versions/node/v24.15.0/bin:$PATH" npx vercel --prod
```

Esto vuelve a compilar y desplegar en Vercel usando las variables de entorno que ya están configuradas allí (Turso incluido) — no hace falta pasarle nada más. Si el comando pide login (no debería, la CLI ya está autenticada en esta máquina), avisa al usuario en vez de intentar autenticarte tú.

## 6. Verifica que el deploy quedó bien

No des el deploy por bueno solo porque el comando terminó sin error — comprueba que la web responde de verdad:

```bash
curl -s -o /dev/null -w "%{http_code}" https://gssa151-web.vercel.app/
curl -s -o /dev/null -w "%{http_code}" https://gssa151-web.vercel.app/parrillas
```

Ambos deberían devolver `200`. Si alguno falla, revisa el log del deploy (`npx vercel inspect <url-del-deploy>` o el enlace "Inspect" que imprime el propio `vercel --prod`) antes de decirle al usuario que todo salió bien.

## 7. Resume al usuario

Cierra con un resumen corto en español:
- Qué se subió (el resumen del commit, no el diff entero).
- Confirmación de que GitHub, Vercel y Turso quedaron sincronizados — y recuérdale, si es la primera vez que lo preguntas o parece que no lo tiene claro, que la base de datos no necesita ningún paso manual porque se automigra sola en el primer request tras el deploy.
- El enlace de producción: https://gssa151-web.vercel.app

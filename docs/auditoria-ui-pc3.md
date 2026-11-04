# Auditoría de interfaz — PC 3

**Commit revisado:** `e9132b7bfc90345e68aac18778b906a453521160` (`develop`, «feat(dossier): buscar alumno y empresa por nombre o correo al crear un dossier», 29 oct 2026).
**Fecha de la revisión:** 30 oct 2026.
**Alcance:** los cinco roles (alumno, profe, empresa, instituto, generalitat) y el acceso, en móvil estrecho y web, con tema claro y oscuro.
**Rama:** `docs/pc3-auditoria-ui`, en una copia de trabajo aparte. No se ha modificado código, dependencias, datos demo ni migraciones.

> Esta auditoría es solo de lectura: cualquier arreglo se propone, no se aplica. Al contrastarla con los cambios de Claude (facilidades de uso) y de Codex (exportaciones) hay que volver a comprobar los hallazgos que toquen las mismas pantallas.

---

## 1. Cómo se ha revisado

- App servida desde la copia de trabajo de este mismo commit (`npx expo start --web --port 8082`).
- Navegador: Edge (Chromium) controlado con Playwright, con `localStorage['kampus.esquema']` en `light` o `dark`.
- Tamaños: **390 × 844** (móvil estrecho) y **1440 × 900** (web). Además, barrido de anchos 320 / 360 / 390 / 430 / 600 / 768 / 1024 / 1440 para localizar el punto de ruptura del hallazgo H1.
- Rutas capturadas en las 4 combinaciones (rol × ancho × tema): **84 capturas** de Inicio, Calendario/Seguimiento, Validaciones, Chat y Perfil más Registro del alumno. **32 capturas** más de pantallas secundarias: valorar un mes, ficha del dossier, hilo de chat, incidencias, gestión del centro, nueva incidencia.
- Además de la revisión visual, en cada pantalla se midió en el DOM:
  - desbordamiento horizontal (`scrollWidth` frente a `innerWidth`) y elementos que sobresalen;
  - texto recortado (`clientWidth` < `scrollWidth` con desbordamiento oculto);
  - tamaño real de todo control interactivo;
  - nombre accesible de cada control e imágenes sin `alt`;
  - contraste WCAG 2.1 de cada texto, componiendo los fondos translúcidos hasta el opaco;
  - foco por teclado (Tab) y visibilidad del anillo de foco, con captura del recorte.

**Límite importante:** el «móvil» es un viewport estrecho de la web, no la app nativa. Todo lo que se dice de tamaños, corte de texto y contraste aplica a lo que se ve en pantalla; los gestos nativos, el teclado del sistema y los lectores de pantalla iOS/Android (VoiceOver, TalkBack) **no** se han podido probar aquí.

---

## 2. Resumen

| #   | Hallazgo                                                                                                                   | Roles                                 | Tamaños | Gravedad |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------- | -------- |
| H1  | La barra superior no cabe por debajo de 600 px: el logotipo sale de pantalla y aparece scroll horizontal en toda la página | todos                                 | 320–430 | **Alta** |
| H2  | El anillo de foco del teclado desaparece en tema oscuro                                                                    | todos                                 | web     | **Alta** |
| H3  | El azul de marca usado como texto no llega a 4,5:1 en oscuro (8 casos en 5 pantallas)                                      | todos (chat), alumno, empresa         | ambos   | **Alta** |
| H4  | Las pastillas de eventos del calendario se cortan («Entr…») en todos los anchos                                            | alumno, profe, instituto, generalitat | ambos   | Media    |
| H5  | Nueve tipos de control por debajo de los 44 px del sistema de diseño                                                       | alumno, empresa                       | ambos   | Media    |
| H6  | Las pestañas web se anuncian como `tab` sin `aria-selected` ni panel y no responden a las flechas                          | todos                                 | web     | Media    |
| H7  | El orden de tabulación pone la cabecera al final: 22 tabulaciones para llegar a las pestañas en Inicio                     | todos                                 | web     | Media    |
| H8  | «1 alumnos sin profe asignado» (singular con plural)                                                                       | instituto, generalitat                | ambos   | Baja     |
| H9  | Enviar el acceso vacío responde «Email o contraseña incorrectos» sin señalar el campo ni decir qué hacer                   | todos                                 | ambos   | Baja     |
| H10 | «Progreso por alumno» dibuja las barras escaladas al máximo y no al 100 %, con etiquetas en %                              | instituto, generalitat                | ambos   | Baja     |

Preferencias visuales (no son fallos): sección 4.

---

## 3. Hallazgos comprobados

### H1. La barra superior desborda por debajo de 600 px y arrastra toda la página

- **Pantalla y rol:** todas, con sesión iniciada. Como ejemplo, Inicio del alumno.
- **Tamaño:** 390 × 844 (móvil estrecho) y web estrecha; reproducible de 320 a 430 px. A 600 px ya encaja.
- **Pasos:** entrar como `alumno@kampus.test` / `kampus` → Inicio (390 × 844).
- **Evidencia:** [`01-barra-inicio-390x844-claro.png`](auditoria-ui-pc3/01-barra-inicio-390x844-claro.png). El contenido ocupa 390 px y a la derecha quedan 102 px de hueco muerto; la cabecera empieza directamente en «Inicio», sin logotipo visible. Medido:

  | Ancho de ventana | `scrollWidth` | Contenedor de la barra | Inicio del logotipo | Fin de «Registrar hoy» |
  | ---------------- | ------------- | ---------------------- | ------------------- | ---------------------- |
  | 320              | 457           | 594                    | −137                | 457                    |
  | 360              | 477           | 594                    | −117                | 477                    |
  | 390              | 492           | 594                    | −102                | 492                    |
  | 430              | 512           | 594                    | −82                 | 512                    |
  | 600              | 600           | 594                    | 3                   | 597                    |
  | 1440             | 1440          | 1200                   | 120                 | 1320                   |

- **Resultado actual:** el contenedor interior de la barra mide siempre 594 px de ancho mínimo y, al estar centrado dentro de una barra de 390 px, se sale 102 px por cada lado. Eso deja el logotipo completamente fuera de pantalla (los otros roles muestran «MPUS» recortado) y provoca scroll horizontal en toda la pantalla. Al pulsar «Registrar hoy» el navegador desplaza la página 102 px a la derecha: el resto de la pantalla queda descuadrada hasta que se vuelve a subir.
- **Resultado esperado:** a cualquier ancho, sin scroll horizontal, con el logotipo (o su K) visible y las cinco acciones accesibles sin scroll.
- **Gravedad:** alta. Afecta a todas las pantallas en móvil y en cualquier web estrecha, y rompe la primera impresión de la app.
- **Propuesta:**
  1. Añadir un punto de ruptura en la barra: por debajo de ~640 px, mostrar solo la K del logotipo (ya existe el recorte `ANCHO_MARCA` y su animación al bajar), reducir el relleno horizontal de las pestañas y, si aun así no cabe, dejar que la barra se desplace en horizontal (`overflow-x: auto`, sin barra visible) en lugar de desbordar la página.
  2. Pasar el ancho disponible al componente con `useWindowDimensions()` y calcular el contenido de la barra a partir de él; hoy el ancho está fijado por el contenido.
  3. Como red de seguridad, `overflow-x: hidden` en el contenedor de la app no arregla la causa: el `minWidth` de los botones seguiría empujando. Conviene arreglar el reparto de anchos.
- **Archivos:** `src/ui/components/app-tabs.web.tsx` (`styles.tabListContainer`, `styles.innerContainer`, `TabButton`, `BotonDestacado`). Es de PC 3.

### H2. El foco del teclado desaparece en tema oscuro

- **Pantalla y rol:** cualquiera con sesión; comprobado en Perfil del alumno y en Inicio.
- **Tamaño:** web 1440 × 900.
- **Pasos:** entrar como alumno → tema oscuro → pulsar `Tab` hasta el botón «Cambiar a modo claro». Repetir en tema claro.
- **Evidencia:** [`03-foco-claro.png`](auditoria-ui-pc3/03-foco-claro.png) (anillo oscuro visible sobre el fondo crema) frente a [`04-foco-oscuro.png`](auditoria-ui-pc3/04-foco-oscuro.png) (no se ve ningún anillo). El estilo calculado es `outline: rgb(16, 16, 16) auto 1px` en los dos temas, sobre un fondo `#141312`.
- **Resultado actual:** el navegador dibuja el anillo de foco por defecto en casi negro. Sobre el fondo oscuro queda prácticamente invisible: quien navega con teclado pierde la referencia de dónde está. Afecta a todos los controles (pestañas, botones, celdas del calendario, campos), porque ninguno define su propio foco.
- **Resultado esperado:** un anillo de foco visible en ambos temas, con al menos 3:1 frente al fondo adyacente y sin depender del color solo.
- **Gravedad:** alta (WCAG 2.4.7 Foco visible).
- **Propuesta:** definir el foco una sola vez en `src/ui/theme/global.css`:
  ```css
  :focus-visible {
    outline: 2px solid var(--kampus-foco);
    outline-offset: 2px;
  }
  ```
  con `--kampus-foco` claro `#2563EB` y oscuro un azul claro (`#7BA3F7`, 7,4:1 sobre `#141312`). Alternativa sin variables: una regla `@media (prefers-color-scheme: dark)`. Ojo: el tema de la app se elige en `localStorage`, no con `prefers-color-scheme`, así que lo más robusto es que el tema escriba la variable en `document.documentElement` (una línea al cambiar de esquema en `src/ui/estado/preferencias-web.ts`).
- **Archivos:** `src/ui/theme/global.css`, `src/ui/theme/theme.ts` (token nuevo), `src/ui/estado/preferencias-web.ts` (publicar la variable). PC 3.

### H3. El azul de marca como texto no llega a 4,5:1 en tema oscuro

- **Pantalla y rol:** Perfil del alumno («Mostrar» del DNI), Registro del día («Ver calendario», «Copiar horas del 26 oct 2026»), Validaciones de la empresa («Validar ›»), Chat («hace 1 h», «hace 45 min»), buscador y selector de fecha («Cambiar», botones de texto).
- **Tamaño:** 390 × 844 y 1440 × 900, tema oscuro.
- **Pasos:** entrar en tema oscuro y abrir cada pantalla. Los textos en azul sobre tarjeta oscura se leen peor que el resto.
- **Evidencia:** contraste medido sobre el color real de cada texto:

  | Elemento                       | Color / fondo             | Contraste  | Mínimo |
  | ------------------------------ | ------------------------- | ---------- | ------ |
  | «Mostrar» (Perfil)             | `#2563EB` sobre `#1E1D1B` | **3,26:1** | 4,5    |
  | «Validar ›» (Validaciones)     | `#2563EB` sobre `#1E1D1B` | **3,26:1** | 4,5    |
  | «Ver calendario» (Registro)    | `#2563EB` sobre `#1E1D1B` | **3,26:1** | 4,5    |
  | «Copiar horas del 26 oct 2026» | `#2563EB` sobre `#1E1D1B` | **3,26:1** | 4,5    |
  | «hace 1 h» (Chat)              | `#2563EB` sobre `#1E1D1B` | **3,26:1** | 4,5    |
  | «hace 45 min» (Chat)           | `#2563EB` sobre `#1E1D1B` | **3,26:1** | 4,5    |

  En claro el mismo azul da 4,91:1 sobre `surface` y 4,69:1 sobre el fondo (pasa, justo), pero **4,45:1 sobre `subtle`**, así que también está al límite en las tarjetas hundidas.

- **Resultado actual:** el tema tiene un único `primary` que sirve de relleno (botón, pestaña activa) y de color de texto. Como relleno el azul es correcto (blanco encima); como texto sobre superficie oscura se queda corto y la lectura empeora justo en los enlaces y las horas del chat.
- **Resultado esperado:** los textos con acento superan 4,5:1 en los dos temas y en las tres superficies (`background`, `surface`, `subtle`).
- **Gravedad:** alta (WCAG 1.4.3). Es el fallo más repetido: 8 apariciones en 5 pantallas.
- **Propuesta:** añadir un token de acento **para texto** separado del de relleno, por ejemplo `primaryTexto`:
  - claro: `#2563EB` (y, si se quiere pasar también sobre `subtle`, `#1D4ED8`, 5,1:1);
  - oscuro: `#7BA3F7` (6,76:1 sobre `#1E1D1B`, 7,44:1 sobre `#141312`, 5,89:1 sobre `#2A2826`).

  Después, cambiar solo donde el azul es texto: `src/ui/vistas/perfil.tsx:452`, `src/ui/vistas/registro-dia.tsx:347` y `:394`, `src/ui/vistas/validaciones.tsx:200`, `src/ui/vistas/chat-directo.tsx:273`, `src/ui/components/buscador.tsx:72`, `src/ui/components/selector-fecha.tsx:177`. El relleno (`backgroundColor: theme.primary`) se queda como está.

- **Reparto:** el token lo tiene que crear PC 1/PC 2 si `theme.ts` no lo cierra PC 3; las vistas son PC 2 (y PC 3 el componente).

### H4. Las pastillas de eventos del calendario se cortan

- **Pantalla y rol:** Calendario del alumno; también en el calendario grande de profe, instituto y generalitat.
- **Tamaño:** todos. 390 × 844 y 1440 × 900.
- **Pasos:** Calendario → octubre 2026 → día 20 (entrega) y día 23.
- **Evidencia:** [`02-calendario-390x844-claro.png`](auditoria-ui-pc3/02-calendario-390x844-claro.png): en las celdas 20 y 23 se lee «Entr…». Medido: en 390 la pastilla mide 47 px y su texto completo más de 100; en 1440 la pastilla mide 151 px y el texto 235 px, así que se corta igual.
- **Resultado actual:** el texto del evento va con `numberOfLines={1}` dentro de una celda de 46 px, de modo que se ve «Entr…». Es información incomprensible y, al ser un texto a medias, parece un error de la app. El nombre completo sí está en la etiqueta accesible de la celda («20 oct 2026: Sin apuntar. Entrega: Subir la memoria de la primera quincena»).
- **Resultado esperado:** en la rejilla se ve un indicador (punto o icono de entrega) y el título completo al abrir el día, o el título solo a partir del ancho en el que cabe entero.
- **Gravedad:** media.
- **Propuesta:** sustituir la pastilla con texto por un punto con color + el texto completo en la etiqueta accesible, y mostrar el título bajo la rejilla en la agenda de «Próximas fechas»; o, si se prefiere mantener la pastilla, `numberOfLines={2}` y un ancho mínimo de 44 px… pero a 46 px de celda no cabe, así que la primera opción es la realista.
- **Archivos:** `src/ui/vistas/calendario-mes.tsx` (bloque `delDia.map` → `styles.pastilla`), `src/ui/components/celda-calendario.tsx`. PC 2 / PC 3.

### H5. Nueve tipos de control por debajo de los 44 px del sistema de diseño

- **Pantalla y rol:** alumno y empresa, en móvil y web.
- **Tamaño:** 320–1440.
- **Pasos:** medir el rectángulo de cada control interactivo en caliente (script de auditoría); se listan los que quedan por debajo de 44 en alto o en ancho.
- **Evidencia:**

  | Control                                             | Pantalla               | Tamaño medido                         |
  | --------------------------------------------------- | ---------------------- | ------------------------------------- |
  | Celda del mini calendario                           | Inicio del alumno      | 46 × **36** (390) · 36 × **36** (320) |
  | Celda del calendario                                | Calendario             | 46 × 76 y **36** × 76 (320)           |
  | «Mes anterior», «Ir al mes de hoy», «Mes siguiente» | Calendario             | 44 × **40**                           |
  | «Ver calendario»                                    | Inicio del alumno      | 98 × **32**                           |
  | «Copiar horas del 26 oct 2026»                      | Registro del día       | 324 × **32**                          |
  | «Validar ›»                                         | Validaciones (empresa) | **20** px de alto                     |
  | «Ver ficha ›», «Valorar meses ›»                    | Inicio de la empresa   | **20** px de alto                     |
  | «Abrir chat ›»                                      | Inicio de la empresa   | **20** px de alto                     |
  | Celdas del calendario a 320 px                      | Calendario             | **36** px de ancho                    |

- **Resultado actual:** el sistema de diseño pide 44 px mínimos y los controles principales de fichaje (las celdas del calendario) no los cumplen en el móvil, que es justo donde más se pulsan. En 320 px las celdas además encogen por debajo del `minWidth: 44` de `CeldaCalendario`, porque `flexBasis: 40` con `flexShrink` por defecto las comprime.
- **Resultado esperado:** todo objetivo táctil de 44 × 44 como mínimo, sin que el calendario deje de caber (7 × 44 + huecos = 332 px, cabe en 358 disponibles a 390).
- **Gravedad:** media.
- **Propuesta:**
  1. En `CeldaCalendario`, `flexShrink: 0` y `flexBasis: 'auto'` con `minWidth: 44`, y reducir el hueco entre celdas en móvil en lugar del ancho.
  2. Añadir `minHeight: 44` a los enlaces de texto (`Enlace`, «Ver calendario», «Copiar horas») o envolverlos en un `Pressable` con `hitSlop`; hoy `hitSlop={8}` en `Enlace` no cambia el área declarada y en web no amplía el `hitbox` de un elemento en línea.
  3. Subir a 44 × 44 los tres botones de mes del calendario.
- **Archivos:** `src/ui/components/celda-calendario.tsx`, `src/ui/vistas/registro-dia.tsx`, `src/ui/vistas/calendario-mes.tsx`, `src/ui/vistas/panel-empresa.tsx` (`Enlace`), `src/ui/vistas/validaciones.tsx`.

### H6. Las pestañas web son `tab` sin estado ni teclado de pestañas

- **Pantalla y rol:** todas, barra superior web.
- **Tamaño:** web 1440 × 900.
- **Pasos:** enfocar «Inicio» y pulsar `→`; inspeccionar los atributos de las pestañas.
- **Evidencia:** las cuatro pestañas tienen `role="tab"` pero **ninguna** lleva `aria-selected` (el `accessibilityState={{ selected }}` del `TabButton` no llega al DOM), no hay `aria-controls`, la pantalla **no contiene ningún `role="tabpanel"`** y `→` no mueve el foco (`url` sigue en `/perfil`).
- **Resultado actual:** el lector de pantalla anuncia «pestaña» sin decir cuál está activa, y quien navega con teclado espera el patrón de pestañas (flechas para cambiar, tabulación para salir del grupo). Las pestañas se comportan como enlaces (bien: `Enter` navega), pero se anuncian como otra cosa.
- **Resultado esperado:** o se completa el patrón ARIA de pestañas (`aria-selected`, `aria-controls`, panel y flechas) o se anuncian como enlaces con `aria-current="page"`, que es lo que son.
- **Gravedad:** media.
- **Propuesta:** la segunda opción es más barata y honesta: `accessibilityRole="link"` + `aria-current={isFocused ? 'page' : undefined}` en `TabButton`, y `role="tablist"` fuera (o quitarlo). Si se quiere el patrón completo, hay que añadir `aria-selected` a mano y gestionar `←`/`→`/`Home`/`End`.
- **Archivos:** `src/ui/components/app-tabs.web.tsx`. PC 3.

### H7. El orden de tabulación deja la cabecera para el final

- **Pantalla y rol:** todas, web. Ejemplo: Inicio del alumno.
- **Tamaño:** web 1440 × 900.
- **Pasos:** cargar Inicio y pulsar `Tab` veinte veces; anotar el orden.
- **Evidencia:** el orden real es: contenido (denuncia de días sin apuntar, «Ver calendario», y las 22 celdas del calendario) y **después** logotipo, Inicio, Calendario, Chat, Perfil, «Cambiar a modo oscuro» y «Registrar hoy». En Perfil la cabecera llega en la décima tabulación, después de todos los campos y botones. El `TabSlot` se renderiza antes que el `TabList` en el DOM, y la barra va con `position: absolute` en la parte de arriba.
- **Resultado actual:** quien navega con teclado tiene que atravesar la pantalla entera para llegar al menú, que es lo primero que ve. En Inicio son 22 paradas de celdas de calendario.
- **Resultado esperado:** el orden de foco sigue el orden visual (WCAG 2.4.3): primero la barra y después el contenido.
- **Gravedad:** media. No añadir un enlace «saltar al contenido» no es excusa: el problema es que el orden está invertido.
- **Propuesta:** renderizar `TabList` antes de `TabSlot` en `AppTabs` y colocar la barra con `position: fixed`/`sticky` en lugar de `absolute`, para que el orden del DOM y el visual coincidan (`<TabList>` primero, luego el contenido). Si expo-router/ui exige el orden actual, la alternativa es un enlace «Saltar al contenido» como primer elemento enfocable.
- **Archivos:** `src/ui/components/app-tabs.web.tsx`. PC 3.

### H8. «1 alumnos sin profe asignado»

- **Pantalla y rol:** Centro (instituto) y Seguimiento (generalitat).
- **Tamaño:** cualquiera.
- **Pasos:** entrar como `instituto@kampus.test` → «Gestionar el centro».
- **Evidencia:** [`05-centro-390x844-oscuro.png`](auditoria-ui-pc3/05-centro-390x844-oscuro.png), chip bajo «El centro en cifras», y el mismo texto repetido en la tarjeta «Alumnos (2)».
- **Resultado actual:** con un solo alumno sin profe se lee «1 alumnos sin profe asignado».
- **Resultado esperado:** «1 alumno sin profe asignado» / «2 alumnos sin profe asignado».
- **Gravedad:** baja, pero es texto visible en la pantalla de gestión del centro.
- **Propuesta:** helper de plural (`plural(n, 'alumno', 'alumnos')`) y usarlo en los dos sitios; conviene aprovecharlo también para «1 cuentas nuevas» si se diera el caso.
- **Archivos:** `src/ui/vistas/panel-instituto.tsx` (`CifrasCentro` y `TarjetaAlumnos`). PC 2.

### H9. El acceso vacío responde «Email o contraseña incorrectos»

- **Pantalla y rol:** acceso, sin sesión.
- **Tamaño:** 390 × 844 y 1440 × 900, claro y oscuro.
- **Pasos:** abrir la app y pulsar «Entrar» sin escribir nada.
- **Evidencia:** captura del estado con campos vacíos: aparece el mismo aviso rojo que con credenciales erróneas. Medido: el aviso es un `role="alert"` con `aria-live="assertive"` (bien), pero ningún campo queda marcado (`aria-invalid` ausente) y el foco no se mueve al primero que falta.
- **Resultado actual:** el mensaje no explica qué ha pasado (los campos están vacíos, no mal escritos) ni qué hacer. Quien usa lector de pantalla oye el aviso pero no sabe a qué campo volver.
- **Resultado esperado:** «Escribe tu correo y tu contraseña» con el foco en «Correo»; y, si de verdad son incorrectas, «El correo o la contraseña no son correctos. Revísalos y vuelve a intentarlo.».
- **Gravedad:** baja.
- **Propuesta:** validar en `VistaLogin` antes de llamar al caso de uso (campos vacíos → aviso propio y foco al primero) y marcar `aria-invalid`/borde de error en el `Campo` afectado. El texto genérico está en `src/core/domain/errores.ts:3`, que es de PC 1: desde PC 2/PC 3 solo se puede envolver el mensaje.
- **Archivos:** `src/ui/vistas/login.tsx`, `src/ui/components/campo.tsx` (soporte de `error`), `src/core/domain/errores.ts` (PC 1).

### H10. «Progreso por alumno» escala al máximo, no al 100 %

- **Pantalla y rol:** Seguimiento del instituto y de la generalitat.
- **Tamaño:** ambos.
- **Pasos:** Inicio del instituto → tarjeta «Resumen» → «Progreso por alumno».
- **Evidencia:** con dos alumnos al 40 % y al 55 %, la barra del 40 % ocupa el 73 % de la altura (40/55) y la del 55 % ocupa el 100 %. Las etiquetas encima dicen «40 %» y «55 %».
- **Resultado actual:** las barras se normalizan al máximo de la serie (`GraficoBarras`: `height = valor / maximo`), pero el rótulo es el porcentaje real y el fondo gris de la pista se lee como «lo que falta para el 100 %». La comparación entre alumnos funciona; la lectura del valor absoluto, no.
- **Resultado esperado:** o las barras llegan al 100 % de la pista cuando el valor es 100, o la etiqueta deja de ser un porcentaje (por ejemplo, las horas). Que el gráfico no mienta.
- **Gravedad:** baja (es un gráfico de comparación), pero es dato mal representado y aparece en dos roles.
- **Propuesta:** añadir a `GraficoBarras` un `maximo` opcional (aquí `100`) y usarlo; la comparación se mantiene.
- **Archivos:** `src/ui/components/grafico-barras.tsx`, `src/ui/vistas/panel-instituto.tsx`, `src/ui/vistas/seguimiento-profe.tsx`. PC 3 / PC 2.

---

## 4. Preferencias visuales (no son fallos)

Estas no incumplen nada; se apuntan por si el equipo quiere afinarlas. Van separadas para que no se mezclen con los fallos al priorizar.

- **P1. La lista de conversaciones de la web es muy estrecha.** A 1440 px la columna mide ~355 px y el título se corta a los ~190 px («No me han dado acceso a…») mientras el panel derecho está casi vacío. Con más ancho para la lista (o el título en dos líneas) se leerían los asuntos enteros. `src/ui/vistas/chat.tsx`, `styles.columnaLista`.
- **P2. Hueco vacío en el Seguimiento de la web.** La columna izquierda (alumnos) termina mucho antes que la derecha, y en 1440 quedan ~500 px de vacío. No es un fallo de adaptación; es reparto de columnas.
- **P3. Títulos de incidencia a una línea en móvil.** «No me han dado acceso al r…» con sitio de sobra en la fila. Dos líneas en móvil darían el asunto completo. `src/ui/vistas/chat.tsx`, `FilaConversacion`.
- **P4. Copy de la valoración.** «Todos los meses acabados están valorados» se muestra junto a un mes seleccionable (octubre), que aún no ha acabado. Es correcto, pero invita a dudar de si se puede valorar o no.

---

## 5. Patrones repetidos: arreglos que van a un componente compartido

Estos cuatro arreglos, hechos una vez, cierran la mayoría de los hallazgos:

| Patrón                                                                                           | Dónde se corrige                                   | Hallazgos que cierra |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------- | -------------------- |
| Un `primary` para relleno y otro `primaryTexto` para texto, con contraste ≥ 4,5 en los dos temas | `theme.ts` + los seis usos de texto                | H3                   |
| Regla global de `:focus-visible` con color de anillo por tema                                    | `global.css` (+ variable desde `preferencias-web`) | H2                   |
| Objetivo táctil mínimo 44 × 44 en un único sitio (`Boton`, `Enlace`, celdas, botones de mes)     | `boton.tsx`, `celda-calendario.tsx`, `Enlace`      | H5                   |
| Barra superior sensible al ancho (una sola vez)                                                  | `app-tabs.web.tsx`                                 | H1, y ayuda a H6/H7  |

Lo mismo con la legibilidad de las etiquetas cortas: el corte por `numberOfLines={1}` aparece en calendario, chat y avisos; conviene decidir una regla («una línea solo en listas largas, nunca en el dato principal») y aplicarla desde los componentes.

---

## 6. Revisado y correcto (para no volver a reportarlo)

Comprobado en este commit; **no** hace falta tocarlo:

- **Contraste en claro:** todos los textos superan 4,5:1 salvo el azul señalado en H3. Los estados de las celdas del calendario (número y horas sobre `fondoTrabajo`, `fondoAusencia`, etc.) pasan holgados en los dos temas.
- **Estados nunca solo por color:** los `Chip` llevan siempre el texto del estado («Pendiente», «Positiva», «Abierta») y el punto va `aria-hidden`; el calendario añade forma (discontinuo = sin apuntar) además del color; la leyenda del gráfico tiene texto.
- **Mensajes de error:** `Mensaje` usa `role="alert"` y `aria-live="assertive"`; los avisos del chat («Escribe un mensaje antes de enviar.») y de valoración («Elige el mes y la valoración») explican qué falta.
- **Campos:** `Campo` asocia etiqueta visible con `accessibilityLabelledBy`/`aria-label`, con `placeholder` de ejemplo y ayuda opcional. Ningún `input` sin nombre.
- **Botones e iconos:** ningún control sin nombre accesible; el botón de tema, el logo y los botones de mes tienen etiqueta. No hay imágenes sin `alt`.
- **Interruptor de avisos:** es una fila `role="switch"` de 770 × 44 con `aria-checked`, nombre y Espacio/Intro funcionando; el dibujo interior va `aria-hidden` y **no** es una parada de tabulación (se comprobó: `Tab` desde la fila va directo a «Mostrar DNI»). El aviso de «input sin nombre» del primer barrido era un falso positivo.
- **Estados de carga, vacío y error:** existen y se usan de forma consistente (`EsqueletoPanel`, `Cargando`, `EstadoVacio`, `ErrorCarga` con botón «Reintentar») en todas las vistas que cargan datos. El vacío del chat dice qué hacer («Todavía no hay mensajes. Escribe el primero.»).
- **Deshabilitado:** el botón «Sin cambios» del perfil lleva `aria-disabled="true"`, sale del orden de tabulación y se ve atenuado; el texto sigue legible.
- **Consistencia:** no hay colores hexadecimales sueltos fuera de `theme.ts`; los espacios y radios salen de `Spacing`/`Radius`; la tipografía es la misma en todas las pantallas.

---

## 7. Lo que no se ha podido comprobar

- **Esqueletos de carga y `ErrorCarga` en pantalla.** El backend en memoria responde al instante y no hay forma de forzar un fallo desde la interfaz; están revisados en código, no vistos en ejecución. Para verlos haría falta el adaptador de Supabase o simular un error en la capa de datos.
- **App nativa.** Este entorno solo levanta la web. Los tamaños y contrastes medidos deberían coincidir, pero el comportamiento táctil y los lectores VoiceOver/TalkBack no se han probado.
- **Zoom al 200 %.** No se ha probado; con H1 sin arreglar, el zoom empeora el desbordamiento.

Descartado como fallo: el cartel «Bundling…» que aparece en la primera compilación (solo en desarrollo) y el aviso de `useNativeDriver` en la consola (solo web de desarrollo). No afectan a lo que ve el usuario final.

---

## 8. Reparto de los arreglos

Ninguno de estos cambios se ha hecho: esta PR es solo documentación.

| PC       | Qué le toca                                                                                                                                                                  |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PC 3** | H1 y H7 (`app-tabs.web.tsx`), H2 (`global.css` + variable de tema), H3 en `buscador`, `selector-fecha` y el token de `theme.ts`, H5 en `celda-calendario.tsx` y `Enlace`     |
| **PC 2** | H3 en `perfil`, `registro-dia`, `validaciones` y `chat-directo`; H4 (`calendario-mes.tsx`), H8, H9 (validación en `login.tsx`), H10 en `panel-instituto`/`seguimiento-profe` |
| **PC 1** | Texto del error de credenciales (`core/domain/errores.ts`) si se quiere cambiar el mensaje desde el dominio                                                                  |

---

## 9. Cómo reproducirlo

1. `npx expo start --web` y abrir `http://localhost:8081`.
2. Entrar con cualquier cuenta demo (contraseña `kampus`): `alumno@`, `profe@`, `empresa@`, `instituto@`, `generalitat@kampus.test`.
3. Para el tema, botón de luna/sol en la barra superior (queda en `localStorage['kampus.esquema']`).
4. Para el tamaño, DevTools → modo responsive → 390 × 844 y 1440 × 900.
5. Para el foco, `Tab` desde el principio; para comprobar H1, mirar el `scrollWidth` del documento en la consola (`document.scrollingElement.scrollWidth` frente a `window.innerWidth`).

El guion de Playwright usado para medir fue temporal y no se incluye en el repositorio: no forma parte del producto y `e2e/` es de PC 4. Si se quiere repetir de forma automática, los cinco puntos de la sección 1 son la lista de comprobaciones que hacía.

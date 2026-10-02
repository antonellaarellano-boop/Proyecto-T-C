# 🎯 Baldecash · Talento & Cultura — Mapa de la arquitectura

Mapa operativo del sistema: qué módulos existen, dónde vive cada dato, qué rutas y
endpoints hay, y qué está construido pero todavía no es alcanzable desde la UI.

> **Alcance de este documento.** Es el *mapa*: inventario y ubicación de las cosas.
> El [`README.md`](README.md) es la *referencia*: fórmulas de KPIs, modelo de datos campo
> por campo, decisiones técnicas y troubleshooting. Si los dos se contradicen, manda el
> código — y corregí ambos.

Última revisión del mapa: **2 de octubre de 2026** · Último commit mapeado:
`feat: módulo Juegos de mesa (Supabase) + Sitios (walk-ins y ocupación por piso)`

---

## 1. Estado real de los módulos

| Módulo | Estado | Rutas en la UI | Fuente de datos |
|---|---|---|---|
| **Reclutamiento** | ✅ Productivo | `/dashboard`, `/candidatos`, `/pipeline`, `/vacantes`, `/fuentes`, `/rango-salarial`, `/tiempo-revision` | Airtable |
| **Engagement & Cultura** | ✅ Productivo | `/engagement`, `/engagement/gastos` | Airtable |
| **Bienestar & Salud** | ✅ Productivo | `/bienestar` | Airtable |
| **Pagos** | ✅ Productivo | `/pagos`, `/pagos/rhe` | Airtable |
| **Colaboradores** | ✅ Productivo | `/colaboradores` | Airtable (tabla de participantes de Engagement) |
| **Sitios** (reserva de escritorios) | ✅ Productivo | `/sitios`, `/sitios/anteriores` | Supabase externo (lectura) + KV propio |
| **Juegos de mesa** | ✅ Productivo | `/juegos` | Supabase externo (lectura) + KV propio |
| **Administración** | ✅ Productivo | `/actividad`, `/catalogos`, `/admin`, `/ajustes` | Redis / memoria |
| **Merch** | ⚠️ **Backend sin UI** | — *(removidas en el último commit)* | Airtable |
| **Reportes** | ⚠️ Removido | — | — |
| Onboarding · Desarrollo · Evaluación | 💤 No construido | comentados en `sidebar.tsx:74-76` | — |

### ⚠️ Merch: el backend sigue vivo, la UI no

Las páginas de Merch se eliminaron, pero **toda la trastienda quedó en pie y funcional**:

- 8 endpoints: `/api/merch/{orders,usages,expenses,product-types}` + sus `[id]`
- Stores: [`merch-store.ts`](app/src/lib/data/merch-store.ts),
  [`merch-seed.ts`](app/src/lib/data/merch-seed.ts),
  [`product-types-store.ts`](app/src/lib/data/product-types-store.ts)
- ~20 métodos en [`repository.ts`](app/src/lib/data/repository.ts) y su implementación en `airtable.ts`
- Tipos en `types.ts`: `PurchaseOrder`, `MerchUsage`, `MerchExtraExpense`, `MERCH_OCCASIONS`, `MERCH_EXPENSE_TYPES`
- 3 tablas de Airtable con datos reales

**Decisión tomada: se queda tal cual.** Para reactivar el módulo alcanza con volver a
crear las páginas bajo `app/src/app/dashboard/merch/` y descomentar sus ítems en el
sidebar — el backend responde hoy. No borrar nada de lo anterior.

---

## 2. Dónde vive cada dato

Hay **cuatro** orígenes distintos. Confundirlos es la causa más común de bugs al agregar
una función nueva.

| Origen | Qué guarda | Persistencia |
|---|---|---|
| **Airtable** (base `appGRC5rRH4m1I8g2`) | Toda la data operativa: candidatos, vacantes, etapas, fuentes, ingresos, rangos, tiempos de revisión, engagement, merch, bienestar, pagos, RHE | Permanente — fuente de verdad |
| **Upstash Redis** (Vercel KV) | Usuarios/auth, catálogos auxiliares, ocultaciones de juegos, walk-ins de sitios | Permanente si el KV está configurado |
| **Memoria** (`globalThis.__baldecash_*`) | Fallback de todo lo anterior cuando no hay KV, + `notifications` y `activity` **siempre** | ⚠️ Se pierde en cada reinicio / cold start |
| **Supabase externo** (×2, solo lectura) | Reservas de escritorios (Desk Buddy) y reservas de juegos de mesa | Pertenece a otras apps — **nunca** escribimos ahí |

**Regla del selector.** `DATA_SOURCE=airtable` activa `AirtableRepository`;
`DATA_SOURCE=mock` activa `MockRepository`. Si falta `AIRTABLE_TOKEN` o
`AIRTABLE_BASE_ID`, [`env.ts`](app/src/lib/env.ts) **cae silenciosamente a mock** y deja un
warning en consola. Si ves datos de prueba sin explicación, revisá eso primero.

**Regla de los módulos externos.** Sitios y Juegos leen apps ajenas. Lo que el sistema
agrega encima (asistencia, walk-ins, reservas ocultas) es **dato propio** guardado en
KV/memoria y nunca viaja de vuelta al origen. "Eliminar" una reserva de juegos oculta la
fila acá, no la borra en Supabase, y es reversible.

### Tablas de Airtable (IDs hardcodeados en `airtable.ts`)

| Dominio | Tabla | Table ID |
|---|---|---|
| Catálogos | Seniorities | `tbly6jLyGh0zn1J4N` |
| Catálogos | Hiring Managers | `tblvkjugKSzAqwpss` |
| Engagement | Áreas | `tblUiFvvq0qOcyK7r` |
| Engagement | Eventos | `tbldSZKz185oQnQLM` |
| Engagement | Colaboradores / participantes | `tbl0Dajc7XNSr73Nb` |
| Engagement | Gastos | `tblhDLnl7wAq3zCEo` |
| Engagement | Gasto Eventos (catálogo) | `tbll09qOICsGOUxIk` |
| Merch | Órdenes de compra | `tblIqM8tp5ibN8AJv` |
| Merch | Usos | `tblN3gW1GfgYtyM3E` |
| Merch | Gastos extra | `tblEfxWHje0xMJYI7` |
| Bienestar | Exámenes médicos | `tbl8TGQOE2JAR0c28` |
| Pagos | Pagos fijos | `tblX3EuRiGsY72tSS` |
| Pagos | RHE | `tblzGSgMmOXBUEdA1` |
| Sitios | Asistencia | `tbleLMLKC6Xti4AHl` |

Las tablas del core de Reclutamiento (Candidatos, Vacantes, Etapas, Fuentes, Ingresos,
Rango salarial, Tiempo de revisión) se resuelven **por nombre** vía variables de entorno,
no por ID. El mapeo campo-dominio ↔ campo-Airtable está centralizado en la constante `F`
de [`airtable.ts`](app/src/lib/data/airtable.ts) (línea ~100).

---

## 3. Estructura del repositorio

```
SISTEMA T&C/
├── app/                          ← la aplicación Next.js
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/           login · forgot-password
│   │   │   ├── api/              22 grupos de endpoints REST
│   │   │   └── dashboard/        20 páginas + _components/
│   │   ├── components/
│   │   │   ├── ui/               14 primitivas sobre Radix
│   │   │   ├── dashboard/        charts y tablas de dominio
│   │   │   ├── auth/             role-context
│   │   │   └── brand/            logo · loader
│   │   ├── lib/
│   │   │   ├── data/             repositorio + stores + seeds
│   │   │   ├── auth/             sesión JWT
│   │   │   ├── sitios/           cliente Supabase Desk Buddy
│   │   │   ├── juegos/           cliente Supabase juegos
│   │   │   ├── types.ts          todos los tipos y catálogos del dominio
│   │   │   ├── env.ts            variables de entorno centralizadas
│   │   │   ├── export.ts         Excel / PDF
│   │   │   └── utils.ts
│   │   └── middleware.ts         guardia de auth y roles
│   ├── scripts/                  utilidades one-off de migración/carga
│   ├── .env.local                🔒 credenciales reales (gitignored)
│   └── .env.example              ⚠️ desactualizado — ver sección 8
├── Paleta_de_colores/
├── ARQUITECTURA_MODULOS.md       ← este archivo
└── README.md                     referencia completa (27 secciones)
```

### Páginas del dashboard

Cada ruta sigue el mismo patrón: `page.tsx` es un **Server Component** que carga datos vía
`getRepo()`, y delega la interacción a un **Client Component** hermano.

| Ruta | Client component | Peso |
|---|---|---|
| `/dashboard` | *(inline)* | 13 KB |
| `/dashboard/candidatos` | `candidates-page.tsx` | 36 KB |
| `/dashboard/pipeline` | *(inline)* + `pipeline-table` | 4 KB |
| `/dashboard/vacantes` | `vacancies-page.tsx` | 27 KB |
| `/dashboard/fuentes` | `sources-page.tsx` | 26 KB |
| `/dashboard/rango-salarial` | `salary-ranges-page.tsx` | 19 KB |
| `/dashboard/tiempo-revision` | `review-times-page.tsx` | 20 KB |
| `/dashboard/engagement` | `eventos-page.tsx` | 32 KB |
| `/dashboard/engagement/gastos` | `gastos-por-evento.tsx` | 29 KB |
| `/dashboard/bienestar` | `examenes-page.tsx` | 24 KB |
| `/dashboard/pagos` | `pagos-fijos-table.tsx` | 37 KB |
| `/dashboard/pagos/rhe` | `rhe-table.tsx` | 38 KB |
| `/dashboard/colaboradores` | `colaboradores-page.tsx` | 22 KB |
| `/dashboard/sitios` | `sitios-client.tsx` + `walkins.tsx` | 22 KB |
| `/dashboard/sitios/anteriores` | `anteriores-client.tsx` | 6 KB |
| `/dashboard/juegos` | `juegos-client.tsx` + `juegos-charts.tsx` | 24 KB |
| `/dashboard/actividad` · `/catalogos` · `/admin` · `/ajustes` | varios | — |

Los módulos externos (`/sitios`, `/juegos`) tienen cada uno un `not-configured.tsx` que se
renderiza cuando faltan las credenciales, en lugar de romper.

**Componentes compartidos del shell:** `sidebar.tsx` (navegación con resaltado por match más
específico), `topbar.tsx`, `global-search.tsx` (Cmd/Ctrl+K), `notification-center.tsx`
(polling) y `shell-transition.tsx`.

> ⚠️ `components/dashboard/charts.tsx` pesa **77 KB** en un solo archivo. Es el principal
> candidato a dividirse si hay que tocarlo seguido.

---

## 4. Endpoints REST

Todos bajo `/api`, runtime Node.js. El patrón es constante: la ruta base hace `GET` (listar)
y `POST` (crear); la ruta `[id]` hace `PATCH` (editar) y `DELETE` (borrar).

**Reclutamiento** — `candidates` · `vacancies` · `movements` · `sources` · `ingresos` ·
`salary-ranges` · `review-times` · `catalogs/[type]`
**Engagement** — `engagement/{areas,events,participants,expenses,gasto-eventos}`
**Merch** *(sin UI)* — `merch/{orders,usages,expenses,product-types}`
**Bienestar** — `bienestar/examenes`
**Pagos** — `payments` · `rhe`
**Sitios** — `sitios` (GET) · `sitios/attendance` · `sitios/walkins` · `sitios/realtime-token` (GET)
**Juegos** — `juegos` (GET) · `juegos/hidden` · `juegos/realtime-config` (GET)
**Sistema** — `auth/{login,logout,me,forgot}` · `admin/users` · `dashboard` (GET) ·
`activity` (GET) · `notifications` · `sync` (POST) · `health` (GET)

**`catalogs/[type]`** acepta tres tipos: `seniorities`, `hiring-managers`, `recruiters`.

---

## 5. Autenticación y roles

Sesión **JWT HS256** firmada con `jose`, guardada en cookie httpOnly `bcrt_session`, TTL 8 h.

**Hay tres roles**, definidos en [`types.ts:5`](app/src/lib/types.ts):

| Rol | Puede |
|---|---|
| `admin` | Todo, incluido gestionar usuarios y catálogos |
| `recruiter` | Leer y escribir en todos los módulos operativos |
| `viewer` | **Solo lectura** — 403 en toda mutación |

> Los roles `manager` y `employee` que mencionaban versiones anteriores de este documento
> **no existen en el código**. "Hiring Manager" es un catálogo de personas, no un rol de acceso.

**Defensa en dos capas:**
1. [`middleware.ts`](app/src/middleware.ts) bloquea todo lo que no sea público, y restringe
   `/dashboard/admin` y `/api/admin` a `admin`.
2. Cada endpoint que muta revalida la sesión y responde `403` si el rol es `viewer`.
   La UI además esconde los botones, para que el viewer no vea opciones que van a fallar.

---

## 6. Puesta en marcha local

```powershell
cd "app"
npm install              # node_modules NO está en el repo
Copy-Item .env.example .env.local   # y completar — ver sección 8
npm run dev              # http://localhost:3000
```

Verificaciones: `npm run type-check` · `npm run lint` · `npm run build`
Diagnóstico en caliente: `GET /api/health` informa el origen de datos activo y el estado del KV.

**Caché de webpack en Windows.** Si aparecen 500 en todas las rutas con
`Cannot read properties of undefined`, parar el server, borrar `.next`
(`Remove-Item -Recurse -Force .next`) y volver a arrancar. Correr **una sola** instancia de
`next dev` por proyecto: varias comparten `.next` y lo corrompen. Por eso `next.config.mjs`
ya desactiva la caché en disco en modo dev.

---

## 7. Integraciones externas

| Integración | Credencial | Riesgo conocido |
|---|---|---|
| **Airtable** | Personal Access Token con `data.records:read/write` + `schema.bases:read` | Los writes usan `typecast: true`: un typo en la UI crea una opción nueva en el singleSelect |
| **Upstash Redis** | `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Sin KV, usuarios y datos auxiliares viven solo en memoria |
| **Supabase · Sitios** | Usuario y contraseña dedicados | ⚠️ Hoy usa una **cuenta personal** como cuenta de servicio. Si esa persona cambia su contraseña, Sitios deja de leer |
| **Supabase · Juegos** | Anon key (RLS de SELECT público) | Ninguno — no requiere usuario |

El token de Realtime de Sitios se emite server-side y es de vida corta: el navegador nunca
ve la contraseña ni el refresh token.

---

## 8. Deuda técnica conocida

Ordenada por lo que más conviene atacar primero.

1. **`.env.example` desactualizado.** Le faltan ~10 variables que el código sí lee
   (`AIRTABLE_TABLE_STAGES`, `..._SALARY_RANGE`, `..._REVIEW_TIME`, los cuatro `SITIOS_*`,
   los dos `JUEGOS_*`, `KV_REST_API_*`) y lista tres que ya nadie usa (`INTERVIEWS`,
   `USERS`, `ACTIVITY`). Hoy no sirve como plantilla.
2. **`AUTH_SECRET` tiene un fallback hardcodeado** en [`env.ts:41`](app/src/lib/env.ts) y
   [`middleware.ts:24`](app/src/middleware.ts). Si la variable falta, la app no falla: firma
   sesiones con un secreto que está en el repositorio. Conviene lanzar un error cuando
   `NODE_ENV=production`. *(Hoy no hay deploy, así que no es urgente — sí antes de publicar.)*
3. **Sin rate limiting en `/api/auth/login`** — expuesto a fuerza bruta.
4. **`bcrypt.compareSync`** en [`login/route.ts:30`](app/src/app/api/auth/login/route.ts)
   bloquea el event loop. Cambiar a la variante asíncrona.
5. **`notifications` y `activity` viven solo en memoria** — se pierden en cada reinicio.
   Migrarlas a Redis como ya se hizo con usuarios.
6. **`charts.tsx` de 77 KB** en un solo archivo.
7. **Cuenta de servicio de Sitios** — crear una cuenta dedicada con las edge functions
   `register-user` / `admin-create-user` del proyecto de origen.
8. **Sin tests.** No hay suite; lo mínimo sería E2E de login y de un CRUD.
9. **Filas fantasma en Airtable** (Rango salarial, Fuentes) — el código las filtra, pero
   ensucian la vista nativa.

---

## 9. Pendientes del backlog

**Vistas nuevas posibles:** quality of hire desde Ingresos · análisis de cuellos de botella
por etapa · timeline cronológico del candidato · scorecard por Hiring Manager · Kanban con
drag & drop.

**UX:** filtros multi-select · búsqueda fuzzy con resultados por categoría · vista mobile con
cards en lugar de scroll horizontal.

**Módulos no construidos:** Onboarding, Desarrollo & Capacitación, Evaluación de Desempeño,
Planes de Carrera, Compensación & Beneficios, Cumplimiento. Los tres primeros ya tienen su
ítem de sidebar escrito y comentado en [`sidebar.tsx:74-76`](app/src/app/dashboard/_components/sidebar.tsx).

---

## 10. Notas del entorno de trabajo

- **Git está instalado pero no en el PATH.** Vive en `C:\Program Files\Git\cmd\git.exe`
  (versión 2.56.0). Para usarlo en una terminal nueva:
  `$env:Path += ";C:\Program Files\Git\cmd"`. Conviene agregarlo al PATH del sistema de
  forma permanente. **No hay GitHub CLI (`gh`)** instalado.
- **No hay deploy en Vercel** activo.
- `.claude/settings.json` tiene permisos apuntando a `C:/dev/sistema-talento-y-cultura/`,
  una ruta que ya no existe.
- El nombre del repositorio remoto (*Dashboard-reclutamiento*) quedó chico frente al alcance
  real del sistema.

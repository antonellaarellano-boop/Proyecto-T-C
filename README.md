<div align="center">

# 🎯 Baldecash · Talento & Cultura

**Plataforma web premium para gestión integral del ciclo de talento: reclutamiento, colaboradores, engagement, merch/inventario, bienestar/salud y pagos.**

Integración nativa con Airtable (fuente de verdad) · Auth JWT con roles · Persistencia de usuarios en Upstash Redis · Dashboard SaaS moderno

</div>

> **Nota de alcance:** este proyecto nació como "Dashboard de Reclutamiento" y creció hasta cubrir
> **6 dominios**: Reclutamiento, Colaboradores, Engagement & Cultura, Merch (compras/usos/stock),
> Bienestar & Salud (exámenes médicos) y **Pagos** (pagos fijos + RHE). Las secciones 1–24 documentan
> en detalle el **core de Reclutamiento**; la sección **25 — "Módulos de Talento & Cultura"** documenta
> colaboradores, engagement, merch, bienestar, catálogos, tablas Airtable, stores y APIs; y la
> **sección 26 — "Pagos, Gastos por evento y mejoras recientes"** documenta el módulo de Pagos/RHE,
> los gastos por evento y las mejoras transversales más recientes. Empezá por ahí si buscás lo nuevo.

---

## 📑 Tabla de contenidos

1. [Visión general](#-visión-general)
2. [Características](#-características)
3. [Stack tecnológico](#-stack-tecnológico)
4. [Arquitectura](#-arquitectura)
5. [Modelo de datos en Airtable](#-modelo-de-datos-en-airtable)
6. [Estructura del proyecto](#-estructura-del-proyecto)
7. [Inicio rápido](#-inicio-rápido)
8. [Variables de entorno](#-variables-de-entorno)
9. [Roles y permisos](#-roles-y-permisos)
10. [Páginas del dashboard](#-páginas-del-dashboard)
11. [KPIs y métricas](#-kpis-y-métricas-fórmulas)
12. [Gráficos del Resumen](#-gráficos-del-resumen)
13. [APIs REST](#-apis-rest)
14. [Auth y persistencia de usuarios](#-auth-y-persistencia-de-usuarios)
15. [Auto-movimientos del pipeline](#-auto-movimientos-del-pipeline)
16. [Catálogos maestros](#-catálogos-maestros)
17. [Componentes UI](#-componentes-ui)
18. [Sistema de diseño](#-sistema-de-diseño)
19. [Exportación de reportes](#-exportación-de-reportes)
20. [Deploy en Vercel](#-deploy-en-vercel)
21. [Desarrollo local](#-desarrollo-local)
22. [Troubleshooting](#-troubleshooting)
23. [Decisiones técnicas no obvias](#-decisiones-técnicas-no-obvias)
24. [Roadmap y pendientes](#-roadmap-y-pendientes)
25. [Módulos de Talento & Cultura (Colaboradores · Engagement · Merch · Bienestar)](#-módulos-de-talento--cultura)
26. [Pagos, Gastos por evento y mejoras recientes](#-pagos-gastos-por-evento-y-mejoras-recientes)
27. [Integraciones Supabase en vivo (Sitios · Juegos de mesa)](#-integraciones-supabase-en-vivo-sitios--juegos-de-mesa)

---

## 🎬 Visión general

Plataforma interna de **Baldecash** para que el equipo de **Talento & Cultura** gestione todo su pipeline de reclutamiento desde una sola interfaz, con datos sincronizados en tiempo real con Airtable como fuente de verdad operativa, y persistencia de usuarios/auth en **Upstash Redis** para que sobreviva los cold starts de Vercel.

### Casos de uso clave

- 👥 **Reclutadores** trackean candidatos en cada etapa, registran motivos de caída, exportan reportes para hiring managers.
- 🎯 **Hiring Managers** consultan el estado de sus vacantes sin tener que pedir actualizaciones.
- 📊 **Dirección** ve KPIs en tiempo real: conversión, time-to-hire, distribución por etapa, ROI por fuente, costo por vacante, salario final vs banda, antigüedad de vacantes abiertas.
- 🔐 **Admins** gestionan usuarios, roles, catálogos maestros (seniorities, hiring managers, reclutadores) y la integración con Airtable.
- 👁 **Viewers** acceden a toda la información en modo solo-lectura — sin botones de crear, editar ni borrar en ningún lado.

### Por qué no usar Airtable directamente

- Airtable es excelente para data entry pero terrible para visualización ejecutiva.
- No tiene control de acceso por rol granular ni hide/show de columnas sensibles.
- No permite componer KPIs derivados sin Pro features.
- La interfaz puede saturar a usuarios no técnicos.
- No permite agrupar dashboards de varias tablas en una sola vista coherente.

Esta plataforma resuelve esos 5 puntos manteniendo Airtable como la única fuente de datos operativos.

---

## ✨ Características

### Visualización (Resumen ejecutivo)

- **6 KPIs animados** con tendencias semanales/mensuales: Candidatos, Nuevos/semana, Vacantes activas, Contrataciones/mes, Conversión/mes, Time-to-hire.
- **Tendencia diaria 30 días** (área chart): aplicaciones vs contrataciones, con bucketing por fecha calendario (no por timestamp) para evitar offsets de timezone.
- **Donut "Fuentes de candidatos"** con total al centro y leyenda detallada con conteo + porcentaje por canal.
- **"No seleccionados por etapa"** (barras horizontales) con insight automático ("La mayoría de descartes ocurre en X").
- **"Motivos de caída"** (barras horizontales) con paleta semántica + stat cards de total/motivo principal.
- **"Distribución por etapa · En proceso"** (barras horizontales con gradiente por etapa).
- **"Antigüedad de vacantes abiertas"** (barras horizontales coloreadas por prioridad).
- **"Candidatos por vacante"** (En proceso vs Finalizados) — tabla con dos barras independientes por vacante, escala compartida, **clickeable** para desplegar el desglose de finalizados (Contratado / Se cayó / No seleccionado).
- **"Costo de fuentes por vacante"** (barras horizontales stacked por canal, con colores brand de cada canal).
- **"Tiempo de revisión por Head"** (barras horizontales coloreadas por velocidad ≤2d/3-5d/>5d).

### Pipeline operativo

- **Tabla de candidatos** con filtros (etapa, fuente, vacante, reclutador), búsqueda, **tabs En proceso / Finalizados**, edición de etapa inline con calendario de fecha, CRUD completo, ordenamiento numérico real por ID.
- **Cards de vacantes** con filtros, métricas por vacante, CRUD completo con dropdown menu, chart de antigüedad arriba del grid.
- **Pipeline tipo Kanban** ([`/dashboard/pipeline`](app/src/app/dashboard/pipeline)) con el tablero visual de candidatos por etapa.
- **Tabla de movimientos** automáticos (read-only) debajo del tablero, con tabs En proceso / Finalizados.
- **Auto-generación de movimientos**: cuando cambiás la etapa de un candidato, se abre un calendario para registrar la fecha, y se crea automáticamente el movimiento en la tabla Etapas. Si la nueva etapa es más avanzada que la anterior, se cierra el movimiento anterior con Fecha Fin = inicio de la nueva.
- **Reportes** con rangos temporales (7/30/90/365 días) y exportación a Excel/PDF.

### CRUD para todas las tablas auxiliares

- **Rango salarial** ([`/dashboard/rango-salarial`](app/src/app/dashboard/rango-salarial)): bandas mín/máx por vacante. Incluye debajo:
  - **Chart "Salario final vs banda salarial"** (range marker) con dot del salario ofrecido posicionado dentro/abajo/sobre la banda.
  - **Tabla de Ingresos** editable (tracking post-contratación).
- **Fuentes** ([`/dashboard/fuentes`](app/src/app/dashboard/fuentes)): canales de adquisición con costo mensual y responsable.
- **Tiempo de revisión** ([`/dashboard/tiempo-revision`](app/src/app/dashboard/tiempo-revision)): tracking de cuánto tarda cada Hiring Manager en revisar un CV, con cálculo automático de días.
- **Catálogos maestros** ([`/dashboard/catalogos`](app/src/app/dashboard/catalogos)): Seniorities, Hiring Managers y Reclutadores, todos editables, alimentan los selects de toda la app.

### Auth y administración

- Login JWT (HS256 con `jose`) en cookie httpOnly, sesión de 8h, recuperación de contraseña (stub).
- **Toggle "mostrar contraseña"** en login y modales de admin.
- Middleware que protege todas las rutas `/dashboard/*` y enforces roles.
- Panel **Admin** (solo rol admin) para CRUD de usuarios y asignación de roles.
- **Persistencia de usuarios en Upstash Redis** (Vercel KV) con bootstrap automático del admin inicial. Fallback transparente a memoria si Redis no está configurado.
- Panel **Ajustes** para perfil, apariencia, integraciones, info de la app.

### Sistema operativo

- **Centro de notificaciones** con polling, badge animado, marcar como leído.
- **Búsqueda global** desde la topbar (Cmd/Ctrl+K).
- **Sincronización manual** con Airtable (botón ↻ en la topbar) que invalida caches del SSR.
- **Modo claro y oscuro** con next-themes y persistencia.
- **Exportación** a Excel (xlsx) y PDF (jspdf) con la paleta corporativa.
- **Logs de actividad** locales para auditoría.

### UX premium

- Paleta oficial Baldecash en 3 familias (azul, aqua, gold) × 7 tonos.
- Tipografía display + sans con `font-feature-settings` activados.
- Sombras multi-capa estilo Stripe/Linear (tinte brand, no negro).
- Border radius 20px (más suave que default).
- Microinteracciones consistentes: hover lift + shadow elevated.
- Transiciones entre páginas con `ShellTransition`.
- **Responsive real**: layout principal con `min-w-0 + overflow-x-hidden` para que las tablas anchas hagan scroll interno, no del body.

---

## 🛠 Stack tecnológico

### Frontend

| Tecnología | Versión | Por qué |
|---|---|---|
| **Next.js** | 14.2.5 | App Router, RSC, middleware nativo, deploy fácil en Vercel |
| **React** | 18.3.1 | Server Components + Client interactivity |
| **TypeScript** | 5.5+ | Type safety end-to-end |
| **Tailwind CSS** | 3.4 | Utility-first + theming via CSS variables |
| **Framer Motion** | 11.3 | Animaciones premium con springs |
| **Radix UI** | múltiples | Primitives accesibles (Dialog, Select, Dropdown, etc.) |
| **Recharts** | 2.12 | Visualizaciones declarativas (donut, bars, areas) |
| **Lucide Icons** | 0.408 | Iconografía consistente |
| **Sonner** | 1.5 | Toasts modernos |
| **next-themes** | 0.3 | Dark mode con persistencia |

### Backend

| Tecnología | Uso |
|---|---|
| **Next.js Route Handlers** | API REST en `/api/*` (runtime Node.js) |
| **jose** | JWT signing/verification (HS256) |
| **bcryptjs** | Hashing de contraseñas |
| **zod** | Validación de payloads en endpoints |
| **airtable** SDK | Cliente oficial para la API de Airtable |
| **@upstash/redis** | Persistencia de usuarios en Vercel KV (Upstash Redis) |

### Estado del cliente

- **@tanstack/react-query** — fetching y caché client-side (provisionado, uso moderado).
- **zustand** — estado UI ligero (provisionado, uso mínimo actual).

### Exportación

- **xlsx** — generación de Excel.
- **jspdf** + **jspdf-autotable** — generación de PDF con paleta brand.

---

## 🏗 Arquitectura

```
┌──────────────────────────────────────────────────────────────┐
│                          NAVEGADOR                            │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ React + Tailwind + Framer Motion + Recharts + Radix UI  │  │
│  └─────────────────────────┬──────────────────────────────┘  │
└────────────────────────────┼─────────────────────────────────┘
                             │ HTTP (cookies, fetch)
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                      NEXT.JS (Vercel)                         │
│                                                                │
│  ┌────────────────┐    ┌──────────────────────────────────┐   │
│  │ Server         │    │ Route Handlers (API REST)        │   │
│  │ Components     │    │  /api/auth  /api/candidates       │   │
│  │ (SSR + RSC)    │    │  /api/vacancies  /api/admin       │   │
│  │ force-dynamic  │    │  /api/catalogs  /api/movements    │   │
│  └────────┬───────┘    │  /api/salary-ranges  /api/sources │   │
│           │            │  /api/ingresos  /api/review-times │   │
│           │            │  /api/sync  /api/health           │   │
│           │            └────────┬─────────────────────────┘   │
│           └──────────────┬──────┘                              │
│                          ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Middleware: JWT verify + role enforcement                 │ │
│  │ (matcher: /dashboard/*, /api/admin/*, etc.)               │ │
│  └──────────────────────────┬───────────────────────────────┘ │
│                             ▼                                  │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Repository Layer (interface única)                        │ │
│  │  src/lib/data/repository.ts                               │ │
│  └────────┬───────────────────────────────────┬─────────────┘ │
│           │                                   │                │
│           ▼                                   ▼                │
│  ┌──────────────────┐               ┌──────────────────────┐  │
│  │ MockRepository   │               │ AirtableRepository   │  │
│  │ (memoria + KV    │               │ (Airtable SDK)       │  │
│  │  para users)     │               │ delega users a Mock  │  │
│  │ DATA_SOURCE=mock │               │ DATA_SOURCE=airtable │  │
│  └─────────┬────────┘               └──────────┬───────────┘  │
└────────────┼─────────────────────────────────────┼─────────────┘
             │                                     │
             ▼                                     ▼
   ┌─────────────────────┐                ┌──────────────────────┐
   │  Upstash Redis      │                │  AIRTABLE            │
   │  (Vercel KV)        │                │  Base appGRC5rRH4m... │
   │  - Usuarios + hash  │                │  - Candidatos         │
   │  - Bootstrap admin  │                │  - Vacantes           │
   │                     │                │  - Etapas             │
   │  Fallback: memoria  │                │  - Ingresos           │
   │  si no configurado  │                │  - Fuentes            │
   │                     │                │  - Rango salarial     │
   │                     │                │  - Tiempo revisión    │
   │                     │                │  - Seniorities        │
   │                     │                │  - Hiring Managers    │
   │                     │                │  - Reclutadores       │
   └─────────────────────┘                └──────────────────────┘
```

### Principios de diseño

#### 1. Capa de repositorio única

Toda la app consume `getRepo()` desde [`src/lib/data/repository.ts`](app/src/lib/data/repository.ts). La interfaz es la misma se use Airtable o mock. Cambiar de uno a otro es flipar la variable `DATA_SOURCE`.

#### 2. Server Components por default

Las páginas son Server Components (RSC) que fetchean data en el server, mantienen el JS del cliente al mínimo. Los Client Components (con `'use client'`) son sólo los interactivos (forms, gráficos, modals).

#### 3. Auth/usuarios en Redis, data operativa en Airtable

Los **usuarios del sistema** (auth) viven en **Upstash Redis** (persistente, sobrevive cold starts de Vercel). Los **datos del pipeline** (candidatos, vacantes, etc.) viven en **Airtable**. Esto evita contaminar la base operativa con datos de la plataforma y a la vez evita la pérdida de usuarios al hacer cold start.

Si Redis no está configurado, el código cae transparentemente a memoria (modo dev local sin setup adicional).

#### 4. Defensa en 2 capas para roles

- **Backend**: cada endpoint verifica `session.role` antes de mutaciones. Viewer recibe 403.
- **Frontend**: un `RoleProvider` propaga el rol y un hook `useCanMutate()` esconde los botones de mutación cuando el usuario es viewer. **Ver es ver, no intentar y fallar.**

#### 5. Sin librería de UI pesada

Componentes basados en Radix UI primitives + Tailwind. Es esencialmente Shadcn/UI pero hecho a mano con la paleta Baldecash. Cero `@/components/ui` chunky.

#### 6. IDs autoincrementales consistentes

Para mantener legibilidad y consistencia con la práctica del equipo, todos los IDs de records nuevos siguen un patrón `<prefijo><N>` con padding a 4 dígitos calculados desde el máximo existente:

| Entidad | Prefijo | Ejemplo |
|---|---|---|
| Candidatos | `C` | `C0001`, `C0024` |
| Vacantes | `VC` | `VC0001`, `VC0013` |
| Movimientos | `MV` | `MV0017` |
| Fuentes | `F` | `F0001`, `F0017` |
| Tiempo de revisión | `RV` | `RV0009` |
| Seniorities | `S` | `S0001` |
| Hiring Managers | `HM` | `HM0009` |
| Reclutadores | `R` | `R0003` |

---

## 📊 Modelo de datos en Airtable

**Base ID**: `appGRC5rRH4m1I8g2`

### 1. Candidatos (`tbl9Eb4EIsqY5vhHm`)

Pipeline de candidatos activos e históricos.

| Campo | Tipo | Mapeo TS |
|---|---|---|
| `ID_Candidato` (PK) | singleLineText | `id` |
| `Nombre Completo` | multilineText | `name` |
| `ID Vacante` | singleLineText | `vacancyId` |
| `Fuente` | singleSelect (LinkedIn, Bumeran, Referido, Computrabajo, Facebook) | `source` |
| `Fecha Postulación` | date | `appliedAt` |
| `Reclutador` | singleSelect | `recruiter` |
| `Etapa Actual` | singleSelect | `stage` |
| `Estado Final` | singleSelect (En proceso, Contratado, Se cayó, No seleccionado) | `finalStatus` |
| `Motivo Caída` | singleSelect | `dropReason` |
| `Contratado` | singleSelect (Sí/No) | `hired` |

**Etapas reales en Airtable** (singleSelect):
`Entrevista T&C` · `Entrevista líder` · `Prueba Tecnica` · `Oferta` · `Ingreso`
(Nota: el dominio TS también incluye `Screening` aunque Airtable no la tenga registrada como opción; con `typecast: true` se crea al guardar.)

### 2. Vacantes (`tblzOTwm8yualc6an`)

Puestos a llenar.

| Campo | Tipo | Mapeo TS |
|---|---|---|
| `ID_Vacante` (PK) | singleLineText | `id` |
| `Puesto` | multilineText | `title` |
| `Área` | singleSelect | `area` |
| `Seniority` | singleSelect | `seniority` |
| `Reclutador` | singleSelect | `recruiter` |
| `Hiring Manager` | singleSelect | `hiringManager` |
| `Fecha Apertura` | date | `openedAt` |
| `Fecha Cierre` | date | `closedAt` |
| `Estado Vacante` | singleSelect (Abierta / En Pausa / Cerrada) | `status` |
| `Prioridad` | singleSelect (Alta / Media / Baja) | `priority` |
| `Modalidad` | singleSelect | `modalidad` |
| `Cantidad Posiciones` | number | `positions` |
| `Veces Reabierta` | number | `reopens` |
| `Motivo Reapertura` | multilineText | `reopenReason` |

### 3. Etapas (`tblcGtXMah2F9m4a6`)

Historial de movimientos del candidato por etapa (1:N con Candidatos). **Auto-generada** al cambiar la etapa de un candidato desde la app.

| Campo | Tipo | Mapeo TS |
|---|---|---|
| `ID Movimiento` (PK) | singleLineText | `id` |
| `ID Candidato` | singleLineText | `candidateId` |
| `ID Vacante` | singleLineText | `vacancyId` |
| `Etapa` | singleSelect | `stage` |
| `Fecha Inicio` | date | `startedAt` |
| `Fecha Fin` | date | `endedAt` |
| `Resultado` | singleSelect (Aprobado / Aceptó Oferta / No se presentó) | `result` |
| `Comentarios` | multilineText | `comments` |

### 4. Ingresos (`tblGkRAoMUXEWZk5S`)

Tracking post-contratación (retención y performance).

| Campo | Tipo | Mapeo TS |
|---|---|---|
| `ID Candidato` (PK) | singleLineText | `candidateId` |
| `Salario final` | currency | `finalSalary` |
| `Fecha Ingreso` | date | `startDate` |
| `Sigue en Empresa` | singleSelect (Sí/No) | `stillEmployed` |
| `Fecha Salida` | date | `endDate` |
| `Pasó Periodo Prueba` | singleSelect (Sí/No) | `passedProbation` |
| `Performance` | multilineText | `performance` |
| `Comentario Líder` | multilineText | `leaderComment` |

### 5. Fuentes (`tblAEXtXNSdrncanh`)

Costo y tracking de canales de adquisición por vacante.

| Campo | Tipo | Mapeo TS |
|---|---|---|
| `ID Fuentes` (PK) | singleLineText | `sourceId` |
| `ID VACANTE` | singleLineText | `vacancyId` |
| `Fuente` | singleSelect | `name` |
| `Costo Mensual` | currency | `monthlyCost` |
| `Responsable` | singleSelect | `owner` |

**Canales actuales**: Linkedin, Bumeran, Facebook, Referidos, Universidad de Lima, Universidad del Pacífico.

### 6. Rango salarial (`tblWgZQjsrG9XYhKF`)

Bandas salariales por vacante.

| Campo | Tipo | Mapeo TS |
|---|---|---|
| `ID VACANTE` (PK) | singleLineText | `vacancyId` |
| `SALARIO MINIMO` | currency | `min` |
| `SALARIO MAXIMO` | currency | `max` |

### 7. Tiempo de revisión (head) (`tblRKGm0Nw6WckiGP`)

Tracking del tiempo que toma al hiring manager revisar el CV.

| Campo | Tipo | Mapeo TS |
|---|---|---|
| `ID Revision` (PK) | singleLineText | `reviewId` |
| `ID Candidato` | singleLineText | `candidateId` |
| `Fecha de envio de cv` | date | `cvSentAt` |
| `Fecha de Retorno de CV` | date | `returnedAt` |
| `Hiring Manager` | singleSelect | `headName` |

### 8. Seniorities (`tbly6jLyGh0zn1J4N`) — catálogo maestro

| Campo | Tipo | Mapeo TS |
|---|---|---|
| `ID_Senioritie` (PK) | singleLineText | `id` |
| `Seniority` | multilineText | `name` |

Valores actuales: Junior, Intermedio, Senior, Practicas.

### 9. Hiring Managers (`tblvkjugKSzAqwpss`) — catálogo maestro

| Campo | Tipo | Mapeo TS |
|---|---|---|
| `ID_Manager` (PK) | singleLineText | `id` |
| `Hiring Manager` | multilineText | `name` |

Valores actuales: Antonella Arellano, Jorge Morales, Marco Del Rio, Ruben Montenegro, Meylin Miyashiro, Yadira Yovera, Monica Obando, Vania Hagel.

### 10. Reclutadores (`tbljOWSjxp2buFBni`) — catálogo maestro

| Campo | Tipo | Mapeo TS |
|---|---|---|
| `ID_Reclutador` (PK) | singleLineText | `id` |
| `Reclutador` | multilineText | `name` |

Valores actuales: Antonella Arellano, Mayra Pereira.

### Relaciones (lógicas, vía IDs texto)

```
Vacantes (1) ──────< Candidatos (N)        [via ID Vacante]
Candidatos (1) ───< Etapas (N)             [via ID Candidato]
Candidatos (1) ───< Ingresos (1)           [via ID Candidato]
Vacantes (1) ────< Fuentes (N)             [via ID VACANTE]
Vacantes (1) ────< Rango salarial (1)      [via ID VACANTE]
Candidatos (1) ──< Tiempo revisión (N)     [via ID Candidato]
```

**Nota**: Las relaciones son lógicas vía IDs texto, no `Link to another record` reales. Esto facilita la edición manual pero pierde integridad referencial. Para producción avanzada se recomienda migrar a links reales.

### `typecast: true` en todos los writes a Airtable

Todos los `create()` y `update()` a Airtable usan `{ typecast: true }`. Esto significa que si la app manda un valor a un singleSelect que no existe como opción (ej. una nueva persona en el catálogo de Hiring Managers que aún no está en las opciones del singleSelect), **Airtable lo crea automáticamente** en lugar de fallar con 422. Permite mantener catálogos vivos sin pre-poblar las opciones.

---

## 📁 Estructura del proyecto

```
Dashboard Reclutamiento/
├── .gitignore
├── README.md                  ← este archivo
├── paleta de colores.jpeg
└── app/                       ← Next.js app (Vercel Root Directory = "app")
    ├── .env.example
    ├── .env.local             ← secrets reales (no en git)
    ├── next.config.mjs
    ├── package.json
    ├── tailwind.config.ts
    ├── tsconfig.json
    └── src/
        ├── middleware.ts      ← JWT verify + role enforcement
        ├── app/               ← App Router de Next.js
        │   ├── layout.tsx
        │   ├── page.tsx       ← redirect / login → /dashboard
        │   ├── globals.css
        │   ├── error.tsx / global-error.tsx / not-found.tsx
        │   ├── (auth)/        ← rutas sin layout dashboard
        │   │   ├── auth-shell.tsx
        │   │   ├── layout.tsx
        │   │   ├── login/
        │   │   └── forgot-password/
        │   ├── api/           ← Route Handlers (Node runtime)
        │   │   ├── activity/
        │   │   ├── admin/users/ ← admin-only CRUD de usuarios
        │   │   ├── auth/        ← login / logout / me / forgot
        │   │   ├── candidates/  ← CRUD + auto-movimiento al cambiar etapa
        │   │   ├── catalogs/[type]/ ← Seniorities/HM/Reclutadores
        │   │   ├── dashboard/   ← KPIs agregados
        │   │   ├── health/      ← health check + diagnóstico KV
        │   │   ├── ingresos/    ← CRUD
        │   │   ├── movements/   ← solo GET y DELETE (los crea el sistema)
        │   │   ├── notifications/
        │   │   ├── review-times/ ← CRUD
        │   │   ├── salary-ranges/ ← CRUD
        │   │   ├── sources/     ← CRUD
        │   │   ├── sync/        ← ping + revalidatePath
        │   │   └── vacancies/   ← CRUD
        │   └── dashboard/       ← rutas autenticadas
        │       ├── layout.tsx   ← RoleProvider + Sidebar + Topbar
        │       ├── page.tsx     ← Resumen ejecutivo
        │       ├── actividad/
        │       ├── admin/       ← solo rol admin
        │       ├── ajustes/
        │       ├── candidatos/
        │       ├── catalogos/   ← Seniorities/HM/Reclutadores
        │       ├── fuentes/
        │       ├── pipeline/    ← tablero + movimientos
        │       ├── rango-salarial/ ← + ingresos + comparación
        │       ├── reportes/
        │       ├── tiempo-revision/
        │       ├── vacantes/    ← + chart de antigüedad
        │       └── _components/ ← sidebar / topbar / etc.
        ├── components/
        │   ├── providers.tsx
        │   ├── auth/
        │   │   └── role-context.tsx   ← RoleProvider + useCanMutate
        │   ├── brand/                  ← logo y loaders
        │   ├── dashboard/
        │   │   ├── kpi-card.tsx
        │   │   ├── charts.tsx          ← TODOS los charts (10+)
        │   │   ├── ingresos-table.tsx
        │   │   ├── movements-table.tsx
        │   │   └── pipeline-table.tsx
        │   └── ui/                     ← primitives Shadcn-style
        └── lib/
            ├── env.ts
            ├── types.ts                ← tipos de dominio
            ├── utils.ts
            ├── export.ts               ← Excel + PDF
            ├── auth/
            │   └── session.ts          ← JWT helpers
            └── data/
                ├── repository.ts       ← interface única
                ├── airtable.ts         ← impl. Airtable
                ├── mock.ts             ← impl. memoria (+ delega users a KV)
                ├── store.ts            ← store en memoria (singleton)
                ├── seed.ts             ← data demo
                └── user-kv-store.ts    ← persistencia de usuarios en Redis
```

---

## 🚀 Inicio rápido

### Prerequisitos

- Node.js 18+
- npm
- En Windows con PowerShell: habilitar scripts con `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

### Pasos

```bash
# 1. Clonar
git clone https://github.com/marianagomez-crypto/Dashboard-reclutamiento.git
cd Dashboard-reclutamiento/app

# 2. Configurar variables
cp .env.example .env.local
# editar .env.local y poner AIRTABLE_TOKEN y AIRTABLE_BASE_ID

# 3. Instalar y arrancar
npm install
npm run dev

# 4. Abrir http://localhost:3000
```

### Credenciales del admin inicial

| Origen | Email | Contraseña |
|---|---|---|
| Default del código | `admin@baldecash.com` | `Baldecash2026!` |
| Si `ADMIN_EMAIL`/`ADMIN_PASSWORD` están seteados en env | los que tengas configurados | idem |

> En **producción con Redis configurado**, el admin se crea automáticamente la primera vez que se accede al store de usuarios (bootstrap).

---

## 🔑 Variables de entorno

Todas en [`app/.env.example`](./app/.env.example).

### Esenciales

| Variable | Default | Descripción |
|---|---|---|
| `DATA_SOURCE` | `mock` | `mock` (in-memory) o `airtable` (real) |
| `AIRTABLE_TOKEN` | — | Personal Access Token de Airtable |
| `AIRTABLE_BASE_ID` | — | `appGRC5rRH4m1I8g2` |
| `AUTH_SECRET` | dev-only | **Cambiar en prod** — `openssl rand -base64 48` |
| `AUTH_SESSION_TTL` | `28800` | TTL de sesión en segundos (8h) |

### Persistencia de usuarios (Upstash Redis)

Estas variables se **auto-inyectan en Vercel** al conectar un Redis vía Marketplace (Storage → Upstash). En dev local, copialas del panel de Vercel → Storage → tu base → pestaña `.env.local`.

| Variable | Descripción |
|---|---|
| `KV_REST_API_URL` | URL REST de Upstash |
| `KV_REST_API_TOKEN` | Token de auth |
| `KV_REST_API_READ_ONLY_TOKEN` | Token read-only |
| `KV_URL` | URL alternativa |
| `REDIS_URL` | URL Redis alternativa |

> El código también acepta `UPSTASH_REDIS_REST_URL/TOKEN` (nombres nativos de Upstash) como fallback.

### Integraciones Supabase en vivo (opcionales, server-only)

Alimentan los apartados **Sitios** y **Juegos de mesa** (sección 27). Si faltan, cada módulo muestra su pantalla "no configurado" y el resto de la app funciona igual. Ver [`env.ts`](app/src/lib/env.ts) (`env.sitios`, `env.juegos`).

| Variable | Módulo | Descripción |
|---|---|---|
| `SITIOS_SUPABASE_URL` | Sitios | URL del proyecto Supabase de Desk Buddy |
| `SITIOS_SUPABASE_ANON_KEY` | Sitios | Anon/publishable key |
| `SITIOS_SUPABASE_EMAIL` | Sitios | Correo del usuario dedicado de solo lectura (RLS exige auth) |
| `SITIOS_SUPABASE_PASSWORD` | Sitios | Password de ese usuario — **nunca llega al navegador** |
| `JUEGOS_SUPABASE_URL` | Juegos | URL del proyecto Supabase de reserva de juegos |
| `JUEGOS_SUPABASE_ANON_KEY` | Juegos | Anon/publishable key (RLS de SELECT público → basta esta) |

> `env.sitios.enabled` requiere las **4** variables; `env.juegos.enabled` requiere solo URL + anon key.

### Nombres de tablas (override opcional)

| Variable | Default |
|---|---|
| `AIRTABLE_TABLE_CANDIDATES` | `Candidatos` |
| `AIRTABLE_TABLE_VACANCIES` | `Vacantes` |
| `AIRTABLE_TABLE_STAGES` | `Etapas` |
| `AIRTABLE_TABLE_SOURCES` | `Fuentes` |
| `AIRTABLE_TABLE_INGRESOS` | `Ingresos` |
| `AIRTABLE_TABLE_SALARY_RANGE` | `Rango salarial` |
| `AIRTABLE_TABLE_REVIEW_TIME` | `Tiempo de revision (head)` |

### Admin bootstrap

| Variable | Default |
|---|---|
| `ADMIN_EMAIL` | `admin@baldecash.com` |
| `ADMIN_PASSWORD` | `Baldecash2026!` |

> En producción, **cambia ambos** y rota el `AUTH_SECRET`.

### App

| Variable | Default |
|---|---|
| `NEXT_PUBLIC_APP_NAME` | `Baldecash Recruitment` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` |

### Scopes del Personal Access Token de Airtable

- `data.records:read`
- `data.records:write`
- `schema.bases:read`
- `schema.bases:write` *(necesario si la app va a crear tablas o nuevas opciones de singleSelect — algunas operaciones lo usan vía `typecast: true`).*

Agregá tu base al token explícitamente en "Access".

---

## 🔐 Roles y permisos

3 roles definidos en [`src/lib/types.ts`](app/src/lib/types.ts):

```ts
type Role = 'admin' | 'recruiter' | 'viewer';
```

### Matriz de permisos

| Capacidad | Admin | Recruiter | Viewer |
|---|:---:|:---:|:---:|
| Ver dashboard, reportes, todas las tablas | ✅ | ✅ | ✅ |
| Cambiar tema, perfil propio | ✅ | ✅ | ✅ |
| Sincronizar con Airtable | ✅ | ✅ | ❌ |
| Crear/editar candidatos, vacantes | ✅ | ✅ | ❌ |
| Cambiar etapa de candidato (auto-movimiento) | ✅ | ✅ | ❌ |
| Eliminar candidatos, vacantes | ✅ | ❌ | ❌ |
| Crear/editar rangos, fuentes, ingresos, revisiones, catálogos | ✅ | ✅ | ❌ |
| Eliminar rangos, fuentes, ingresos, revisiones, catálogos | ✅ | ❌ | ❌ |
| Eliminar movimientos del pipeline | ✅ | ✅ | ❌ |
| Panel de administración (usuarios) | ✅ | ❌ | ❌ |
| Crear/editar/eliminar usuarios | ✅ | ❌ | ❌ |

### Enforcement (defensa en 2 capas)

- **Middleware** ([`src/middleware.ts`](app/src/middleware.ts)) bloquea acceso a `/dashboard/admin` y `/api/admin/*` si rol != admin.
- **Cada endpoint mutador** verifica `session.role` antes de operar (devuelve 401/403).
- **UI** ([`role-context.tsx`](app/src/components/auth/role-context.tsx)): `RoleProvider` + `useCanMutate()` + `useIsAdmin()` esconden los botones de crear/editar/borrar para roles sin permiso. **El viewer no ve ningún botón de mutación en ningún lado** — la app le queda totalmente read-only.

---

## 📄 Páginas del dashboard

### `/dashboard` — Resumen ejecutivo

Vista ejecutiva del estado del pipeline.

**Secciones**:
1. **Hero**: saludo + indicador "Conectado · airtable" con ping animado.
2. **6 KPIs**: Candidatos, Nuevos/semana, Vacantes activas, Contrataciones/mes, Conversión/mes, Time-to-hire.
3. **Tendencia de actividad** (área-chart 30d): aplicaciones vs contrataciones por día.
4. **Fuentes de candidatos** (donut con total al centro).
5. **No seleccionados por etapa** (bar horizontal con insight automático).
6. **Motivos de caída** (bar horizontal con paleta semántica).
7. **Distribución por etapa · Candidatos en proceso** (bar horizontal).
8. **Antigüedad de vacantes abiertas** (bar horizontal coloreado por prioridad).
9. **Candidatos por vacante** (En proceso vs Finalizados, con desglose clickeable).
10. **Tiempo de revisión por Head** (bar horizontal coloreado por velocidad).

### `/dashboard/candidatos` — Pipeline de candidatos

CRUD completo de candidatos con tabs **En proceso / Finalizados**.

**Funcionalidades**:
- Búsqueda por nombre / ID / reclutador.
- Filtros: etapa, fuente, vacante, reclutador.
- **Tabs** En proceso (default) / Finalizados con contadores en vivo.
- **Cambio de etapa inline** con diálogo de calendario para registrar la fecha; auto-genera el movimiento en la tabla Etapas.
- Crear candidato (modal). Vacantes cerradas ocultas del dropdown.
- Editar candidato (modal). Reclutador del catálogo dinámico.
- Eliminar candidato (solo admin).
- Export Excel y PDF de la vista filtrada.
- Badge de color por Estado Final.
- Avatar con iniciales.
- Orden ascendente por ID numérico real (C0001, C0002, ..., C0023).

### `/dashboard/vacantes` — Vacantes

Cards en grid con filtros y CRUD.

**Funcionalidades**:
- Filtros por estado (Abierta / En Pausa / Cerrada) y área.
- Dropdown menu por vacante: Ver detalle / Editar / Eliminar.
- Modal de detalle con todos los campos + lista de candidatos asignados.
- Modal de edición completo.
- Crear vacante con selects dinámicos desde catálogos (Seniority, HM, Reclutador).
- Métricas por card: candidatos totales · contratados.
- Badges de Estado, Prioridad, Modalidad, Veces reabierta.
- **Chart "Antigüedad de vacantes abiertas"** arriba del grid, coloreado por prioridad.

### `/dashboard/pipeline` — Tablero + Movimientos

Tablero tipo Kanban + tabla de movimientos auto-generados.

**Tablero superior**:
- Cada candidato como una fila.
- Una columna por etapa: Screening, Entrevista T&C, Entrevista líder, Prueba Tecnica, Oferta.
- La celda de la etapa **más avanzada** (por ranking, no por fecha) se sombrea para cada candidato.
- Solo candidatos con `Estado Final = "En proceso"` y vacante `Abierta`.

**Tabla de movimientos** (debajo):
- Solo lectura + botón eliminar (recruiter + admin).
- Tabs En proceso / Finalizados (basado en el `finalStatus` del candidato asociado).
- Búsqueda por candidato, vacante, ID.

### `/dashboard/rango-salarial` — Bandas + Ingresos + Comparación

Tres secciones apiladas:
1. **Bandas salariales** (CRUD inline) — un rango por vacante.
2. **Chart "Salario final vs banda salarial"** (range marker) — dot del salario final ofrecido posicionado dentro/fuera del rango, con etiqueta del estado ("Dentro del rango", "S/100 bajo el mínimo", "S/200 sobre el máximo").
3. **Tabla de Ingresos** (CRUD) — tracking post-contratación.

### `/dashboard/fuentes` — Canales de adquisición

CRUD de canales por vacante con costo mensual y responsable. Cada canal tiene su color distintivo (Linkedin azul, Bumeran naranja, Facebook azul, Referidos violeta, ULima amarillo, UP azul oscuro).

Incluye **chart "Costo de fuentes por vacante"** stacked por canal, y el gráfico ejecutivo **"Inversión en reclutamiento vs. costo real atribuible"** ([`investment-attribution-chart.tsx`](app/src/components/dashboard/investment-attribution-chart.tsx)):
- **Por candidato contratado**, dos barras: **inversión realizada** (total invertido en fuentes de su vacante, dorado) vs **costo real atribuible** (lo invertido en el canal que efectivamente lo contrató, rojo). La diferencia es el **gap** (caja punteada): plata que se pagó pero no atribuible a la contratación (ej. se invirtió en LinkedIn pero entró por Referidos → atribuible S/ 0).
- **KPIs:** Inversión total · Costo atribuible total · % Efectividad · Monto no atribuible. Los totales se **deduplican por vacante** (una vacante con varios contratados no cuenta su inversión dos veces, y la efectividad nunca pasa de 100%).

### `/dashboard/tiempo-revision` — Revisiones de CV

CRUD de revisiones de CV por Hiring Manager. Calcula automáticamente los días entre envío y retorno. Badge de color por velocidad (≤2d verde, 3-5d azul, >5d rojo). Alimenta el chart "Tiempo de revisión por Head" del Resumen.

### `/dashboard/catalogos` — Maestros

CRUD de los 3 catálogos maestros (Seniorities, Hiring Managers, Reclutadores) en cards apiladas con edición inline. Estos catálogos alimentan los selects de Vacantes y Candidatos en toda la app.

### `/dashboard/reportes` — Reportes

Mismas visualizaciones que el resumen pero con **filtros temporales** (7/30/90/365 días o todo) y filtro por vacante. Incluye **resumen ejecutivo** y **tabla detalle** con export.

### `/dashboard/actividad` — Logs

Feed de actividad del sistema (creaciones, ediciones, sincronizaciones, exports, logins). Almacenado en memoria local.

### `/dashboard/admin` — Panel de administración (solo admin)

CRUD de usuarios del sistema. Usuarios persistidos en Upstash Redis.

**Acciones**:
- Crear usuario (email, nombre, rol, password) con toggle de mostrar contraseña.
- Editar usuario (cambiar rol, activar/desactivar).
- Eliminar usuario.
- Reset de contraseña (con toggle de mostrar).

### `/dashboard/ajustes` — Settings

4 tabs:
1. **Perfil**: email, nombre, rol del usuario actual.
2. **Apariencia**: theme switcher (claro / oscuro / sistema).
3. **Integraciones**: estado de conexión a Airtable.
4. **About**: info de la app.

---

## 📐 KPIs y métricas (fórmulas)

### Candidatos
```ts
totalCandidates = candidates.length
```

### Nuevos / semana
```ts
weekAgo = now - 7 * 86_400_000
newThisWeek = candidates.filter(c =>
  c.appliedAt && new Date(c.appliedAt).getTime() >= weekAgo
).length
```

### Vacantes activas
```ts
activeVacancies = vacancies.filter(v => v.status === 'Abierta').length
```

### Contrataciones / mes
```ts
monthAgo = now - 30 * 86_400_000
hired = candidates.filter(c => c.finalStatus === 'Contratado')
hiresThisMonth = hired.filter(c =>
  c.appliedAt && new Date(c.appliedAt).getTime() >= monthAgo
).length
```

### Conversión / mes
```ts
conversionRate = totalCandidates > 0
  ? (hiresThisMonth / totalCandidates) * 100
  : 0
```

### Time-to-hire (días)
```ts
avgTimeToHireDays = hired.reduce((acc, c) =>
  acc + (Date.now() - new Date(c.appliedAt).getTime()) / 86_400_000, 0
) / hired.length
```

### Tendencia diaria (30 días)
Agrupación por string `YYYY-MM-DD` para evitar timezone shift:
```ts
const key = c.appliedAt.slice(0, 10);
apCount[key] += 1
```

### Distribución por etapa (solo en proceso)
```ts
inProcess.forEach(c => stageCounts[c.stage] += 1)
```

### Antigüedad de vacantes abiertas
```ts
days = Math.floor((Date.now() - new Date(openedAt).getTime()) / 86_400_000)
```

### Días de revisión (por record)
```ts
days = (returnedAt - cvSentAt) / 86_400_000
```

### Promedio de días por Hiring Manager
```ts
avg = head_records.reduce(sum_days) / head_records.length
```

### Candidatos por vacante (En proceso vs Finalizados)
```ts
// Solo vacantes NO cerradas
activeVacancies.forEach(v => byVacancyStatus.set(v.id, { enProceso: 0, finalizados: 0 }))
candidates.forEach(c => {
  if (c.vacancyId está en activeVacancies) {
    if (c.finalStatus === 'En proceso') enProceso++
    else finalizados++  // Contratado | Se cayó | No seleccionado
  }
})
```

---

## 📈 Gráficos del Resumen

Todos los gráficos están en [`src/components/dashboard/charts.tsx`](app/src/components/dashboard/charts.tsx). El archivo concentra ~10 componentes export-named:

| Componente | Propósito |
|---|---|
| `TrendChart` | Aplicaciones vs contrataciones por día (30d). |
| `SourceChart` | Donut con leyenda detallada por canal. |
| `StageBarChart` | Distribución por etapa con gradientes. |
| `NotSelectedByStageChart` | Descartes internos con insight. |
| `DropReasonsChart` | Motivos de caída del candidato. |
| `VacancyAgingChart` | Antigüedad de vacantes (barras horizontales por prioridad). |
| `CandidatesByStatusChart` | Tabla con dos barras (En proceso/Finalizados) + desglose clickeable. |
| `SourceCostByVacancyChart` | Stacked horizontal de costos por canal. |
| `HeadReviewTimeChart` | Días promedio por Hiring Manager. |
| `SalaryComparisonChart` | Range marker salario final vs banda. |

---

## 🔌 APIs REST

Todas en `app/src/app/api/` con runtime Node.js, validación Zod, try/catch consistentes, log de actividad.

### Auth

| Method | Endpoint | Descripción |
|---|---|---|
| `POST` | `/api/auth/login` | Valida + setea cookie JWT |
| `POST` | `/api/auth/logout` | Limpia cookie |
| `GET` | `/api/auth/me` | Usuario actual |
| `POST` | `/api/auth/forgot` | Stub de recuperación |

### Candidatos
| Method | Endpoint | Notas |
|---|---|---|
| `GET` | `/api/candidates` | Soporta query: search, stage, source, vacancyId, recruiter, finalStatus |
| `POST` | `/api/candidates` | + auto-movimiento inicial |
| `GET` | `/api/candidates/[id]` | |
| `PATCH` | `/api/candidates/[id]` | + auto-movimiento al cambiar etapa (acepta `stageDate`) |
| `DELETE` | `/api/candidates/[id]` | solo admin |

### Vacantes
| Method | Endpoint |
|---|---|
| `GET` | `/api/vacancies` |
| `POST` | `/api/vacancies` |
| `PATCH` | `/api/vacancies/[id]` |
| `DELETE` | `/api/vacancies/[id]` (solo admin) |

### Movimientos del pipeline
| Method | Endpoint | Notas |
|---|---|---|
| `GET` | `/api/movements` | También soporta `?candidateId=` |
| `POST` | `/api/movements` | Reservado para el sistema (no expuesto en UI) |
| `PATCH` | `/api/movements/[id]` | Reservado |
| `DELETE` | `/api/movements/[id]` | admin + recruiter |

### Rango salarial
`/api/salary-ranges` GET/POST · `/api/salary-ranges/[id]` PATCH/DELETE (delete: admin). + `revalidatePath('/dashboard/rango-salarial')` para refrescar el chart.

### Ingresos
`/api/ingresos` GET/POST · `/api/ingresos/[id]` PATCH/DELETE. + `revalidatePath`.

### Fuentes
`/api/sources` GET/POST · `/api/sources/[id]` PATCH/DELETE (delete: admin).

### Tiempo de revisión
`/api/review-times` GET/POST · `/api/review-times/[id]` PATCH/DELETE (delete: admin).

### Catálogos maestros
`/api/catalogs/[type]` GET/POST · `/api/catalogs/[type]/[id]` PATCH/DELETE.
`[type]` válido: `seniorities | hiring-managers | recruiters`.

### Admin (solo rol admin)
| Method | Endpoint |
|---|---|
| `GET` | `/api/admin/users` |
| `POST` | `/api/admin/users` |
| `PATCH` | `/api/admin/users/[id]` |
| `DELETE` | `/api/admin/users/[id]` |

### Otros
| Method | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/dashboard` | KPIs agregados |
| `GET` | `/api/activity?limit=N` | Logs de actividad |
| `GET` | `/api/notifications` | Lista de notificaciones |
| `PATCH` | `/api/notifications` | Mark as read |
| `POST` | `/api/sync` | Trigger sync con Airtable + revalidatePath('/dashboard') |
| `GET` | `/api/health` | `{ ok, source, auth: { storage, userCount } }` |

---

## 🔒 Auth y persistencia de usuarios

### Flow de autenticación

```
1. Usuario POST /api/auth/login
   ↓
2. Server valida email/password contra Repository
   ├── Si KV configurado → consulta Upstash Redis
   └── Si no → consulta store en memoria
   ↓
3. Server firma JWT (jose, HS256) con payload {sub, email, name, role, exp}
   ↓
4. Server set-cookie httpOnly Secure SameSite=Lax
   ↓
5. Cliente redirige a /dashboard
   ↓
6. Middleware intercepta cada request a /dashboard/* y /api/admin/*
   ↓
7. Middleware lee cookie → jwtVerify(token)
   ├─ inválido → redirect /login?from=...
   └─ válido → continúa
   ↓
8. Si la ruta es /dashboard/admin o /api/admin/* y session.role !== 'admin'
   → redirect /dashboard (UI) o 403 (API)
```

### Persistencia en Upstash Redis ([`user-kv-store.ts`](app/src/lib/data/user-kv-store.ts))

**Estructura en Redis**:
- `users:byId:{id}` → JSON del usuario completo (incluye `passwordHash`).
- `users:byEmail:{email lowercased}` → ID del usuario (lookup rápido).
- `users:index` → set de todos los IDs activos + flag `__bootstrapped`.

**Bootstrap automático**: la primera vez que se accede al store, si `users:index` no contiene `__bootstrapped`, se crea el admin inicial usando `ADMIN_EMAIL` y `ADMIN_PASSWORD` del environment. Se marca como bootstrapeado para no recrear.

**Detección de KV**: `isKvAvailable()` chequea `KV_REST_API_URL` y `KV_REST_API_TOKEN` (las que Vercel inyecta al conectar Upstash desde el Marketplace). Si no están, todo cae transparentemente al store en memoria.

### Helpers en [`src/lib/auth/session.ts`](app/src/lib/auth/session.ts)

```ts
signSession(payload, ttlSeconds): Promise<string>
verifySession(token): Promise<SessionPayload | null>
getSession(): Promise<SessionPayload | null>  // server-side, lee cookie
clearSessionCookie(): void
requireSession(): Promise<SessionPayload>
requireRole(role): Promise<SessionPayload>
```

---

## ⚙️ Auto-movimientos del pipeline

Cuando cambias la etapa de un candidato desde `/dashboard/candidatos`, el sistema:

1. Abre un diálogo titulado **"Fecha en la que se realizó {etapa}"** con un input date.
2. Al confirmar, el PATCH a `/api/candidates/[id]` lleva un parámetro extra `stageDate`.
3. El endpoint:
   - Lee el candidato actual para detectar la etapa anterior.
   - Actualiza el candidato.
   - **Si la etapa cambió** (no si solo se editó otra cosa):
     - **Si la nueva etapa es más avanzada** (según el orden `Screening → Oferta → Ingreso`), cierra el movimiento abierto de la etapa anterior con `Fecha Fin = stageDate`.
     - **Crea un nuevo movimiento** en la tabla Etapas con `Fecha Inicio = stageDate`, comentario auto `"Cambio de etapa: X → Y"`.

Cuando se crea un candidato nuevo, también se genera su movimiento inicial automático con `Etapa = stage seleccionada`, `Fecha Inicio = appliedAt`, comentario `"Etapa inicial: ..."`.

Esto evita que el equipo tenga que mantener manualmente la tabla Etapas — todo se deriva de los cambios en Candidatos.

La tabla de movimientos del Pipeline es **solo lectura + borrar**. Las creaciones manuales fueron removidas porque ahora se auto-generan.

---

## 📚 Catálogos maestros

Para evitar acoplar el código TypeScript con valores de negocio (nombres de personas, lista de seniorities, etc.), tres tablas en Airtable funcionan como catálogos maestros:

- **Seniorities**: Junior, Intermedio, Senior, Practicas...
- **Hiring Managers**: los líderes responsables de vacantes.
- **Reclutadores**: el equipo de Talento & Cultura.

### Cómo se usan

- **Selects en formularios** (Vacantes, Candidatos): se popula desde los catálogos vía repo.listCatalog('hiring-managers') etc.
- **Cargados automáticamente** al renderizar la página server-side; cero llamadas extra del cliente.
- **CRUD desde la UI**: [`/dashboard/catalogos`](app/src/app/dashboard/catalogos) — agregar/renombrar/eliminar elementos. El cambio se refleja en los selects de toda la app en el próximo render.
- **Persistencia**: en Airtable como tablas separadas con `ID_*` (auto-incremental) + nombre.

### Validación de campos en endpoints

Los endpoints de Vacantes y Candidatos **NO validan** que `recruiter`/`hiringManager` esté en una lista enum hardcoded (eso hacía que agregar gente al catálogo no funcionara hasta que se cambiara el código). Hoy aceptan `z.string()` y dejan que Airtable (con `typecast: true`) cree la opción si no existe.

---

## 🧩 Componentes UI

### Primitives ([`src/components/ui/`](app/src/components/ui))

Basados en Radix UI + Tailwind. Estilo Shadcn pero implementados a mano con paleta Baldecash.

- **Avatar** — con fallback de iniciales.
- **Badge** — variants: default, outline, success, warning, destructive, blue, aqua, gold.
- **Button** — variants: default, gradient, outline, ghost, destructive; loading state.
- **Card** — shadow multi-capa, hover lift, rounded 2xl.
- **Dialog** — modal con backdrop blur.
- **Dropdown** — menu con items.
- **Input** — text input estándar.
- **Label** — para forms.
- **Select** — dropdown de selección.
- **Skeleton** — loader animado.
- **Switch** — toggle.
- **Tabs** — tab navigation.
- **Tooltip** — popover de hover.

### Dashboard components ([`src/components/dashboard/`](app/src/components/dashboard))

- **KpiCard** — tarjeta KPI con icon, label, value animado, trend %, hint, top accent bar, glow brand permanente.
- **charts.tsx** — 10+ componentes de visualización (ver sección "Gráficos del Resumen").
- **PipelineTable** — tablero tipo Kanban con sombreado por etapa más avanzada.
- **MovementsTable** — tabla read-only de movimientos con tabs y borrado.
- **IngresosTable** — CRUD de ingresos.

### Auth ([`src/components/auth/`](app/src/components/auth))

- **RoleProvider** — context con el rol del usuario logueado.
- **useRole, useCanMutate, useIsAdmin** — hooks para condicionar UI según el rol.

### Brand ([`src/components/brand/`](app/src/components/brand))

- **Logo** — `variant`: `'mark'` (solo símbolo) o `'full'` (símbolo + wordmark).
- **BrandLoader** — spinner animado con gradient brand.

### Providers ([`src/components/providers.tsx`](app/src/components/providers.tsx))

- `ThemeProvider` (next-themes).
- `QueryClientProvider` (TanStack Query).
- `Toaster` (Sonner).

---

## 🎨 Sistema de diseño

### Paleta Baldecash

Tres familias × 7 tonos:

```
Blue:  100 #D6DCED · 200 #98A9DF · 300 #6873D7 · 400 #4453A0 · 500 #31359C · 600 #212469 · 700 #151744
Aqua:  100 #E0F1F3 · 200 #BEF7F3 · 300 #A9DAE6 · 400 #5CBFBE · 500 #36B7B3 · 600 #00A29B · 700 #007974
Gold:  100 #FFF7E6 · 200 #FFEABB · 300 #FEDD90 · 400 #FDCA56 · 500 #D1A646 · 600 #987933 · 700 #4D3D1C
```

### Tokens (CSS variables en `globals.css`)

Modo claro:
```css
--background: 220 33% 97%;
--foreground: 232 52% 12%;
--card: 0 0% 100%;
--border: 225 18% 91%;
--primary: 236 50% 41%;     /* Blue 500 */
--secondary: 178 100% 32%;  /* Aqua 600 */
--accent: 42 98% 67%;       /* Gold 400 */
--radius: 1.25rem;          /* 20px */
```

Modo oscuro: análogo con `.dark` y valores invertidos.

### Colores semánticos por estado/categoría

| Contexto | Color | Hex |
|---|---|---|
| **Estado: En proceso** | azul medio | `#6873D7` |
| **Estado: Contratado** | aqua | `#00A29B` |
| **Estado: Se cayó** | rojo | `#D14646` |
| **Estado: No seleccionado** | dorado oscuro | `#987933` |
| **Prioridad: Alta** | rojo | `#D14646` |
| **Prioridad: Media** | azul brand | `#31359C` |
| **Prioridad: Baja** | aqua | `#00A29B` |
| **Canal: LinkedIn** | azul oficial | `#0A66C2` |
| **Canal: Bumeran** | naranja | `#F97316` |
| **Canal: Facebook** | azul oficial | `#1877F2` |
| **Canal: Referidos** | violeta | `#9333EA` |
| **Canal: Universidad de Lima** | amarillo | `#EAB308` |
| **Canal: Universidad del Pacífico** | azul oscuro | `#1E3A8A` |
| **Charts: En proceso (azul)** | celeste | `#3B9EE5` |
| **Charts: Finalizados (rojo)** | rojo | `#D14646` |

### Sombras premium

```css
shadow-card:
  0 0 0 1px rgba(31,41,82,0.05),
  0 1px 2px rgba(31,41,82,0.04),
  0 6px 16px -4px rgba(31,41,82,0.06),
  0 16px 32px -12px rgba(31,41,82,0.05)
```

Todas usan `rgba(31,41,82,...)` (foreground brand) en vez de negro puro → look premium estilo Stripe/Linear.

---

## 📤 Exportación de reportes

[`src/lib/export.ts`](app/src/lib/export.ts) ofrece:

```ts
exportToExcel(rows: Record<string, any>[], filename: string)
exportToPdf({ title, subtitle?, columns, rows })
```

Usados en `/dashboard/candidatos` y `/dashboard/reportes`.

---

## ☁️ Deploy en Vercel

### Setup inicial

1. Import del repo en Vercel.
2. **Framework Preset**: Next.js.
3. **Root Directory**: `app` ← crítico, no dejar en `./`.
4. **Environment Variables**: agregá las de [Variables de entorno](#-variables-de-entorno).
5. **Storage**: en la pestaña Storage del proyecto, conectá un **Upstash Redis** (Marketplace → Upstash) para persistir usuarios. Vercel auto-inyecta las env vars `KV_*`.
6. Deploy.

### Verificación post-deploy

```bash
curl https://tu-app.vercel.app/api/health
# Devuelve:
# {
#   "ok": true,
#   "source": "airtable",
#   "auth": {
#     "storage": "kv",     ← debería ser "kv" si Upstash está conectado
#     "userCount": 1+
#   }
# }
```

Si `storage: "memory"` → falta la conexión a Upstash o las env vars no se redeployaron.

### Auto-deploy

Vercel detecta los pushes al branch `main` y redespliega automáticamente.

---

## 💻 Desarrollo local

### Scripts

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "type-check": "tsc --noEmit"
}
```

### Workflow recomendado

```bash
cd app
git pull
npm install        # solo si package.json cambió
npm run dev        # http://localhost:3000
npm run type-check # antes de commitear
```

### Hot reload caveats

- Cambios en `.tsx`, `.ts`, `.css` → HMR automático.
- Cambios en `tailwind.config.ts` o `globals.css` → reiniciar dev server.
- Cambios en `.env.local` → reiniciar dev server.
- Cambios estructurales grandes → borrar `.next/` y rebuild.

```powershell
# Windows PowerShell:
Remove-Item -Recurse -Force .next
npm.cmd run dev
```

### Dev local con persistencia de usuarios

Por default, dev local usa el store en memoria. Si querés persistir en el mismo Redis que producción:

1. Vercel → Storage → tu Redis → pestaña `.env.local` → Copy snippet.
2. Pegalo en `app/.env.local`.
3. Reiniciar dev server.

---

## 🐛 Troubleshooting

### `"ChunkLoadError: Loading chunk failed"`
Cache del browser apunta a chunks viejos. Solución:
1. `Ctrl+C` dev server.
2. `Remove-Item -Recurse -Force .next`.
3. `npm run dev`.
4. Hard refresh en navegador (`Ctrl+Shift+R`).

### `"Missing required error components, refreshing..."`
Side-effect de borrar `.next/` con el dev server corriendo. Detené el dev server primero, después borrá `.next`, después arrancá de nuevo.

### `"ENOTFOUND api.airtable.com"`
Problema de red/DNS. Verifica:
```powershell
node -e "require('dns').promises.lookup('api.airtable.com').then(console.log).catch(console.log)"
```
Si falla: desconecta VPN, cambia DNS a `8.8.8.8` / `1.1.1.1`, `ipconfig /flushdns`.

### Login funciona pero crear usuarios "se pierde"
El sistema cae al store en memoria. Verifica:
```bash
curl https://tu-app.vercel.app/api/health
```
Si dice `"storage": "memory"`, falta Upstash. Conectalo y redeploy.

### `"Credenciales inválidas"` con un usuario recién creado
Probable que `storage: "memory"` esté activo en producción. Sin Upstash, los usuarios creados se pierden al cold start. Solución: conectar Upstash.

### `"Value need to be finite number for Intl.RelativeTimeFormat"`
Fecha vacía pasada a `relativeTime()`. Ya está blindado, pero si vuelve a aparecer significa que algún campo de Airtable está vacío. Revisar `appliedAt`.

### Scroll horizontal del body
Ya está corregido: el layout principal usa `min-w-0 + overflow-x-hidden` y las tablas tienen scroll interno. Si vuelve a aparecer, probablemente algún componente nuevo no respeta `min-w-0` en sus flex children.

### Las vacantes cerradas no aparecen al crear candidato
Es intencional: el dropdown filtra `v.status !== 'Cerrada'`. Las vacantes cerradas siguen siendo visibles en la tabla de Vacantes y en filtros de búsqueda.

### El gráfico "Salario final vs banda" no muestra un ingreso recién creado
3 condiciones tienen que cumplirse:
1. El ingreso tiene `Salario final` definido.
2. El candidato tiene una vacante asignada.
3. **Esa vacante tiene un rango salarial creado** en la tabla de Bandas salariales.

Si falta una, el ingreso queda en el contador "X ingresos fueron excluidos" debajo del chart.

### 404 NOT_FOUND en Vercel
**Root Directory** mal configurado. Settings → General → Root Directory = `app`. Redeploy.

---

## 🧠 Decisiones técnicas no obvias

### 1. Por qué `'use client'` solo en interactivos
Server Components son default. Solo se marcan client cuando necesitan estado/effects/event handlers. Esto mantiene el JS del cliente al mínimo (~88kB shared).

### 2. Por qué agrupar fechas por string `YYYY-MM-DD`
Para gráficos diarios. `new Date("2026-04-29")` se interpreta como UTC midnight, que en UTC-5 (Lima) es 19:00 del 28 de abril → bucketing por timestamp corre 1 día. Usar `appliedAt.slice(0, 10)` como key evita el problema.

### 3. Por qué Auth en Upstash y data operativa en Airtable
- Los usuarios del sistema cambian raramente y necesitan password hashing. Mezclarlos con la data operativa ensucia la base de Airtable.
- En Vercel serverless, la memoria local de cada lambda se reinicia con cada cold start. Sin un store persistente, los usuarios "creados" desaparecen en minutos. Upstash Redis es el storage natural en Vercel para este caso (key-value, low-latency).
- Airtable no está optimizado para auth y mostrar password hashes en su UI sería incómodo.

### 4. Por qué el modal de cambio de etapa abre un calendario
El equipo necesita registrar la fecha **real** en que ocurrió la etapa (no la fecha de edición). Sin el calendario, todas las etapas quedarían con la fecha actual, perdiendo el contexto histórico.

### 5. Por qué la conversión es mensual sobre total de candidatos
Versión anterior usaba `Contratado / (Contratado + Se cayó)` del último mes. Se cambió a `hires_mes / total_candidatos` porque:
- Mensual refleja el momento actual del proceso.
- Sobre el pool total da un porcentaje absoluto fácil de comunicar a dirección ("X% del talento que entró acabó firmando").

### 6. Por qué los campos de Vacantes/Candidatos no usan `Link to another record`
Las relaciones son lógicas vía IDs texto (`VC0001` apuntando a `ID_Vacante`). Si fueran links reales, el cliente JS recibe IDs internos (`recXXX`) en vez de IDs legibles, dificultando la edición manual desde Airtable.

### 7. Por qué pasar `icon={<Users />}` y no `icon={Users}` a KpiCard
Server Components no pueden pasar funciones-componente a Client Components (no son serializables). `<Users />` ya está renderizado como ReactElement.

### 8. Por qué `step="any"` en los inputs numéricos de salario
Algunos navegadores con `step="100"` rechazan en validación HTML5 valores que no son múltiplos de 100, dando la falsa impresión de que "solo deja poner el min o el max". Con `step="any"` cualquier número entero o decimal es válido.

### 9. Por qué el viewer ve los datos pero no los botones
Defensa en 2 capas: el endpoint ya bloquea con 403, pero la UI también esconde los botones para que el viewer no vea opciones que va a recibir como fallidas. Es mejor UX.

### 10. Por qué `typecast: true` en todos los writes a Airtable
Cuando se agrega una persona al catálogo (Hiring Manager nuevo, por ejemplo), el campo singleSelect en Vacantes todavía no tiene esa opción. Con typecast Airtable crea la opción automáticamente. Sin él, el create/update fallaría con 422. El trade-off: typos en la UI también crean opciones (ej. tipear "Linkdin" en vez de "LinkedIn"), por lo que conviene usar selects en vez de inputs libres.

### 11. Por qué los movimientos auto-generados respetan la etapa "más avanzada" por ranking
El ranking del pipeline (`Screening=0, ..., Oferta=4, Ingreso=5`) define cuál es la etapa "más avanzada". Cuando un candidato cambia a una etapa más avanzada, se cierra el movimiento anterior. Si retrocede (raro pero posible), no se cierra nada — el movimiento nuevo simplemente se crea encima del histórico.

### 12. Por qué la "tabla de movimientos" del pipeline es solo lectura + borrar
Los movimientos ahora son auto-generados desde el cambio de etapa de un candidato. Permitir creación manual además daría 2 caminos para crear el mismo dato, lo que lleva a duplicación o inconsistencia. Conservamos solo el botón de eliminar para corregir movimientos espurios (ej. al cambiar y volver de etapa).

### 13. Por qué los gráficos del Resumen no incluyen vacantes cerradas
Las vacantes cerradas son historia. Los charts del Resumen reflejan el "estado activo" del pipeline (vacantes Abierta + En Pausa). Esto evita que datos viejos dominen visualmente las métricas operacionales.

### 14. Por qué las tablas tienen scroll horizontal interno y no del body
El layout principal usa `min-w-0 + overflow-x-hidden`. Sin eso, una tabla ancha empujaría el body horizontalmente, dañando la UX. Con la fix, la tabla scrollea dentro de su container y el resto del layout queda fijo.

### 15. Por qué `revalidatePath` en mutaciones de algunos endpoints
Algunos charts en Server Components (ej. SalaryComparisonChart en `/dashboard/rango-salarial`) dependen de datos que cambian via API. Sin invalidación explícita, el SSR puede devolver datos cacheados aunque el usuario haya editado. `revalidatePath('/dashboard/rango-salarial')` después del POST/PATCH/DELETE garantiza que el próximo render trae datos frescos.

### 16. Por qué `"Entrevista líder"` con minúscula y tilde
Airtable tiene la opción exactamente así. Si el código usa `"Entrevista Líder"` (mayúscula sin tilde), el match falla y los candidatos en esa etapa desaparecen del pipeline. JavaScript es case-sensitive.

---

## 🗺️ Roadmap y pendientes

### Pendientes en Airtable
- [ ] Limpiar las filas vacías en Rango salarial y Fuentes (el código las filtra como ghost records, pero molestan en la UI nativa de Airtable).
- [ ] Considerar migrar IDs lógicos (`ID Vacante`, `ID Candidato`) a Links reales si se necesita integridad referencial cross-table.

### Mejoras de código
- [ ] **Tests E2E con Playwright** (especialmente para auth flow y CRUD principales).
- [ ] **Rate limiting** en `/api/auth/*` para prevenir brute force.
- [ ] **Webhooks de Airtable** para invalidación automática del SSR cuando cambian datos desde Airtable directamente.
- [ ] **Soporte para attachments** en candidatos (CVs adjuntos).
- [ ] **Sentry** o equivalente para observabilidad.
- [ ] Migrar `notifications` y `activity` también a Redis (hoy son in-memory).
- [ ] Reemplazar `bcrypt.compareSync` por `bcrypt.compare` (async) para no bloquear el event loop.

### Nuevas vistas posibles
- [ ] **Quality of hire** desde tabla Ingresos (retención, performance, tasa de éxito en período de prueba).
- [ ] **Bottleneck analysis** usando Etapas (tiempo promedio por etapa).
- [ ] **Timeline del candidato** con movimientos cronológicos.
- [ ] **Hiring Manager scorecard**: hires + tiempo por HM.
- [ ] **Vista Kanban con drag & drop** para cambiar etapa.

### Mejoras UX
- [ ] Multi-select de filtros (varias etapas, varias fuentes).
- [ ] Búsqueda fuzzy global con resultados por categoría.
- [ ] Comandos rápidos (Cmd+K) tipo Linear.
- [ ] Modo "mobile" más optimizado (tablas con cards en lugar de scroll).

---

## 🧩 Módulos de Talento & Cultura

> Todo lo de esta sección se construyó **después** del core de Reclutamiento. Reutiliza la misma
> capa de repositorio (`getRepo()`), el mismo middleware/auth/roles y el mismo sistema de diseño.
> La diferencia clave es la **persistencia**: estos datos no existían en la base original de
> Airtable, así que se crearon **tablas nuevas vía la Metadata API** y se mantienen como **fuente
> de verdad en Airtable** (con fallback a stores en memoria/KV para el modo `mock`).

### Mapa de la plataforma (sidebar)

| Sección | Ítems | Rutas |
|---|---|---|
| **Reclutamiento** | Resumen, Candidatos, Pipeline, Vacantes, Fuentes, Rango salarial, Tiempo de revisión, Reportes | `/dashboard`, `/dashboard/candidatos`, … |
| **Colaboradores** | Datos | `/dashboard/colaboradores` |
| **Engagement** | Eventos, Gastos por evento | `/dashboard/engagement`, `/dashboard/engagement/gastos` |
| **Merch** | Órdenes de compra, Usos, Stock | `/dashboard/merch`, `/dashboard/merch/usos`, `/dashboard/merch/stock` |
| **Bienestar & Salud** | Exámenes médicos | `/dashboard/bienestar` |
| **Sitios** | Ocupación de hoy, Reservas anteriores | `/dashboard/sitios`, `/dashboard/sitios/anteriores` |
| **Juegos de mesa** | Estadísticas de reservas | `/dashboard/juegos` |
| **Pagos** | Pagos fijos, RHE | `/dashboard/pagos`, `/dashboard/pagos/rhe` |
| **Administración** | Actividad, Catálogos, Admin, Ajustes | `/dashboard/actividad`, `/dashboard/catalogos`, … |

> El resaltado del sidebar usa **match más específico** (el `href` más largo que sea prefijo del
> pathname gana), para que estando en `/dashboard/merch/usos` no se marque también "Órdenes de
> compra". Ver [`sidebar.tsx`](app/src/app/dashboard/_components/sidebar.tsx).

---

### 🗄️ Persistencia de los módulos nuevos

Hay **tres orígenes** de datos según el dominio:

1. **Airtable (fuente de verdad)** — tablas creadas con la Metadata API:
   - `AirtableRepository` implementa CRUD real contra ellas.
   - `MockRepository` (modo `DATA_SOURCE=mock`) usa stores equivalentes en `src/lib/data/*-store.ts` (KV si está disponible, si no memoria, sembrados con data semilla).
2. **KV / memoria (no Airtable)** — catálogos auxiliares que no ameritan tabla propia:
   - **Tipo de producto** (`product-types-store.ts`) — sembrado con `Merch`, `Snacks`.
   - El `AirtableRepository` **delega** estos métodos a `this.local` (igual que hace con usuarios/actividad/notificaciones).
3. **Upstash Redis** — usuarios/auth (ya documentado arriba).

> **Modo dev local** normalmente corre con `DATA_SOURCE=airtable` y **sin** KV configurado: los
> módulos leen/escriben Airtable real, y los stores `*-store.ts` solo entran en juego en `mock`.
> Cada store en memoria es un **singleton global** (`globalThis.__baldecash_*`) con un *guard*
> defensivo que reconstruye el shape si quedó una versión vieja tras un HMR.

#### Tablas Airtable nuevas (base `appGRC5rRH4m1I8g2`)

| Tabla | Table ID | Campos principales |
|---|---|---|
| **Engagement Áreas** | `tblUiFvvq0qOcyK7r` | `Área` |
| **Engagement Eventos** | `tbldSZKz185oQnQLM` | `Evento`, `Fecha` |
| **Engagement Colaboradores** | `tbl0Dajc7XNSr73Nb` | `Nombre`, `Status`, `Área`, `Fecha Ingreso`, `Fecha Nacimiento`, `DNI`, `Cargo` + **una columna `singleSelect` por evento** |
| **Merch Órdenes de compra** | `tblIqM8tp5ibN8AJv` | `ID Compra`, `Fecha de Compra`, `Tipo de producto`, `Artículo`, `Precio unit`, `Cantidad Comprada`, `Precio Total`, `Cantidad Llegada`, `Fecha de Termino`, `Proveedor`, `Contacto`, `Comentarios` |
| **Merch Usos** | `tblN3gW1GfgYtyM3E` | `ID Compra Usado`, `Fecha`, `Cantidad`, `Precio Unit`, `Monto total`, `Ocasion`, `Evento Especifico` |
| **Merch Gastos Extra** | `tblEfxWHje0xMJYI7` | `Nombre de Gasto`, `Tipo de Gasto`, `Fecha`, `Ocasion`, `Evento Especifico`, `Monto` |
| **Bienestar Examenes Medicos** | `tbl8TGQOE2JAR0c28` | `Colaborador`, `ID Colaborador`, `Fecha de Examen`, `Sede`, `Status`, `Resultado` |
| **Pagos Fijos** | `tblX3EuRiGsY72tSS` | `Nombre de Pago`, `Proveedor`, `Partida`, `Quien Manda`, `Fecha de Pago`, `Ene`…`Dic` (estado por mes), `Programado Fechas` |
| **RHE** | `tblzGSgMmOXBUEdA1` | `Persona`, `Status`, `Contacto`, `Areas`, `Partida`, `Entidad`, `Fecha de Pago`, `Ene`…`Dic` (estado por mes) |
| **Engagement Gastos** | `tblhDLnl7wAq3zCEo` | `Nombre de Gasto`, `ID Evento`, `Evento`, `Mes`, `Monto` |
| **Engagement Gasto Eventos** | `tbll09qOICsGOUxIk` | `Nombre` (catálogo de eventos propio del módulo de gastos) |

> Los IDs de tabla están **hardcodeados** como constantes en [`airtable.ts`](app/src/lib/data/airtable.ts)
> (`ENGAGEMENT_TABLES`, `MERCH_TABLES`, `BIENESTAR_EXAMS_TABLE`), igual que `CATALOG_TABLES`.

---

### 👤 Colaboradores — el maestro de personas

**Ruta:** [`/dashboard/colaboradores`](app/src/app/dashboard/colaboradores) · **Tabla:** "Datos".

Es la **fuente de verdad de las personas** de la empresa. Alimenta la matriz de Engagement y el
formulario de Bienestar.

- **Columnas:** `#` correlativo · Status (`Activo`/`Cese`) · Área · Nombres Completos · Fecha de ingreso · Fecha de nacimiento · DNI · Cargo.
- **CRUD completo** (crear/editar/eliminar; eliminar solo admin). El alta/edición de la persona vive **solo acá**.
- **Tabs Activos / Cese** (segmentador con contadores, igual que Candidatos).
- **Almacenamiento:** el mismo registro de Airtable `Engagement Colaboradores` guarda los atributos de la persona **y** su participación por evento (ver Engagement). Tipo TS: `EngagementParticipant` (`name`, `status`, `area`, `hireDate`, `birthDate`, `dni`, `position`, `participation`).
- **Área:** `singleSelect` alimentado por el catálogo **Engagement Áreas**.

---

### 🎉 Engagement & Cultura — matriz de eventos

**Ruta:** [`/dashboard/engagement`](app/src/app/dashboard/engagement) (ítem "Eventos").

Matriz de participación: **filas = colaboradores**, **columnas = eventos**.

- **Una sola columna de evento a la vez.** Arriba hay una **barra de botones por evento** (generada dinámicamente); la matriz muestra **solo la columna del evento seleccionado** (no se renderizan las 12+ columnas a la vez → escalable). El evento activo se resalta en dorado.
- **Solo editable la participación.** Cada celda cicla entre `Participo` / `No Participo` / `No Aplica` / `Aun No Participa` (badge de color). Status, Área y Nombre se muestran **read-only** (se editan en Colaboradores).
- **Tabs Activos / Cese** + columna `#` correlativa + búsqueda. Tarjetas: colaboradores activos y nº de eventos.
- **"+ Evento"** crea el evento en `Engagement Eventos` **y** una nueva columna `singleSelect` en `Engagement Colaboradores` vía Metadata API. Sobre el botón del evento **activo** hay un menú **▾** para **Renombrar** (renombra la columna) o **Eliminar** (borra el registro de Eventos; la columna queda *huérfana* porque Airtable no permite borrar campos por API). Eliminar evento = **recruiter + admin**.
- **Botón "Todos: Participó"** en el header de la matriz: marca como `Participo` (en el evento activo) a todos los colaboradores **visibles** (respeta la pestaña Activos/Cese y la búsqueda) de una sola vez, con confirmación.
- **Participación indexada por `id` de evento** (`participation: Record<eventId, status>`). En Airtable el join columna↔evento es por **nombre** del evento.

**Gráficos (arriba de la tabla)** — solo colaboradores activos, en [`engagement-charts.tsx`](app/src/components/dashboard/engagement-charts.tsx):
- **Participación por evento** — una dona por evento; **al clickear una porción** (un estado) se listan los nombres **agrupados/ordenados por área**.
- **Participación por área** — barras apiladas (solo `Participó` / `No Participó`).
- **Aún no participa · Desayuno con Ruben** — barras por área; **click en un área → nombres** de quienes no participaron.
- **Eventos no participados · por persona** — barras horizontales con la cantidad de eventos en los que cada activo marcó `No Participo`; **click en una barra → lista de esos eventos**.

**Catálogos:**
- **Áreas** (Airtable `Engagement Áreas`) — editable desde Catálogos; alimenta el select de Área.
- IDs de mock: eventos `EV0001…`, colaboradores `EP0001…`, áreas `AR0001…` (solo en modo `mock`; con Airtable los ids son `recXXX`).

---

### 🛍️ Merch — Órdenes de compra · Usos · Stock

Tres vistas independientes bajo la sección **Merch**.

#### 1) Órdenes de compra — [`/dashboard/merch`](app/src/app/dashboard/merch)
Compras de merch y snacks.
- **ID Compra automático** y correlativo (`C-001`, `C-002`, …) — el campo **no se ingresa** en el form.
- **Tabs "Hay inventario" / "Terminado"**: una orden está terminada cuando `disponible ≤ 0` (ver Stock).
- **Tipo de producto** = catálogo editable (Catálogos → "Tipo de producto"). Badges con color (`Merch` verde, `Snacks` violeta; los nuevos usan color genérico).
- Tipo TS: `PurchaseOrder`. (Las columnas "Foto" y "Cantidad Restante" se quitaron de la UI.)

#### 2) Usos — [`/dashboard/merch/usos`](app/src/app/dashboard/merch/usos)
Consumos de artículos, **conectados a una orden** (`ID Compra Usado`).
- **Form:** ID Compra Usado · Fecha · Cantidad · Ocasión · **Evento específico**. El **artículo, precio unit y monto total** se derivan **siempre de la orden** referenciada (`monto = cantidad × precio unit`), tanto en la tabla como al editar — así un uso nunca muestra un precio distinto al de su orden aunque su snapshot quedara viejo (ver [`usos/page.tsx`](app/src/app/dashboard/merch/usos/page.tsx), `effectiveUsages`).
- **Validación de stock:** no se puede registrar más **cantidad** que la disponible de la orden (input con `max`, aviso en rojo y botón deshabilitado); al editar se le suma de vuelta su propia cantidad para no bloquear el re-guardado.
- **El dropdown de órdenes oculta las que no tienen stock** (`disponible ≤ 0`); en edición se incluye la orden actual aunque esté en 0.
- **"Evento específico"** (campo `comments` en TS, columna `Evento Especifico` en Airtable): texto libre para etiquetar a qué evento puntual pertenece el consumo.
- **Tabs "Dos últimos meses" / "Usos anteriores"** (corte = hoy − 2 meses, por `Fecha`) + **selector "Ordenar por"** (Fecha más reciente *(default)* / Ocasión / Evento específico) + búsqueda. Eliminar = recruiter + admin.
- **Ocasiones:** `Focus Group`, `Regalo`, `Prestamos a Comercial`. Tipo TS: `MerchUsage`.
- **Gráficos** ([`merch-charts.tsx`](app/src/components/dashboard/merch-charts.tsx)): **Gasto por ocasión** (donut) y **Gasto por evento específico** (barras) — ambos **suman usos + gastos extra** del mismo evento/ocasión, y se recalculan al crear/editar/eliminar.

#### 2b) Gastos extra — tabla debajo de Usos
Gastos asociados al merch que **NO consumen stock** (transporte, envío, impresión…).
- **Tabla independiente** con: Tipo de gasto (`Transporte`, `Envio`, `Impresion`, `Almacenaje`, `Otro`) · Nombre de gasto · Ocasión · Evento específico · Monto · Fecha. Ordenada por fecha más reciente; búsqueda y filtro por tipo.
- No tiene orden ni cantidad, por eso queda fuera del cálculo de stock; pero su monto **sí** se suma en los gráficos de gasto por ocasión/evento.
- Tipo TS: `MerchExtraExpense`. Tabla Airtable: **Merch Gastos Extra**. API: `/api/merch/expenses`.

#### 3) Stock — [`/dashboard/merch/stock`](app/src/app/dashboard/merch/stock)
Disponibilidad calculada (solo lectura).
- **Por orden:** `Disponible = Cantidad Comprada − Σ(usos de esa orden)`.
- **Tabs "Disponibles" / "Terminados"** (`disponible > 0` vs `≤ 0`). Tarjetas: total comprado / usado / disponible. Badge de disponible en verde (>0) o rojo (≤0).
- **Gráficos:** barras de **unidades disponibles por artículo** + donut de **qué tipo de producto predomina** (Merch/Snacks).

#### Permisos de borrado (Merch)
A pedido, eliminar **órdenes, usos y gastos extra** quedó disponible para **recruiter + admin** (antes solo admin); el *viewer* sigue en solo lectura (UI + API).

---

### 🩺 Bienestar & Salud — Exámenes médicos

**Ruta:** [`/dashboard/bienestar`](app/src/app/dashboard/bienestar) (ítem "Exámenes médicos").

Seguimiento de exámenes ocupacionales. Cada examen referencia un colaborador.

- **Alta simple (Área → Colaborador):** primero elegís **Área** (desplegable), luego el **Colaborador** filtrado por esa área, y después Fecha de examen, Sede, Status, Resultado. En **edición**, Área y Colaborador quedan **fijos** (consistencia: nadie de Cobranzas termina en otra área).
- **Campos calculados** (en vivo, no se guardan):

  | Campo | Fórmula |
  |---|---|
  | **Próximo examen** | `Fecha de examen + 730 días` |
  | **Máx. para subsanar observaciones** | `Fecha de examen + 30 días` |
  | **Mayor de 39 años** | de la fecha de nacimiento del colaborador; `Sí` si edad **≥ 40**, `No` si menor; **vacío** si no hay fecha de nacimiento |
  | **Precio** | `S/ 77.86` si *Mayor de 39 = Sí*, `S/ 62.54` si *No*, vacío si no se puede calcular |

- **Desplegables:** Sede (`Callao`, `Lima Norte`, `Lima Sur`, `Lima Centro`, `Lima Este`, `Sin asignar`), Status (`Sin asignar`, `Programado`, `Reprogramado`), Resultado (`Apto`, `Apto con observaciones`, `Con observaciones`).
- **Tarjetas:** Exámenes · Programados · Reprogramados · Con observaciones.
- Tipo TS: `MedicalExam`. Constantes: `EXAM_SEDES`, `EXAM_STATUSES`, `EXAM_RESULTS`, `EXAM_PRICE_OVER_39`, `EXAM_PRICE_UNDER_39`.

**Gráficos (arriba de la tabla)** — [`bienestar-charts.tsx`](app/src/components/dashboard/bienestar-charts.tsx):
- **Avance de exámenes** (dona) — activos **con examen** vs **pendientes** (universo = colaboradores activos; "hecho" = tiene ≥1 examen).
- **Inversión por mes** (barras, May–Dic) — suma del precio de los exámenes por mes de realización.
- **Exámenes realizados por área** (barras apiladas por resultado: **Apto** teal · **Apto con observaciones** teal oscuro · **Con observaciones** rojo). Los exámenes sin resultado cargado no se cuentan en este gráfico.
- **Pendientes por área** (barras; **click en un área → nombres** de los activos sin examen).

---

### 📇 Catálogos nuevos (`/dashboard/catalogos`)

La página de Catálogos generalizó su `CatalogCard` con un prop `endpoint`, lo que permite catálogos
que no viven en las tablas de Airtable originales:

| Catálogo | Endpoint | Persistencia | Alimenta |
|---|---|---|---|
| Seniorities / Hiring Managers / Reclutadores | `/api/catalogs/[type]` | Airtable (tablas originales) | Vacantes, Candidatos |
| **Áreas** | `/api/engagement/areas` | Airtable (`Engagement Áreas`) | Colaboradores, Engagement |
| **Tipo de producto** | `/api/merch/product-types` | KV / memoria (`product-types-store`) | Órdenes de compra (Merch) |

---

### 🔌 APIs de los módulos nuevos

Todas con runtime Node.js, validación Zod, control de roles (viewer = solo lectura, recruiter/admin
mutan, **delete = admin**) y log de actividad — idéntico patrón al core.

| Recurso | Endpoints |
|---|---|
| Engagement · Áreas | `GET/POST /api/engagement/areas` · `PATCH/DELETE /api/engagement/areas/[id]` |
| Engagement · Eventos | `GET/POST /api/engagement/events` · `PATCH/DELETE /api/engagement/events/[id]` |
| Engagement · Colaboradores | `GET/POST /api/engagement/participants` · `PATCH/DELETE /api/engagement/participants/[id]` |
| Merch · Órdenes | `GET/POST /api/merch/orders` · `PATCH/DELETE /api/merch/orders/[id]` |
| Merch · Usos | `GET/POST /api/merch/usages` · `PATCH/DELETE /api/merch/usages/[id]` |
| Merch · Gastos extra | `GET/POST /api/merch/expenses` · `PATCH/DELETE /api/merch/expenses/[id]` |
| Merch · Tipo de producto | `GET/POST /api/merch/product-types` · `PATCH/DELETE /api/merch/product-types/[id]` |
| Bienestar · Exámenes | `GET/POST /api/bienestar/examenes` · `PATCH/DELETE /api/bienestar/examenes/[id]` |
| Engagement · Gastos por evento | `GET/POST /api/engagement/expenses` · `PATCH/DELETE /api/engagement/expenses/[id]` |
| Engagement · Eventos de gastos (catálogo) | `GET/POST /api/engagement/gasto-eventos` · `DELETE /api/engagement/gasto-eventos/[id]` |
| Pagos · Pagos fijos | `GET/POST /api/payments` · `PATCH/DELETE /api/payments/[id]` |
| Pagos · RHE | `GET/POST /api/rhe` · `PATCH/DELETE /api/rhe/[id]` |

> En **Merch, Pagos y RHE** el `DELETE` permite **recruiter + admin** (viewer = 403); en el resto el patrón histórico es **delete = admin**.

> Los métodos del repositorio asociados: `listEngagementAreas/Events/Participants` (+ create/update/delete),
> `listPurchaseOrders`, `listMerchUsages`, `listMerchProductTypes`, `listMedicalExams`, etc.
> Ver la interfaz en [`repository.ts`](app/src/lib/data/repository.ts).

---

### 🧬 Tipos de dominio nuevos ([`types.ts`](app/src/lib/types.ts))

```ts
// Engagement
EmployeeStatus = 'Activo' | 'Cese'
ParticipationStatus = 'Participo' | 'No Participo' | 'No Aplica' | 'Aun No Participa'
ENGAGEMENT_AREAS = ['Cobranzas','Contabilidad y controller','Convenciones y alianzas','Growth',
                    'Legal','Talento & Cultura','Tecnologia y finanzas','Ventas','Operaciones']
EngagementEvent { id, name, date? }
EngagementParticipant { id, name, status, area?, hireDate?, birthDate?, dni?, position?,
                        participation: Record<eventId, ParticipationStatus> }

// Merch
PRODUCT_TYPES = ['Merch','Snacks']            // semilla del catálogo editable
PurchaseOrder { id, orderId, purchaseDate?, productType, article, photoUrl?, unitPrice?,
                qtyOrdered?, totalPrice?, qtyArrived?, qtyRemaining?, endDate?, supplier?,
                contact?, comments? }
MERCH_OCCASIONS = ['Focus Group','Regalo','Prestamos a Comercial']
MerchUsage { id, usageDate?, orderId, quantity?, unitPrice?, totalAmount?, occasion?,
             comments? }   // comments = "Evento específico"
MERCH_EXPENSE_TYPES = ['Transporte','Envio','Impresion','Almacenaje','Otro']
MerchExtraExpense { id, name?, expenseType?, date?, occasion?, event?, amount? }

// Bienestar
EXAM_SEDES, EXAM_STATUSES = ['Sin asignar','Programado','Reprogramado'],
EXAM_RESULTS = ['Apto','Apto con observaciones','Con observaciones']
EXAM_PRICE_OVER_39 = 77.86 · EXAM_PRICE_UNDER_39 = 62.54
MedicalExam { id, collaboratorId, collaboratorName, examDate?, sede?, status?, resultado? }

// Pagos (Pagos fijos + RHE comparten estados y meses)
PAYMENT_STATUSES = ['Pendiente','Programado','Parcial','Automatico','Listo','No se realizo']
PAYMENT_MONTHS = [{key:'ene',label:'Ene',full:'Enero'}, … 'dic']   // 12 meses
DEFAULT_PAYMENT_STATUS = 'Pendiente'
FixedPayment { id, name, provider?, partida?, sender?, paymentDate?,
               status: Record<monthKey, PaymentStatus>,
               scheduledAt?: Record<monthKey, string> }   // fecha/hora de "Programado"
RheEntry { id, person, personStatus?, contact?, area?, partida?, entity?, paymentDate?,
           status: Record<monthKey, PaymentStatus> }

// Engagement — gastos por evento
EngagementExpense { id, eventId, eventName?, month, name, amount? }
```

---

### 🔁 Scripts de datos (carga puntual)

Scripts Node sueltos en [`app/scripts/`](app/scripts) (se ejecutan con el dev server corriendo;
hacen login con el admin y pegan a la API local):

| Script | Qué hace |
|---|---|
| `airtable-sync-merch-engagement.js` | Crea (idempotente) y puebla las tablas Airtable de Engagement y Merch desde la API en vivo. |
| `fill-colaboradores.js` | Carga DNI, fecha de ingreso, cargo y área de cada colaborador. |
| `fill-birthdates.js` | Carga la fecha de nacimiento de cada colaborador. |
| `fill-examenes.js` | Carga los exámenes médicos iniciales (fecha, sede, resultado). |

```bash
cd app
node scripts/fill-colaboradores.js   # con npm run dev corriendo en :3000
```

---

### ⚙️ Nota de dev: caché de webpack en Windows

En desarrollo, la caché de webpack en disco (`.next/cache`) se corrompía intermitentemente en
Windows (errores `Cannot read properties of undefined (reading 'call')` al cargar rutas y fallos de
rename de `*.pack.gz`), lo que provocaba 500s aleatorios y cuelgues del dev server. Por eso
[`next.config.mjs`](app/next.config.mjs) **desactiva la caché de webpack en dev**:

```js
webpack: (config, { dev }) => { if (dev) config.cache = false; return config; }
```

Si igual aparece un `ChunkLoadError` o un 500 raro: detené el dev server, `Remove-Item -Recurse
-Force .next`, `npm run dev` y hard-refresh (`Ctrl+Shift+R`).

---

### 📌 Decisiones / supuestos a confirmar (módulos nuevos)

- **"Mayor de 39 años" = edad ≥ 40** (interpretación literal de "mayor de 39"). Cambiable en
  [`examenes-page.tsx`](app/src/app/dashboard/bienestar/examenes-page.tsx) y [`bienestar/page.tsx`](app/src/app/dashboard/bienestar/page.tsx).
- **Stock usa `Cantidad Comprada`** (no `Cantidad Llegada`) como base del disponible.
- **Engagement: una columna por evento** (formato ancho, como la planilla original). Implica crear/
  renombrar campos en Airtable al vuelo y deja columnas huérfanas al borrar un evento (limitación de Airtable).
- **Una sola fuente de verdad para personas**: el registro de `Engagement Colaboradores` cumple doble
  rol (datos personales + matriz de participación). Colaboradores edita los atributos; Eventos edita la participación.

---

## 💸 Pagos, Gastos por evento y mejoras recientes

> Esta sección documenta lo construido en la iteración más reciente: el **módulo de Pagos**
> (Pagos fijos + RHE), el sub-módulo **Gastos por evento** de Engagement, y varias mejoras
> transversales. Todo reutiliza la misma arquitectura (repositorio único, auth/roles, diseño) y
> persiste en **Airtable** (tablas nuevas creadas vía Metadata API; ver tabla de IDs en la sección 25).

### Estados de pago (compartidos por Pagos fijos y RHE)

Constante `PAYMENT_STATUSES` con su color y la pestaña en la que cae:

| Estado | Color | Significado | Pestaña |
|---|---|---|---|
| **Pendiente** | rojo `#D14646` | sin gestionar (valor por defecto de cada mes) | Pendiente |
| **Programado** | morado `#7C3AED` | agendado para pago | Programado |
| **Parcial** | azul `#2563EB` | pagado parcialmente | (solo en "Todos") |
| **Automatico** | cian `#0891B2` | débito/pago automático | Listo |
| **Listo** | verde `#22C55E` | pagado | Listo |
| **No se realizo** | gris `#94A3B8` | no se ejecutó | Listo |

- Los **12 meses** se modelan con `PAYMENT_MONTHS` (`{key:'ene',label:'Ene',full:'Enero'}`…). El estado por mes vive en `status: Record<monthKey, PaymentStatus>`; un mes ausente se considera **Pendiente**.
- En Airtable cada mes es una columna `singleSelect` (`Ene`…`Dic`); el repositorio mapea `label ↔ key`. Como todos los writes usan `typecast: true`, las opciones (incl. `Parcial`/`Automatico`) se crean solas al usarse.

---

### 💳 Pagos fijos — [`/dashboard/pagos`](app/src/app/dashboard/pagos)

Pagos mensuales recurrentes (servicios, alquileres, seguros, etc.).

- **Columnas:** `#` · **Nombre de pago** · **[Mes seleccionado]** (2ª columna, al frente) · Proveedor · Partida · Quien manda · Fecha de pago · Acciones. Tipo TS: `FixedPayment`.
- **Barra de meses (Ene–Dic):** muestra **una sola columna de mes a la vez** (arranca en el mes actual; el activo en dorado). Misma lógica que la matriz de Eventos → no se hace ancha.
- **Estado por celda:** dropdown con los 6 estados; default Pendiente. Cambio con guardado optimista.
- **"Automático en varios meses…":** ítem extra en el dropdown que abre un diálogo con los 12 meses como toggles para marcar/desmarcar en qué meses el pago es **Automatico** de una sola vez (los que se desmarcan vuelven a Pendiente). Componente: [`auto-months-dialog.tsx`](app/src/components/dashboard/auto-months-dialog.tsx).
- **Pestañas:** **Pendiente · Programado · Listo · Todos** (la pestaña "Listo" agrupa **Listo + Automatico + No se realizo** = pagos ya resueltos), con contadores en vivo según el mes elegido.
- **Tarjetas-resumen** del mes: conteo por cada estado.
- **Gráficos** ([`payments-charts.tsx`](app/src/components/dashboard/payments-charts.tsx)):
  - **Estado de pagos · {mes}** (donut) — distribución de estados del mes, con el total al centro.
  - **Pagos por gestionar por mes** (barras apiladas) — Pendiente + Parcial + Programado por mes (lo que falta cerrar); click en una barra → salta a ese mes.
- **Programados de {mes}** (tarjeta debajo de la tabla): por cada pago en estado Programado, su **Fecha de pago** y la **"Programado el"** — fecha/hora **editable** (`datetime-local`) que se autocompleta con el momento en que se marcó Programado y se persiste en la columna `Programado Fechas` (JSON `{mes: fecha}` que gestiona la app, campo `scheduledAt` en TS).
- **Cuándo se ejecutan los programados** ([`payment-execution-schedule.tsx`](app/src/components/dashboard/payment-execution-schedule.tsx)) — herramienta **solo visual**, no afecta nada del sistema:
  - Regla: los pagos se ejecutan **martes y jueves**; cortes **lunes 17:00** y **miércoles 17:00**. Se toma el **próximo corte ≥** a la fecha/hora de programación y el pago se ejecuta **el día siguiente** al corte (martes tras el corte del lunes, jueves tras el del miércoles).
  - Ej.: programado el lunes 18:00 → pasó el corte del lunes → próximo corte miércoles 17:00 → **se ejecuta el jueves**.
  - Visual: tarjetas por **fecha de ejecución** (ej. "martes 16 jun · 3") listando los pagos que caen ese día.

---

### 🧾 RHE — [`/dashboard/pagos/rhe`](app/src/app/dashboard/pagos/rhe)

Recibos por honorarios (personas pagadas por honorarios). **Misma lógica que Pagos fijos** (barra de meses, estado por mes, pestañas, gráficos reutilizados), con columnas propias:

- **Columnas:** `#` · **Persona** (+ contacto en 2ª línea) · **[Mes]** · **Status** (`Activo`/`Cese`, badge editable) · Áreas · Partida · Entidad · Fecha de pago. Tipo TS: `RheEntry`.
- Reutiliza `PaymentsCharts` (el componente acepta cualquier entidad con `status: Record<mes, estado>`).
- Datos semilla cargados desde la planilla (14 personas, entidad `BK`, etc.).

---

### 🪙 Engagement · Gastos por evento — [`/dashboard/engagement/gastos`](app/src/app/dashboard/engagement/gastos)

Apartado propio dentro de Engagement (separado de la matriz de participación) para registrar **gastos por evento y mes**.

- **Catálogo de eventos propio** (tabla `Engagement Gasto Eventos`), **independiente** de los eventos de participación (Desayuno con Rubén, etc.) — **arranca vacío**; el usuario registra sus eventos con **"+ Evento"** y los elimina con la **✕** del evento activo.
- **Barra de meses** + **barra de eventos** (misma lógica de botones). Al elegir mes + evento, la tabla muestra los gastos: **Nombre de gasto** y **Monto gastado**, con fila de Total y CRUD. Tipo TS: `EngagementExpense`.
- **Gráficos arriba** ([`gastos-por-evento.tsx`](app/src/app/dashboard/engagement/gastos-por-evento.tsx)):
  - **Gasto total por mes** (todos los eventos) — barras Ene–Dic; click → cambia de mes.
  - **Gastos por evento · {mes}** — barras horizontales con cuánto gastó cada evento en el mes seleccionado; click → selecciona ese evento.
- APIs: `/api/engagement/expenses` (gastos) y `/api/engagement/gasto-eventos` (catálogo de eventos).

---

### 🧩 Patrón reutilizable "mes + estado/categoría"

Pagos fijos, RHE y Gastos por evento comparten un patrón de UI:
- **Barra de botones de mes** (`PAYMENT_MONTHS`) que muestra una sola columna/vista a la vez (evita tablas anchas e inescalables).
- **Barras de botones por categoría** (eventos) generadas dinámicamente desde la base.
- **Pestañas por estado** que filtran y cuentan en vivo.
- **Gráficos reactivos** que se recalculan al crear/editar/eliminar (update optimista + `router.refresh()`).

> **Nota de dev:** durante esta iteración volvió a aparecer la corrupción de la caché de webpack en Windows (`Cannot read properties of undefined (reading 'length' / 'call')`, 500s en todas las rutas). Se resuelve con: detener el dev server → `Remove-Item -Recurse -Force .next` → `npm run dev`. Correr **un solo** `next dev` por proyecto (varias instancias comparten `.next` y se corrompen).

---

## 🛰️ Integraciones Supabase en vivo (Sitios · Juegos de mesa)

> A diferencia del resto de la plataforma (Airtable + Upstash), estos dos apartados leen **datos en
> vivo desde proyectos Supabase de terceros** (dos apps independientes de la oficina). Son **solo
> lectura**: el sistema **nunca escribe** en esos Supabase. Todo el acceso a Supabase es
> **server-only** (`import 'server-only'`); las credenciales viven en `app/.env.local` (gitignored) y
> nunca se exponen al navegador. Si un módulo no está configurado, muestra su pantalla
> `not-configured.tsx` y el resto de la app sigue funcionando.

### Comparación rápida

| | **Sitios** (Desk Buddy) | **Juegos de mesa** |
|---|---|---|
| Ruta | [`/dashboard/sitios`](app/src/app/dashboard/sitios) (+ `/anteriores`) | [`/dashboard/juegos`](app/src/app/dashboard/juegos) |
| App de origen | Desk Buddy (reserva de escritorios) | App de reserva de juegos de la oficina |
| RLS | `TO authenticated` → **requiere login** | SELECT **público** → basta la anon key |
| Auth al Supabase | Usuario dedicado de solo lectura + login de 2 pasos | Ninguno (anon/publishable key) |
| Realtime | Token de sesión corto vía server (`realtime.setAuth`) | Anon key directa desde el navegador |
| Código | `lib/sitios/{client,queries,types}.ts` | `lib/juegos/{client,queries,types}.ts` |

---

### 🖥️ Sitios — ocupación de escritorios (Desk Buddy)

Espejo de solo lectura de **Desk Buddy**, la app de reserva de escritorios. Muestra la ocupación de
hoy, próximas reservas, bloqueos y el histórico.

**Autenticación de 2 pasos ([`client.ts`](app/src/lib/sitios/client.ts)).** Las políticas RLS de
Desk Buddy son `TO authenticated`, así que la anon key no basta — el server inicia sesión con un
**usuario dedicado de solo lectura**. Desk Buddy no usa email real para auth: primero se llama la
edge function `resolve-login` (mapea el correo → email sintético `dni-<DNI>@deskflow.local`) y
recién ese email va a `signInWithPassword`. La sesión se **cachea** y se re-loguea con 60 s de
margen antes de expirar. Si `resolve-login` no existe, cae al identificador original para no romper.

**Realtime sin exponer credenciales.** El navegador necesita autorizar su canal Realtime, pero la
contraseña jamás debe salir del server. Solución: `/api/sitios/realtime-token` (gated por sesión)
devuelve un **access token JWT de vida corta** + URL + anon key; el navegador lo usa con
`realtime.setAuth(token)` para suscribirse a los cambios. Nunca viaja ni la contraseña ni el refresh
token.

**Snapshot ([`queries.ts`](app/src/lib/sitios/queries.ts)).** `getSitiosSnapshot()` lee en paralelo
`floors`, `desks`, `profiles`, `reservations` (hoy → +14 días), `desk_blocks` y `worker_statuses`, y
los enriquece (reserva → nombre de persona, equipo, número de escritorio, piso).
- **Ocupación de hoy = reservados ∪ bloqueados**, replicando la fórmula de Desk Buddy
  (`isDeskBlockedOnDate`: bloqueos por fecha específica, o por día de semana ISO, persistentes o de
  la semana en curso). Los segmentos por piso evitan doble conteo:
  `reservedToday + blockedToday = occupiedToday` (tipo `FloorOccupancy`).
- KPIs: total de escritorios, reservados hoy, libres hoy, `occupancyPct`, total de personas.
- `getSitiosPastReservations()` trae el histórico (`date < hoy`, más recientes primero) para la
  vista **Reservas anteriores**.

**Walk-ins — dato PROPIO del sistema (nunca toca Desk Buddy).** "Vinieron sin reservar" es
información que Desk Buddy no tiene, así que se guarda **solo localmente** (KV/memoria) en
[`sitios-walkins-store.ts`](app/src/lib/data/sitios-walkins-store.ts), tipo `SitioWalkin`.
- API: `/api/sitios/walkins` (GET/POST) + `/api/sitios/walkins/[id]` (DELETE). **recruiter+admin**
  mutan; **viewer** es read-only (403 al escribir).
- UI: en la página principal, tarjeta **"Vinieron sin reservar · hoy"** (form nombre + piso + lista
  con borrar); en **Reservas anteriores**, gráfico `WalkinsByPersonChart` filtrado por el mes
  elegido, junto al de no-shows (`NoShowByPersonChart`).

> **Cuenta de servicio:** hoy Sitios inicia sesión con la cuenta personal de Mariana usada como
> cuenta de servicio de solo lectura. **Si cambia su contraseña, Sitios deja de leer** — actualizar
> `SITIOS_SUPABASE_PASSWORD` en `app/.env.local` y reiniciar el server. Las edge functions
> `register-user` / `admin-create-user` del proyecto permiten crear una cuenta dedicada en el futuro.

---

### 🎲 Juegos de mesa — estadísticas de reservas

Estadísticas en vivo de la app de reserva de juegos de mesa de la oficina. **Mucho más simple que
Sitios:** el RLS de SELECT es **público**, así que basta la **anon/publishable key**
(`sb_publishable_...`) — sin usuario de servicio, sin login, sin `resolve-login`
([`client.ts`](app/src/lib/juegos/client.ts)).

**Realtime.** Con RLS público la anon key basta para suscribirse a `postgres_changes` de `reservas`;
`/api/juegos/realtime-config` (gated por sesión) expone URL + anon key y el navegador abre su propio
canal. No hay token de sesión corto como en Sitios.

**Tabla `reservas`** (esquema `public`): `id`, `game_id` (`uno`, `uno-no-mercy`, `virus`, `basta`,
`set-100`…), `day_key` (`hoy`/`mañana`), `date_iso` (date), `slot` (`12-13` → se formatea a
`12:00–13:00`), `colaborador`, `created_at`.

**Snapshot ([`queries.ts`](app/src/lib/juegos/queries.ts)).** `getJuegosSnapshot()` lee todas las
reservas y las agrega para la UI:
- **Por mes** (`byMonth`): total de reservas + colaboradores distintos.
- **Por juego** (`byGame`, desc) y **por horario** (`bySlot`, orden cronológico).
- KPIs: total de reservas, personas distintas (histórico), juego más reservado, horario más
  reservado.
- Nombres legibles y formato de horarios en `prettyGameName` / `prettySlot` — un `game_id`
  desconocido se "prettifica" solo.
- Gráficos en la UI: `TopGamesChart`, `ReservasByMonthChart`, `TopPeopleChart`, `TopSlotsChart`.

**"Eliminar" = ocultación SOLO del sistema (nunca borra en Supabase).** El botón de eliminar en
"Reservas recientes" **no toca la app de origen**: es un store local de IDs ocultos
([`juegos-hidden-store.ts`](app/src/lib/data/juegos-hidden-store.ts), KV/memoria) que
`getJuegosSnapshot` filtra de la tabla **y de todas las stats**. Es **reversible**: la API
`/api/juegos/hidden` acepta `hidden:true` (oculta) / `hidden:false` (restaura); **recruiter+admin**,
viewer 403. En UI hay confirmación + toast "Deshacer".

---

## 👥 Créditos

Construido para **Baldecash** por el equipo de desarrollo interno.

Tecnologías de terceros usadas (todas open source):
- Next.js (Vercel)
- React (Meta)
- Tailwind CSS
- Radix UI
- Framer Motion
- Recharts
- Airtable SDK
- @supabase/supabase-js (Sitios · Juegos, solo lectura)
- jose / bcryptjs / zod
- @upstash/redis
- Lucide Icons
- Sonner

---

## 📄 Licencia

Privado — Baldecash 2026. Uso interno.

---

<div align="center">

**Repo**: https://github.com/marianagomez-crypto/Dashboard-reclutamiento

</div>

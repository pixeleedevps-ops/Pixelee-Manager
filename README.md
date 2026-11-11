# PIXELÉE MANAGER — FASE 1

Panel administrativo interno para la operación de Pixelée, conectado
**directamente al esquema existente** de Supabase (proyecto
`pyboszwmrzvzzpekmeps`). Sin datos ficticios: todo lo que se muestra viene de
la base de datos real.

> 📄 La referencia completa del esquema está en [`SUPABASE_SCHEMA_MAP.md`](./SUPABASE_SCHEMA_MAP.md):
> 37 tablas, columnas, tipos, FK, índices, CHECK, triggers, RLS y mapeo a módulos.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React + Vite + JavaScript + Tailwind CSS + Lucide + Recharts |
| Backend | Node.js + Express + JavaScript |
| Base de datos | Supabase PostgreSQL (Session pooler IPv4) |
| Autenticación | Supabase Auth (GoTrue) |
| Gestor de paquetes | **pnpm** (nunca npm) |

No se usa Prisma, TypeScript, Docker, Google Sheets ni microservicios.

---

## Instalación y ejecución

```bash
# 1. Instalar dependencias
pnpm install

# 2. Variables de entorno
cp server/.env.example server/.env
#    Editar server/.env con DATABASE_URL, SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY
#    (en este proyecto ya está configurado)

# 3. Aplicar la migración incremental (solo CREATE TABLE IF NOT EXISTS)
pnpm db:migrate

# 4. Arrancar API (:4000) y frontend (:5173) en paralelo
pnpm dev

# 5. Abrir
#    http://localhost:5173
```

Otros comandos:

```bash
pnpm dev:server          # solo el API
pnpm dev:client          # solo Vite
pnpm test                # 28 pruebas (unitarias, API e integración real con Supabase)
pnpm build               # build de producción del cliente
pnpm db:seed             # alta del admin (opcional; ver más abajo)
```

---

## Primer inicio de sesión

**No hay usuarios precreados** (no se inventan credenciales). La forma más
sencilla es registrarse desde la propia pantalla de login:

1. Abre `http://localhost:5173`.
2. Pulsa **«¿Primera vez? Crear cuenta de administrador»**.
3. Elige tu correo y contraseña (mínimo 6 caracteres).
4. El **primer usuario** recibe automáticamente el rol `administrador` activo.

Alternativamente, crea el usuario en Supabase Dashboard →
**Authentication → Users → Add user** con «Auto Confirm»; al iniciar sesión
el backend le crea el perfil de administrador.

> En FASE 1 no hay SMTP configurado y `mailer_autoconfirm = false`. Por eso
> `AUTO_CONFIRM_SIGNUP=true` crea el usuario de Auth ya confirmado sin enviar
> correo (evita el límite de envío de GoTrue). Es equivalente a «Auto Confirm»
> del dashboard y no modifica la estructura de la base de datos.
> Ponlo en `false` si configuras correo real.

Si ya existen perfiles, los nuevos usuarios quedan con rol `soporte` e
**inactivos**: un administrador debe activarlos y asignarles rol en
**Configuración → Usuarios y roles**.

---

## Módulos

| Módulo | Contenido |
|---|---|
| **Dashboard** | Clientes, proyectos, cotizaciones, facturas, recaudos, gastos, utilidad, cuentas por cobrar, leads, tickets, actividad reciente y próximas entregas |
| **Clientes** | Empresas, contactos, documentos + vista de detalle con proyectos, contratos, facturas, recaudos, dominios, hosting, sitios, tickets y más |
| **Contabilidad** | Cotizaciones, ítems, facturas, recaudos, contratos, gastos, gastos extras, bonificaciones, costos, distribuciones, participaciones y retiros |
| **Desarrollo** | Proyectos, servicios, tareas, horas, entregables, historial, contratos, documentos, dominios, hosting, sitios, tickets e incidencias |
| **Marketing** | Campañas, métricas (inversión/leads/conversiones), prospectos, seguimientos y catálogo de servicios |
| **Operaciones** | Dominios, hosting, sitios web, renovaciones, mantenimiento, tickets, incidencias, encuestas y documentos |
| **Gerencia** | Ingresos, gastos, utilidades, rentabilidad por cliente/proyecto, cuentas por cobrar, distribuciones, retiros, actividad del equipo y **sección privada «Mis utilidades»** |
| **Configuración** | Usuarios y roles (Supabase Auth), catálogo de servicios, auditoría, migraciones y estado de la conexión |

Cada entidad tiene: listado, búsqueda (insensible a tildes), filtros,
paginación, vista de detalle con relaciones, crear/editar/eliminar,
estados de carga, mensajes de error y estados vacíos.

Los formularios se **generan desde `/api/schema`**, que sale del catálogo real
de columnas: no hay campos ficticios.

---

## Seguridad

- **RLS se conserva intacto** (30 tablas con RLS activado, 0 políticas).
  El backend se conecta con el rol `postgres` del pooler
  (`rolbypassrls = true`) sin desactivar nada.
- El control de acceso se aplica en la capa API con la matriz de permisos
  por los **6 roles reales** de `public.profiles.role`:
  `administrador`, `direccion`, `comercial`, `desarrollo`, `finanzas`, `soporte`.
- `desarrollo`, `comercial` y `soporte` **no pueden** leer información
  financiera ni la vista de Gerencia.
- El frontend **nunca** recibe `DATABASE_URL` ni claves privadas.
- Cálculos financieros (utilidad, margen, saldos, distribución, CPA) siempre
  en el backend.
- Facturación (`invoices`) y dinero recaudado (`payments` con
  `status='confirmado'`) se mantienen **separados** y nunca se suman entre sí.

---

## Estructura

```
client/src/
  components/   Layout, ui, ResourcePage (CRUD genérico), ModulePage, Overviews
  context/      AuthContext (Supabase Auth + permisos)
  lib/          api.js, format.js (COP, DD/MM/YYYY)
  pages/        Login, Dashboard, Clientes, Contabilidad, Desarrollo,
                Marketing, Operaciones, Gerencia, Configuración
server/src/
  config.js, db.js, app.js
  middleware/   auth.js (JWT/GoTrue + permisos), error.js
  services/     catalog.js, crud.js, finance.js, analytics.js,
                supabaseAuth.js, authAdmin.js, options.js
  controllers/  authController.js, resourceController.js, analyticsController.js
  routes/       index.js
supabase/
  migrations/           0003_pixelee_extras.sql (aditiva)
  legacy-no-aplicar/    diseño anterior, NO se aplica
```

---

## Integraciones pospuestas (FASE 2)

GitHub, Hostinger, dominio, Google Drive API, Google Ads API, Meta Ads API y
OAuth de Google. En FASE 1 los documentos, contratos, actas y comprobantes se
gestionan con **enlaces manuales** (`file_url`, `contract_url`, `quote_url`,
`invoice_url`, `receipt_url`, `delivery_url`).

---

## Estado de FASE 1

- ✅ 28/28 pruebas (incluye CRUD real contra Supabase)
- ✅ Build de producción exitoso
- ✅ 7 módulos + login verificados en navegador, sin errores de consola
- ✅ 37 tablas: 31 originales intactas + 6 incrementales
- ✅ 0 datos ficticios en la base de datos
- ⏸ FASE 2 pendiente de autorización

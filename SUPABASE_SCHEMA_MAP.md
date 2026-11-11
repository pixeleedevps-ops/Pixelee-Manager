# SUPABASE_SCHEMA_MAP — PIXELÉE MANAGER

> Documento generado por inspección directa del catálogo de PostgreSQL de Supabase.
> Proyecto: `pyboszwmrzvzzpekmeps` · región `us-west-2` · PostgreSQL 17.11.
> Conexión verificada: `aws-1-us-west-2.pooler.supabase.com:6543` (Session pooler IPv4).
> **Ningún nombre de columna, relación o restricción fue inventado**: todo sale de `information_schema` / `pg_catalog`.

---

## 1. Resumen del entorno

| Concepto | Valor real |
|---|---|
| Schemas visibles | auth, extensions, graphql, graphql_public, public, realtime, storage, vault |
| Tablas en `public` | **37**: 31 originales + 6 incrementales (migración `0003`) |
| Vistas en `public` | 0 |
| Funciones en `public` | 7 (todas son funciones de trigger) |
| Triggers en `public` | 50 |
| Tipos ENUM | 0 (los estados se validan con CHECK sobre `text`) |
| Secuencias | 0 (todas las PK usan `gen_random_uuid()`) |
| Políticas RLS | 0 |
| Tablas con RLS activado | 30 de 31 |
| Usuarios en `auth.users` | 0 (el primer usuario se crea al iniciar FASE 1) |
| Filas de datos en `public` | 0 en tablas de negocio; 1 en `schema_migrations` (control de versiones) |
| Migraciones aplicadas | `0003_pixelee_extras.sql` (aditiva, sin tocar tablas existentes) |

### 1.1 Seguridad: RLS y conexión

- Las 30 tablas de negocio tienen **RLS activado** y **0 políticas**. La tabla auxiliar `schema_migrations` tiene RLS desactivado.
- PIXELÉE **no modifica, desactiva ni crea políticas RLS**. Se conservan tal cual.
- El backend se conecta con el rol `postgres` del pooler, que tiene `rolbypassrls = true` (verificado en `pg_roles`), por lo que puede operar sin alterar las políticas. El control de acceso se aplica **en la capa API** mediante la matriz de permisos por rol.
- El frontend **nunca** consulta Supabase directamente: no recibe `SUPABASE_SERVICE_ROLE_KEY` ni la cadena `DATABASE_URL`. Todas las peticiones pasan por Express.
- Con la *publishable key* y RLS sin políticas, un cliente directo (PostgREST/anon) no leería ninguna fila: es el comportamiento esperado y se respeta.

### 1.2 Supabase Auth

- `auth.users`: 0 registros. `auth.identities`: 0 registros. No existe ninguna sesión.
- `public.profiles.id` es PK y **FK a `auth.users(id)` ON DELETE CASCADE**: el perfil de negocio se crea a partir del usuario de Auth.
- Roles existentes (CHECK `profiles.role`): `administrador`, `direccion`, `comercial`, `desarrollo`, `finanzas`, `soporte`. **No se crean roles nuevos**.
- Mapeo a los roles requeridos por el panel:

  | Rol del panel | Rol(es) en BD |
  |---|---|
  | Administrador | `administrador` |
  | Gerencia | `direccion` |
  | Contabilidad / Finanzas | `finanzas` |
  | Desarrollo | `desarrollo` |
  | Marketing / Comercial | `comercial` |
  | Soporte | `soporte` |

- `desarrollo`, `comercial` y `soporte` **no tienen** permisos de lectura financiera ni de gerencia (ver §7).

---

## 2. Inventario de tablas

| # | Tabla | Columnas | Módulo | Filas | RLS |
|---:|---|---|---|---:|---|
| 1 | `activity_logs` | 8 | Dashboard / Gerencia | 0 | ON |
| 2 | `campaigns` | 11 | Marketing | 0 | ON |
| 3 | `clients` | 18 | Clientes | 0 | ON |
| 4 | `contacts` | 10 | Clientes → Detalle | 0 | ON |
| 5 | `contracts` | 12 | Desarrollo / Contabilidad | 0 | ON |
| 6 | `deliveries` | 11 | Desarrollo → Detalle | 0 | ON |
| 7 | `documents` | 9 | Clientes / Desarrollo | 0 | ON |
| 8 | `domains` | 13 | Operaciones (Dominios) | 0 | ON |
| 9 | `expenses` | 12 | Contabilidad (Gastos) | 0 | ON |
| 10 | `follow_ups` | 12 | Marketing | 0 | ON |
| 11 | `hosting_accounts` | 14 | Operaciones (Hosting) | 0 | ON |
| 12 | `incidents` | 12 | Operaciones (Soporte) | 0 | ON |
| 13 | `invoices` | 13 | Contabilidad (Facturas) | 0 | ON |
| 14 | `leads` | 14 | Marketing | 0 | ON |
| 15 | `maintenance_plans` | 13 | Operaciones (Mantenimiento) | 0 | ON |
| 16 | `payments` | 14 | Contabilidad (Recaudos) | 0 | ON |
| 17 | `profiles` | 8 | Configuración | 0 | ON |
| 18 | `project_costs` | 9 | Contabilidad / Gerencia | 0 | ON |
| 19 | `project_history` | 6 | Desarrollo → Detalle | 0 | ON |
| 20 | `project_services` | 10 | Desarrollo → Detalle | 0 | ON |
| 21 | `projects` | 19 | Desarrollo | 0 | ON |
| 22 | `quote_items` | 9 | Contabilidad → Detalle cotización | 0 | ON |
| 23 | `quotes` | 15 | Contabilidad (Cotizaciones) | 0 | ON |
| 24 | `renewals` | 11 | Operaciones (Renovaciones) | 0 | ON |
| 25 | `schema_migrations` | 2 | (infraestructura) | 0 | off |
| 26 | `service_catalog` | 8 | Marketing / Configuración | 0 | ON |
| 27 | `surveys` | 9 | Operaciones (Soporte) | 0 | ON |
| 28 | `tasks` | 13 | Desarrollo → Detalle | 0 | ON |
| 29 | `tickets` | 14 | Operaciones (Soporte) | 0 | ON |
| 30 | `time_entries` | 9 | Desarrollo / Gerencia | 0 | ON |
| 31 | `websites` | 14 | Operaciones (Sitios) | 0 | ON |

---

## 3. Detalle de cada tabla

### `activity_logs`

**Descripción:** Auditoría automática (trigger `log_activity()`) de INSERT/UPDATE/DELETE con `old_data`/`new_data`.

**Funcionalidad:** Actividad reciente · **Módulo del panel:** Dashboard / Gerencia

**Operaciones permitidas:** Solo lectura (generada por triggers).

**RLS:** activado, 0 políticas.

| Campo | Tipo | Nulo | Default / PK |
|---|---|---|---|
| `id` | `uuid` | NO | **PK** · `gen_random_uuid()` |
| `user_id` | `uuid` | SÍ | — |
| `table_name` | `text` | NO | — |
| `record_id` | `uuid` | SÍ | — |
| `action` | `text` | NO | — |
| `old_data` | `jsonb` | SÍ | — |
| `new_data` | `jsonb` | SÍ | — |
| `created_at` | `timestamp with time zone` | NO | `now()` |

**Claves foráneas:**

- `activity_logs_user_id_fkey`: FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL

**Restricciones CHECK (valores permitidos reales):**

- CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))

**Índices:** `idx_activity_created`, `idx_activity_user`.

---

### `campaigns`

**Descripción:** Campañas de marketing con `channel`, `objective`, `budget`, fechas y estado. **No tiene inversión real ni leads/conversiones**.

**Funcionalidad:** Campañas y presupuestos · **Módulo del panel:** Marketing

**Operaciones permitidas:** CRUD completo.

**RLS:** activado, 0 políticas.

| Campo | Tipo | Nulo | Default / PK |
|---|---|---|---|
| `id` | `uuid` | NO | **PK** · `gen_random_uuid()` |
| `name` | `text` | NO | — |
| `channel` | `text` | SÍ | — |
| `objective` | `text` | SÍ | — |
| `budget` | `numeric(14,2)` | SÍ | `0` |
| `start_date` | `date` | SÍ | — |
| `end_date` | `date` | SÍ | — |
| `status` | `text` | NO | `'planificada'::text` |
| `notes` | `text` | SÍ | — |
| `created_at` | `timestamp with time zone` | NO | `now()` |
| `updated_at` | `timestamp with time zone` | NO | `now()` |

**Restricciones CHECK (valores permitidos reales):**

- CHECK ((status = ANY (ARRAY['planificada'::text, 'activa'::text, 'pausada'::text, 'finalizada'::text])))
- CHECK (((end_date IS NULL) OR (start_date IS NULL) OR (end_date >= start_date)))
- CHECK ((budget >= (0)::numeric))

**Triggers:** `trg_campaigns_updated_at`.

---

### `clients`

**Descripción:** Empresas / personas cliente. `company_name` es la razón social; `code` es el código único de negocio.

**Funcionalidad:** Maestro de clientes · **Módulo del panel:** Clientes

**Operaciones permitidas:** CRUD completo · borrado restringido si tiene proyectos/facturas/pagos (FK RESTRICT).

**RLS:** activado, 0 políticas.

| Campo | Tipo | Nulo | Default / PK |
|---|---|---|---|
| `id` | `uuid` | NO | **PK** · `gen_random_uuid()` |
| `code` | `text` | NO | — |
| `company_name` | `text` | NO | — |
| `client_type` | `text` | NO | `'empresa'::text` |
| `document_type` | `text` | SÍ | — |
| `document_number` | `text` | SÍ | — |
| `email` | `text` | SÍ | — |
| `phone` | `text` | SÍ | — |
| `website` | `text` | SÍ | — |
| `address` | `text` | SÍ | — |
| `city` | `text` | SÍ | — |
| `country` | `text` | SÍ | `'Colombia'::text` |
| `industry` | `text` | SÍ | — |
| `status` | `text` | NO | `'activo'::text` |
| `notes` | `text` | SÍ | — |
| `created_by` | `uuid` | SÍ | — |
| `created_at` | `timestamp with time zone` | NO | `now()` |
| `updated_at` | `timestamp with time zone` | NO | `now()` |

**Claves foráneas:**

- `clients_created_by_fkey`: FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL

**Restricciones únicas:**

- UNIQUE (code)
- UNIQUE (document_type, document_number)

**Restricciones CHECK (valores permitidos reales):**

- CHECK ((status = ANY (ARRAY['prospecto'::text, 'activo'::text, 'inactivo'::text, 'bloqueado'::text])))
- CHECK ((client_type = ANY (ARRAY['persona'::text, 'empresa'::text])))

**Índices:** `clients_code_key`, `clients_document_type_document_number_key`.

**Triggers:** `trg_clients_audit`, `trg_clients_updated_at`.

---

### `contacts`

**Descripción:** Personas de contacto por cliente, con `is_primary` para el contacto principal.

**Funcionalidad:** Agenda de contactos · **Módulo del panel:** Clientes → Detalle

**Operaciones permitidas:** CRUD completo (ON DELETE CASCADE desde clients).

**RLS:** activado, 0 políticas.

| Campo | Tipo | Nulo | Default / PK |
|---|---|---|---|
| `id` | `uuid` | NO | **PK** · `gen_random_uuid()` |
| `client_id` | `uuid` | NO | — |
| `full_name` | `text` | NO | — |
| `position` | `text` | SÍ | — |
| `email` | `text` | SÍ | — |
| `phone` | `text` | SÍ | — |
| `is_primary` | `boolean` | NO | `false` |
| `notes` | `text` | SÍ | — |
| `created_at` | `timestamp with time zone` | NO | `now()` |
| `updated_at` | `timestamp with time zone` | NO | `now()` |

**Claves foráneas:**

- `contacts_client_id_fkey`: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE

**Índices:** `idx_contacts_client`.

**Triggers:** `trg_contacts_audit`, `trg_contacts_updated_at`.

---

### `contracts`

**Descripción:** Contratos por proyecto con `contract_url` (enlace manual), `amount` y estado.

**Funcionalidad:** Contratos y valor contratado · **Módulo del panel:** Desarrollo / Contabilidad

**Operaciones permitidas:** CRUD completo · `contract_number` único.

**RLS:** activado, 0 políticas.

| Campo | Tipo | Nulo | Default / PK |
|---|---|---|---|
| `id` | `uuid` | NO | **PK** · `gen_random_uuid()` |
| `project_id` | `uuid` | NO | — |
| `contract_number` | `text` | SÍ | — |
| `contract_url` | `text` | SÍ | — |
| `signed_date` | `date` | SÍ | — |
| `start_date` | `date` | SÍ | — |
| `end_date` | `date` | SÍ | — |
| `amount` | `numeric(14,2)` | NO | `0` |
| `status` | `text` | NO | `'pendiente'::text` |
| `notes` | `text` | SÍ | — |
| `created_at` | `timestamp with time zone` | NO | `now()` |
| `updated_at` | `timestamp with time zone` | NO | `now()` |

**Claves foráneas:**

- `contracts_project_id_fkey`: FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE

**Restricciones únicas:**

- UNIQUE (contract_number)

**Restricciones CHECK (valores permitidos reales):**

- CHECK ((status = ANY (ARRAY['borrador'::text, 'pendiente'::text, 'firmado'::text, 'vencido'::text, 'cancelado'::text])))
- CHECK ((amount >= (0)::numeric))

**Índices:** `contracts_contract_number_key`, `idx_contracts_project`.

**Triggers:** `trg_contracts_audit`, `trg_contracts_updated_at`.

---

### `deliveries`

**Descripción:** Entregables con enlace `delivery_url` (Google Drive manual) y estado de revisión.

**Funcionalidad:** Entregables · **Módulo del panel:** Desarrollo → Detalle

**Operaciones permitidas:** CRUD completo.

**RLS:** activado, 0 políticas.

| Campo | Tipo | Nulo | Default / PK |
|---|---|---|---|
| `id` | `uuid` | NO | **PK** · `gen_random_uuid()` |
| `project_id` | `uuid` | NO | — |
| `delivery_name` | `text` | NO | — |
| `description` | `text` | SÍ | — |
| `delivery_url` | `text` | SÍ | — |
| `delivery_date` | `date` | SÍ | — |
| `status` | `text` | NO | `'pendiente'::text` |
| `reviewed_by` | `uuid` | SÍ | — |
| `notes` | `text` | SÍ | — |
| `created_at` | `timestamp with time zone` | NO | `now()` |
| `updated_at` | `timestamp with time zone` | NO | `now()` |

**Claves foráneas:**

- `deliveries_reviewed_by_fkey`: FOREIGN KEY (reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL
- `deliveries_project_id_fkey`: FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE

**Restricciones CHECK (valores permitidos reales):**

- CHECK ((status = ANY (ARRAY['pendiente'::text, 'entregada'::text, 'aprobada'::text, 'rechazada'::text])))

**Índices:** `idx_deliveries_project`.

**Triggers:** `trg_deliveries_updated_at`.

---

### `documents`

**Descripción:** Documentos con `file_url` manual; requiere `client_id` o `project_id` (CHECK).

**Funcionalidad:** Documentos y carpetas (enlaces) · **Módulo del panel:** Clientes / Desarrollo

**Operaciones permitidas:** CRUD completo.

**RLS:** activado, 0 políticas.

| Campo | Tipo | Nulo | Default / PK |
|---|---|---|---|
| `id` | `uuid` | NO | **PK** · `gen_random_uuid()` |
| `client_id` | `uuid` | SÍ | — |
| `project_id` | `uuid` | SÍ | — |
| `document_type` | `text` | NO | — |
| `document_name` | `text` | NO | — |
| `file_url` | `text` | NO | — |
| `uploaded_by` | `uuid` | SÍ | — |
| `created_at` | `timestamp with time zone` | NO | `now()` |
| `updated_at` | `timestamp with time zone` | NO | `now()` |

**Claves foráneas:**

- `documents_client_id_fkey`: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
- `documents_uploaded_by_fkey`: FOREIGN KEY (uploaded_by) REFERENCES profiles(id) ON DELETE SET NULL
- `documents_project_id_fkey`: FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE

**Restricciones CHECK (valores permitidos reales):**

- CHECK (((client_id IS NOT NULL) OR (project_id IS NOT NULL)))

**Índices:** `idx_documents_client`, `idx_documents_project`.

**Triggers:** `trg_documents_updated_at`.

---

### `domains`

**Descripción:** Dominios por cliente/proyecto con registrador, vencimiento y `renewal_cost`.

**Funcionalidad:** Inventario de dominios · **Módulo del panel:** Operaciones (Dominios)

**Operaciones permitidas:** CRUD completo · `domain_name` único.

**RLS:** activado, 0 políticas.

| Campo | Tipo | Nulo | Default / PK |
|---|---|---|---|
| `id` | `uuid` | NO | **PK** · `gen_random_uuid()` |
| `client_id` | `uuid` | NO | — |
| `project_id` | `uuid` | SÍ | — |
| `domain_name` | `text` | NO | — |
| `registrar` | `text` | SÍ | — |
| `registration_date` | `date` | SÍ | — |
| `expiration_date` | `date` | SÍ | — |
| `renewal_cost` | `numeric(14,2)` | SÍ | `0` |
| `auto_renew` | `boolean` | NO | `false` |
| `status` | `text` | NO | `'activo'::text` |
| `notes` | `text` | SÍ | — |
| `created_at` | `timestamp with time zone` | NO | `now()` |
| `updated_at` | `timestamp with time zone` | NO | `now()` |

**Claves foráneas:**

- `domains_project_id_fkey`: FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
- `domains_client_id_fkey`: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT

**Restricciones únicas:**

- UNIQUE (domain_name)

**Restricciones CHECK (valores permitidos reales):**

- CHECK ((status = ANY (ARRAY['activo'::text, 'pendiente'::text, 'vencido'::text, 'transferencia'::text, 'cancelado'::text])))
- CHECK ((renewal_cost >= (0)::numeric))
- CHECK (((expiration_date IS NULL) OR (registration_date IS NULL) OR (expiration_date >= registration_date)))

**Índices:** `domains_domain_name_key`, `idx_domains_client`, `idx_domains_project`.

**Triggers:** `trg_domains_audit`, `trg_domains_updated_at`, `trg_validate_domain_relationship`.

---

### `expenses`

**Descripción:** Gastos por proyecto con categoría, proveedor, fecha y `receipt_url`.

**Funcionalidad:** Gastos operativos · **Módulo del panel:** Contabilidad (Gastos)

**Operaciones permitidas:** CRUD completo.

**RLS:** activado, 0 políticas.

| Campo | Tipo | Nulo | Default / PK |
|---|---|---|---|
| `id` | `uuid` | NO | **PK** · `gen_random_uuid()` |
| `project_id` | `uuid` | SÍ | — |
| `category` | `text` | NO | — |
| `description` | `text` | NO | — |
| `amount` | `numeric(14,2)` | NO | — |
| `expense_date` | `date` | NO | — |
| `supplier` | `text` | SÍ | — |
| `payment_method` | `text` | SÍ | — |
| `receipt_url` | `text` | SÍ | — |
| `registered_by` | `uuid` | SÍ | — |
| `created_at` | `timestamp with time zone` | NO | `now()` |
| `updated_at` | `timestamp with time zone` | NO | `now()` |

**Claves foráneas:**

- `expenses_registered_by_fkey`: FOREIGN KEY (registered_by) REFERENCES profiles(id) ON DELETE SET NULL
- `expenses_project_id_fkey`: FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL

**Restricciones CHECK (valores permitidos reales):**

- CHECK ((amount >= (0)::numeric))

**Índices:** `idx_expenses_project`.

**Triggers:** `trg_expenses_audit`, `trg_expenses_updated_at`.

---

### `follow_ups`

**Descripción:** Seguimientos a leads/clientes/cotizaciones con fecha, canal y resultado.

**Funcionalidad:** Seguimiento comercial · **Módulo del panel:** Marketing

**Operaciones permitidas:** CRUD completo.

**RLS:** activado, 0 políticas.

| Campo | Tipo | Nulo | Default / PK |
|---|---|---|---|
| `id` | `uuid` | NO | **PK** · `gen_random_uuid()` |
| `lead_id` | `uuid` | SÍ | — |
| `client_id` | `uuid` | SÍ | — |
| `quote_id` | `uuid` | SÍ | — |
| `assigned_to` | `uuid` | SÍ | — |
| `follow_up_date` | `timestamp with time zone` | NO | — |
| `channel` | `text` | SÍ | — |
| `description` | `text` | NO | — |
| `status` | `text` | NO | `'pendiente'::text` |
| `result` | `text` | SÍ | — |
| `created_at` | `timestamp with time zone` | NO | `now()` |
| `updated_at` | `timestamp with time zone` | NO | `now()` |

**Claves foráneas:**

- `follow_ups_lead_id_fkey`: FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
- `follow_ups_assigned_to_fkey`: FOREIGN KEY (assigned_to) REFERENCES profiles(id) ON DELETE SET NULL
- `follow_ups_quote_id_fkey`: FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE SET NULL
- `follow_ups_client_id_fkey`: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE

**Restricciones CHECK (valores permitidos reales):**

- CHECK (((lead_id IS NOT NULL) OR (client_id IS NOT NULL)))
- CHECK ((status = ANY (ARRAY['pendiente'::text, 'completado'::text, 'cancelado'::text])))

**Índices:** `idx_followups_date`.

**Triggers:** `trg_follow_ups_updated_at`.

---

### `hosting_accounts`

**Descripción:** Cuentas de hosting por cliente, proveedor, plan, renovación e importe.

**Funcionalidad:** Inventario de hosting · **Módulo del panel:** Operaciones (Hosting)

**Operaciones permitidas:** CRUD completo.

**RLS:** activado, 0 políticas.

| Campo | Tipo | Nulo | Default / PK |
|---|---|---|---|
| `id` | `uuid` | NO | **PK** · `gen_random_uuid()` |
| `client_id` | `uuid` | SÍ | — |
| `provider` | `text` | NO | — |
| `account_name` | `text` | NO | — |
| `plan_name` | `text` | SÍ | — |
| `server_type` | `text` | SÍ | — |
| `panel_url` | `text` | SÍ | — |
| `renewal_date` | `date` | SÍ | — |
| `amount` | `numeric(14,2)` | SÍ | `0` |
| `currency` | `character(3)` | NO | `'COP'::bpchar` |
| `status` | `text` | NO | `'activo'::text` |
| `notes` | `text` | SÍ | — |
| `created_at` | `timestamp with time zone` | NO | `now()` |
| `updated_at` | `timestamp with time zone` | NO | `now()` |

**Claves foráneas:**

- `hosting_accounts_client_id_fkey`: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL

**Restricciones CHECK (valores permitidos reales):**

- CHECK ((status = ANY (ARRAY['activo'::text, 'suspendido'::text, 'cancelado'::text, 'vencido'::text])))
- CHECK ((amount >= (0)::numeric))

**Triggers:** `trg_hosting_accounts_audit`, `trg_hosting_accounts_updated_at`.

---

### `incidents`

**Descripción:** Incidencias técnicas por proyecto/sitio con severidad y estado.

**Funcionalidad:** Incidencias · **Módulo del panel:** Operaciones (Soporte)

**Operaciones permitidas:** CRUD completo.

**RLS:** activado, 0 políticas.

| Campo | Tipo | Nulo | Default / PK |
|---|---|---|---|
| `id` | `uuid` | NO | **PK** · `gen_random_uuid()` |
| `project_id` | `uuid` | SÍ | — |
| `website_id` | `uuid` | SÍ | — |
| `reported_by` | `uuid` | SÍ | — |
| `assigned_to` | `uuid` | SÍ | — |
| `title` | `text` | NO | — |
| `description` | `text` | SÍ | — |
| `severity` | `text` | NO | `'media'::text` |
| `status` | `text` | NO | `'abierta'::text` |
| `resolved_at` | `timestamp with time zone` | SÍ | — |
| `created_at` | `timestamp with time zone` | NO | `now()` |
| `updated_at` | `timestamp with time zone` | NO | `now()` |

**Claves foráneas:**

- `incidents_assigned_to_fkey`: FOREIGN KEY (assigned_to) REFERENCES profiles(id) ON DELETE SET NULL
- `incidents_reported_by_fkey`: FOREIGN KEY (reported_by) REFERENCES profiles(id) ON DELETE SET NULL
- `incidents_website_id_fkey`: FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE SET NULL
- `incidents_project_id_fkey`: FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL

**Restricciones CHECK (valores permitidos reales):**

- CHECK ((severity = ANY (ARRAY['baja'::text, 'media'::text, 'alta'::text, 'critica'::text])))
- CHECK ((status = ANY (ARRAY['abierta'::text, 'en_proceso'::text, 'resuelta'::text, 'cerrada'::text])))

**Índices:** `idx_incidents_project`.

**Triggers:** `trg_incidents_updated_at`.

---

### `invoices`

**Descripción:** Facturas emitidas. `invoice_number`, `subtotal`, `tax_amount`, `total_amount`, `due_date`, estado, `invoice_url`. **NO es dinero recaudado**.

**Funcionalidad:** Facturación · **Módulo del panel:** Contabilidad (Facturas)

**Operaciones permitidas:** CRUD completo · `invoice_number` único.

**RLS:** activado, 0 políticas.

| Campo | Tipo | Nulo | Default / PK |
|---|---|---|---|
| `id` | `uuid` | NO | **PK** · `gen_random_uuid()` |
| `client_id` | `uuid` | NO | — |
| `project_id` | `uuid` | SÍ | — |
| `invoice_number` | `text` | NO | — |
| `issue_date` | `date` | NO | — |
| `due_date` | `date` | SÍ | — |
| `subtotal` | `numeric(14,2)` | NO | `0` |
| `tax_amount` | `numeric(14,2)` | NO | `0` |
| `total_amount` | `numeric(14,2)` | NO | — |
| `status` | `text` | NO | `'pendiente'::text` |
| `invoice_url` | `text` | SÍ | — |
| `created_at` | `timestamp with time zone` | NO | `now()` |
| `updated_at` | `timestamp with time zone` | NO | `now()` |

**Claves foráneas:**

- `invoices_client_id_fkey`: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT
- `invoices_project_id_fkey`: FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL

**Restricciones únicas:**

- UNIQUE (invoice_number)

**Restricciones CHECK (valores permitidos reales):**

- CHECK (((due_date IS NULL) OR (due_date >= issue_date)))
- CHECK ((status = ANY (ARRAY['borrador'::text, 'pendiente'::text, 'pagada'::text, 'vencida'::text, 'anulada'::text])))
- CHECK ((total_amount >= (0)::numeric))
- CHECK ((tax_amount >= (0)::numeric))
- CHECK ((subtotal >= (0)::numeric))

**Índices:** `idx_invoices_client`, `invoices_invoice_number_key`.

**Triggers:** `trg_invoices_audit`, `trg_invoices_updated_at`.

---

### `leads`

**Descripción:** Prospectos con `source`, `interest`, `estimated_value`, estado y `converted_client_id`.

**Funcionalidad:** Prospectos / embudo · **Módulo del panel:** Marketing

**Operaciones permitidas:** CRUD completo.

**RLS:** activado, 0 políticas.

| Campo | Tipo | Nulo | Default / PK |
|---|---|---|---|
| `id` | `uuid` | NO | **PK** · `gen_random_uuid()` |
| `company_name` | `text` | SÍ | — |
| `contact_name` | `text` | NO | — |
| `email` | `text` | SÍ | — |
| `phone` | `text` | SÍ | — |
| `source` | `text` | SÍ | — |
| `interest` | `text` | SÍ | — |
| `estimated_value` | `numeric(14,2)` | SÍ | `0` |
| `status` | `text` | NO | `'nuevo'::text` |
| `assigned_to` | `uuid` | SÍ | — |
| `converted_client_id` | `uuid` | SÍ | — |
| `notes` | `text` | SÍ | — |
| `created_at` | `timestamp with time zone` | NO | `now()` |
| `updated_at` | `timestamp with time zone` | NO | `now()` |

**Claves foráneas:**

- `leads_converted_client_id_fkey`: FOREIGN KEY (converted_client_id) REFERENCES clients(id) ON DELETE SET NULL
- `leads_assigned_to_fkey`: FOREIGN KEY (assigned_to) REFERENCES profiles(id) ON DELETE SET NULL

**Restricciones CHECK (valores permitidos reales):**

- CHECK ((status = ANY (ARRAY['nuevo'::text, 'contactado'::text, 'calificado'::text, 'propuesta'::text, 'ganado'::text, 'perdido'::text])))
- CHECK ((estimated_value >= (0)::numeric))

**Índices:** `idx_leads_status`.

**Triggers:** `trg_leads_audit`, `trg_leads_updated_at`.

---

### `maintenance_plans`

**Descripción:** Planes de mantenimiento por cliente/sitio con frecuencia e importe.

**Funcionalidad:** Planes de mantenimiento · **Módulo del panel:** Operaciones (Mantenimiento)

**Operaciones permitidas:** CRUD completo.

**RLS:** activado, 0 políticas.

| Campo | Tipo | Nulo | Default / PK |
|---|---|---|---|
| `id` | `uuid` | NO | **PK** · `gen_random_uuid()` |
| `client_id` | `uuid` | NO | — |
| `website_id` | `uuid` | SÍ | — |
| `plan_name` | `text` | NO | — |
| `description` | `text` | SÍ | — |
| `frequency` | `text` | NO | — |
| `start_date` | `date` | NO | — |
| `end_date` | `date` | SÍ | — |
| `amount` | `numeric(14,2)` | NO | `0` |
| `status` | `text` | NO | `'activo'::text` |
| `next_service_date` | `date` | SÍ | — |
| `created_at` | `timestamp with time zone` | NO | `now()` |
| `updated_at` | `timestamp with time zone` | NO | `now()` |

**Claves foráneas:**

- `maintenance_plans_client_id_fkey`: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT
- `maintenance_plans_website_id_fkey`: FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE SET NULL

**Restricciones CHECK (valores permitidos reales):**

- CHECK (((end_date IS NULL) OR (end_date >= start_date)))
- CHECK ((amount >= (0)::numeric))
- CHECK ((status = ANY (ARRAY['activo'::text, 'pausado'::text, 'finalizado'::text, 'cancelado'::text])))
- CHECK ((frequency = ANY (ARRAY['semanal'::text, 'quincenal'::text, 'mensual'::text, 'trimestral'::text, 'anual'::text])))

**Índices:** `idx_maintenance_client`.

**Triggers:** `trg_maintenance_plans_audit`, `trg_maintenance_plans_updated_at`.

---

### `payments`

**Descripción:** **Dinero efectivamente recaudado**. `amount`, `payment_date`, `payment_method`, `payment_type`, `status`, `receipt_url`.

**Funcionalidad:** Recaudos / trazabilidad de cobros · **Módulo del panel:** Contabilidad (Recaudos)

**Operaciones permitidas:** CRUD completo · `payment_reference` único.

**RLS:** activado, 0 políticas.

| Campo | Tipo | Nulo | Default / PK |
|---|---|---|---|
| `id` | `uuid` | NO | **PK** · `gen_random_uuid()` |
| `project_id` | `uuid` | NO | — |
| `client_id` | `uuid` | NO | — |
| `payment_reference` | `text` | SÍ | — |
| `amount` | `numeric(14,2)` | NO | — |
| `payment_date` | `date` | NO | — |
| `payment_method` | `text` | SÍ | — |
| `payment_type` | `text` | NO | `'abono'::text` |
| `status` | `text` | NO | `'pendiente'::text` |
| `receipt_url` | `text` | SÍ | — |
| `notes` | `text` | SÍ | — |
| `registered_by` | `uuid` | SÍ | — |
| `created_at` | `timestamp with time zone` | NO | `now()` |
| `updated_at` | `timestamp with time zone` | NO | `now()` |

**Claves foráneas:**

- `payments_registered_by_fkey`: FOREIGN KEY (registered_by) REFERENCES profiles(id) ON DELETE SET NULL
- `payments_client_id_fkey`: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT
- `payments_project_id_fkey`: FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT

**Restricciones únicas:**

- UNIQUE (payment_reference)

**Restricciones CHECK (valores permitidos reales):**

- CHECK ((amount > (0)::numeric))
- CHECK ((payment_method = ANY (ARRAY['transferencia'::text, 'efectivo'::text, 'tarjeta'::text, 'pse'::text, 'consignacion'::text, 'otro'::text])))
- CHECK ((payment_type = ANY (ARRAY['anticipo'::text, 'abono'::text, 'pago_final'::text, 'reembolso'::text, 'otro'::text])))
- CHECK ((status = ANY (ARRAY['pendiente'::text, 'confirmado'::text, 'rechazado'::text, 'reembolsado'::text])))

**Índices:** `idx_payments_client`, `idx_payments_date`, `idx_payments_project`, `payments_payment_reference_key`.

**Triggers:** `trg_payments_audit`, `trg_payments_updated_at`, `trg_validate_payment_relationship`.

---

### `profiles`

**Descripción:** Perfil de usuario. `id` = `auth.users.id`. `role` con 6 valores: administrador, direccion, comercial, desarrollo, finanzas, soporte.

**Funcionalidad:** Usuarios, roles y permisos · **Módulo del panel:** Configuración

**Operaciones permitidas:** Lectura + activar/desactivar + cambio de rol (sin borrar).

**RLS:** activado, 0 políticas.

| Campo | Tipo | Nulo | Default / PK |
|---|---|---|---|
| `id` | `uuid` | NO | **PK** |
| `full_name` | `text` | NO | — |
| `email` | `text` | SÍ | — |
| `phone` | `text` | SÍ | — |
| `role` | `text` | NO | `'colaborador'::text` |
| `is_active` | `boolean` | NO | `true` |
| `created_at` | `timestamp with time zone` | NO | `now()` |
| `updated_at` | `timestamp with time zone` | NO | `now()` |

**Claves foráneas:**

- `profiles_id_fkey`: FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE

**Restricciones CHECK (valores permitidos reales):**

- CHECK ((role = ANY (ARRAY['administrador'::text, 'direccion'::text, 'comercial'::text, 'desarrollo'::text, 'finanzas'::text, 'soporte'::text])))

**Triggers:** `trg_profiles_updated_at`.

---

### `project_costs`

**Descripción:** Costos imputados a proyecto, opcionalmente enlazados a un `expense`.

**Funcionalidad:** Costos por proyecto · **Módulo del panel:** Contabilidad / Gerencia

**Operaciones permitidas:** CRUD completo.

**RLS:** activado, 0 políticas.

| Campo | Tipo | Nulo | Default / PK |
|---|---|---|---|
| `id` | `uuid` | NO | **PK** · `gen_random_uuid()` |
| `project_id` | `uuid` | NO | — |
| `cost_type` | `text` | NO | — |
| `description` | `text` | NO | — |
| `amount` | `numeric(14,2)` | NO | — |
| `cost_date` | `date` | NO | `CURRENT_DATE` |
| `expense_id` | `uuid` | SÍ | — |
| `created_at` | `timestamp with time zone` | NO | `now()` |
| `updated_at` | `timestamp with time zone` | NO | `now()` |

**Claves foráneas:**

- `project_costs_expense_id_fkey`: FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE SET NULL
- `project_costs_project_id_fkey`: FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE

**Restricciones CHECK (valores permitidos reales):**

- CHECK ((amount >= (0)::numeric))

**Índices:** `idx_project_costs_project`.

**Triggers:** `trg_project_costs_updated_at`.

---

### `project_history`

**Descripción:** Bitácora de eventos del proyecto (auditoría de cambios de estado).

**Funcionalidad:** Historial del proyecto · **Módulo del panel:** Desarrollo → Detalle

**Operaciones permitidas:** Lectura + inserción (no se edita ni borra).

**RLS:** activado, 0 políticas.

| Campo | Tipo | Nulo | Default / PK |
|---|---|---|---|
| `id` | `uuid` | NO | **PK** · `gen_random_uuid()` |
| `project_id` | `uuid` | NO | — |
| `user_id` | `uuid` | SÍ | — |
| `event_type` | `text` | NO | — |
| `description` | `text` | NO | — |
| `created_at` | `timestamp with time zone` | NO | `now()` |

**Claves foráneas:**

- `project_history_project_id_fkey`: FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
- `project_history_user_id_fkey`: FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL

**Índices:** `idx_history_project`.

---

### `project_services`

**Descripción:** Servicios contratados dentro de un proyecto; `subtotal` es columna generada (quantity × unit_price).

**Funcionalidad:** Alcance / ítems del proyecto · **Módulo del panel:** Desarrollo → Detalle

**Operaciones permitidas:** CRUD completo.

**RLS:** activado, 0 políticas.

| Campo | Tipo | Nulo | Default / PK |
|---|---|---|---|
| `id` | `uuid` | NO | **PK** · `gen_random_uuid()` |
| `project_id` | `uuid` | NO | — |
| `service_id` | `uuid` | SÍ | — |
| `service_name` | `text` | NO | — |
| `description` | `text` | SÍ | — |
| `quantity` | `numeric(12,2)` | NO | `1` |
| `unit_price` | `numeric(14,2)` | NO | `0` |
| `subtotal` | `numeric(14,2)` | SÍ | `(quantity * unit_price)` |
| `created_at` | `timestamp with time zone` | NO | `now()` |
| `updated_at` | `timestamp with time zone` | NO | `now()` |

**Claves foráneas:**

- `project_services_service_id_fkey`: FOREIGN KEY (service_id) REFERENCES service_catalog(id) ON DELETE SET NULL
- `project_services_project_id_fkey`: FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE

**Restricciones CHECK (valores permitidos reales):**

- CHECK ((quantity > (0)::numeric))
- CHECK ((unit_price >= (0)::numeric))

**Índices:** `idx_project_services_project`.

**Triggers:** `trg_project_services_audit`, `trg_project_services_updated_at`.

---

### `projects`

**Descripción:** Proyectos web. `project_name`, `status` (pendiente/en_proceso/en_revisión/pausado/finalizado/cancelado), `priority`, fechas y `total_amount`.

**Funcionalidad:** Proyectos y su ciclo de vida · **Módulo del panel:** Desarrollo

**Operaciones permitidas:** CRUD completo · `code` único · actualización de estado.

**RLS:** activado, 0 políticas.

| Campo | Tipo | Nulo | Default / PK |
|---|---|---|---|
| `id` | `uuid` | NO | **PK** · `gen_random_uuid()` |
| `code` | `text` | NO | — |
| `client_id` | `uuid` | NO | — |
| `project_name` | `text` | NO | — |
| `project_type` | `text` | NO | — |
| `description` | `text` | SÍ | — |
| `status` | `text` | NO | `'pendiente'::text` |
| `priority` | `text` | NO | `'media'::text` |
| `contract_date` | `date` | SÍ | — |
| `start_date` | `date` | SÍ | — |
| `estimated_delivery_date` | `date` | SÍ | — |
| `actual_delivery_date` | `date` | SÍ | — |
| `total_amount` | `numeric(14,2)` | NO | `0` |
| `currency` | `character(3)` | NO | `'COP'::bpchar` |
| `responsible_id` | `uuid` | SÍ | — |
| `created_by` | `uuid` | SÍ | — |
| `notes` | `text` | SÍ | — |
| `created_at` | `timestamp with time zone` | NO | `now()` |
| `updated_at` | `timestamp with time zone` | NO | `now()` |

**Claves foráneas:**

- `projects_client_id_fkey`: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT
- `projects_responsible_id_fkey`: FOREIGN KEY (responsible_id) REFERENCES profiles(id) ON DELETE SET NULL
- `projects_created_by_fkey`: FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL

**Restricciones únicas:**

- UNIQUE (code)

**Restricciones CHECK (valores permitidos reales):**

- CHECK ((project_type = ANY (ARRAY['landing_page'::text, 'corporativa'::text, 'ecommerce'::text, 'marketplace'::text, 'web_app'::text, 'mantenimiento'::text, 'otro'::text])))
- CHECK ((status = ANY (ARRAY['pendiente'::text, 'en_proceso'::text, 'en_revision'::text, 'pausado'::text, 'finalizado'::text, 'cancelado'::text])))
- CHECK ((priority = ANY (ARRAY['baja'::text, 'media'::text, 'alta'::text, 'urgente'::text])))
- CHECK ((total_amount >= (0)::numeric))
- CHECK (((estimated_delivery_date IS NULL) OR (start_date IS NULL) OR (estimated_delivery_date >= start_date)))

**Índices:** `idx_projects_client`, `idx_projects_responsible`, `idx_projects_status`, `projects_code_key`.

**Triggers:** `trg_projects_audit`, `trg_projects_updated_at`.

---

### `quote_items`

**Descripción:** Ítems de cotización; `subtotal` es columna generada.

**Funcionalidad:** Detalle de cotización · **Módulo del panel:** Contabilidad → Detalle cotización

**Operaciones permitidas:** CRUD completo.

**RLS:** activado, 0 políticas.

| Campo | Tipo | Nulo | Default / PK |
|---|---|---|---|
| `id` | `uuid` | NO | **PK** · `gen_random_uuid()` |
| `quote_id` | `uuid` | NO | — |
| `service_id` | `uuid` | SÍ | — |
| `description` | `text` | NO | — |
| `quantity` | `numeric(12,2)` | NO | `1` |
| `unit_price` | `numeric(14,2)` | NO | — |
| `subtotal` | `numeric(14,2)` | SÍ | `(quantity * unit_price)` |
| `created_at` | `timestamp with time zone` | NO | `now()` |
| `updated_at` | `timestamp with time zone` | NO | `now()` |

**Claves foráneas:**

- `quote_items_quote_id_fkey`: FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
- `quote_items_service_id_fkey`: FOREIGN KEY (service_id) REFERENCES service_catalog(id) ON DELETE SET NULL

**Restricciones CHECK (valores permitidos reales):**

- CHECK ((unit_price >= (0)::numeric))
- CHECK ((quantity > (0)::numeric))

**Índices:** `idx_quote_items_quote`.

**Triggers:** `trg_quote_items_updated_at`.

---

### `quotes`

**Descripción:** Cotizaciones. `quote_number`, `subtotal`, `tax_amount`, `total_amount`, estado, `quote_url` y `assigned_to`.

**Funcionalidad:** Cotizaciones · **Módulo del panel:** Contabilidad (Cotizaciones)

**Operaciones permitidas:** CRUD completo · `quote_number` único.

**RLS:** activado, 0 políticas.

| Campo | Tipo | Nulo | Default / PK |
|---|---|---|---|
| `id` | `uuid` | NO | **PK** · `gen_random_uuid()` |
| `lead_id` | `uuid` | SÍ | — |
| `client_id` | `uuid` | SÍ | — |
| `quote_number` | `text` | NO | — |
| `issue_date` | `date` | NO | `CURRENT_DATE` |
| `expiration_date` | `date` | SÍ | — |
| `subtotal` | `numeric(14,2)` | NO | `0` |
| `tax_amount` | `numeric(14,2)` | NO | `0` |
| `total_amount` | `numeric(14,2)` | NO | `0` |
| `status` | `text` | NO | `'borrador'::text` |
| `quote_url` | `text` | SÍ | — |
| `assigned_to` | `uuid` | SÍ | — |
| `notes` | `text` | SÍ | — |
| `created_at` | `timestamp with time zone` | NO | `now()` |
| `updated_at` | `timestamp with time zone` | NO | `now()` |

**Claves foráneas:**

- `quotes_assigned_to_fkey`: FOREIGN KEY (assigned_to) REFERENCES profiles(id) ON DELETE SET NULL
- `quotes_client_id_fkey`: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
- `quotes_lead_id_fkey`: FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL

**Restricciones únicas:**

- UNIQUE (quote_number)

**Restricciones CHECK (valores permitidos reales):**

- CHECK ((status = ANY (ARRAY['borrador'::text, 'enviada'::text, 'aceptada'::text, 'rechazada'::text, 'vencida'::text])))
- CHECK ((total_amount >= (0)::numeric))
- CHECK ((subtotal >= (0)::numeric))
- CHECK ((tax_amount >= (0)::numeric))
- CHECK (((lead_id IS NOT NULL) OR (client_id IS NOT NULL)))

**Índices:** `idx_quotes_client`, `quotes_quote_number_key`.

**Triggers:** `trg_quotes_audit`, `trg_quotes_updated_at`.

---

### `renewals`

**Descripción:** Renovaciones de dominio/hosting/ssl/licencia con vencimiento e importe.

**Funcionalidad:** Vencimientos y renovaciones · **Módulo del panel:** Operaciones (Renovaciones)

**Operaciones permitidas:** CRUD completo.

**RLS:** activado, 0 políticas.

| Campo | Tipo | Nulo | Default / PK |
|---|---|---|---|
| `id` | `uuid` | NO | **PK** · `gen_random_uuid()` |
| `domain_id` | `uuid` | SÍ | — |
| `hosting_account_id` | `uuid` | SÍ | — |
| `renewal_type` | `text` | NO | — |
| `due_date` | `date` | NO | — |
| `renewal_date` | `date` | SÍ | — |
| `amount` | `numeric(14,2)` | NO | `0` |
| `status` | `text` | NO | `'pendiente'::text` |
| `notes` | `text` | SÍ | — |
| `created_at` | `timestamp with time zone` | NO | `now()` |
| `updated_at` | `timestamp with time zone` | NO | `now()` |

**Claves foráneas:**

- `renewals_hosting_account_id_fkey`: FOREIGN KEY (hosting_account_id) REFERENCES hosting_accounts(id) ON DELETE CASCADE
- `renewals_domain_id_fkey`: FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE

**Restricciones CHECK (valores permitidos reales):**

- CHECK ((status = ANY (ARRAY['pendiente'::text, 'notificado'::text, 'pagado'::text, 'renovado'::text, 'vencido'::text, 'cancelado'::text])))
- CHECK ((renewal_type = ANY (ARRAY['dominio'::text, 'hosting'::text, 'ssl'::text, 'licencia'::text, 'otro'::text])))
- CHECK ((amount >= (0)::numeric))
- CHECK (((domain_id IS NOT NULL) OR (hosting_account_id IS NOT NULL)))

**Índices:** `idx_renewals_due_date`.

**Triggers:** `trg_renewals_audit`, `trg_renewals_updated_at`.

---

### `schema_migrations`

**Descripción:** Control de migraciones. Tabla auxiliar, sin RLS.

**Funcionalidad:** Versionado de esquema · **Módulo del panel:** (infraestructura)

**Operaciones permitidas:** Solo lectura / gestión por script.

**RLS:** desactivado, 0 políticas.

| Campo | Tipo | Nulo | Default / PK |
|---|---|---|---|
| `filename` | `text` | NO | **PK** |
| `applied_at` | `timestamp with time zone` | NO | `now()` |

---

### `service_catalog`

**Descripción:** Catálogo de servicios con `default_price` y `is_active`.

**Funcionalidad:** Servicios ofrecidos · **Módulo del panel:** Marketing / Configuración

**Operaciones permitidas:** CRUD completo · `name` único.

**RLS:** activado, 0 políticas.

| Campo | Tipo | Nulo | Default / PK |
|---|---|---|---|
| `id` | `uuid` | NO | **PK** · `gen_random_uuid()` |
| `name` | `text` | NO | — |
| `category` | `text` | NO | — |
| `description` | `text` | SÍ | — |
| `default_price` | `numeric(14,2)` | SÍ | `0` |
| `is_active` | `boolean` | NO | `true` |
| `created_at` | `timestamp with time zone` | NO | `now()` |
| `updated_at` | `timestamp with time zone` | NO | `now()` |

**Restricciones únicas:**

- UNIQUE (name)

**Restricciones CHECK (valores permitidos reales):**

- CHECK ((default_price >= (0)::numeric))

**Índices:** `service_catalog_name_key`.

**Triggers:** `trg_service_catalog_updated_at`.

---

### `surveys`

**Descripción:** Encuestas de satisfacción (rating 1–5) ligadas a cliente/proyecto/ticket.

**Funcionalidad:** Satisfacción · **Módulo del panel:** Operaciones (Soporte)

**Operaciones permitidas:** CRUD completo.

**RLS:** activado, 0 políticas.

| Campo | Tipo | Nulo | Default / PK |
|---|---|---|---|
| `id` | `uuid` | NO | **PK** · `gen_random_uuid()` |
| `client_id` | `uuid` | NO | — |
| `project_id` | `uuid` | SÍ | — |
| `ticket_id` | `uuid` | SÍ | — |
| `rating` | `smallint` | NO | — |
| `comments` | `text` | SÍ | — |
| `submitted_at` | `timestamp with time zone` | NO | `now()` |
| `created_at` | `timestamp with time zone` | NO | `now()` |
| `updated_at` | `timestamp with time zone` | NO | `now()` |

**Claves foráneas:**

- `surveys_project_id_fkey`: FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
- `surveys_ticket_id_fkey`: FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE SET NULL
- `surveys_client_id_fkey`: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE

**Restricciones CHECK (valores permitidos reales):**

- CHECK (((rating >= 1) AND (rating <= 5)))

**Triggers:** `trg_surveys_updated_at`.

---

### `tasks`

**Descripción:** Tareas del proyecto con responsable, prioridad, estado y fechas.

**Funcionalidad:** Gestión de tareas · **Módulo del panel:** Desarrollo → Detalle

**Operaciones permitidas:** CRUD completo.

**RLS:** activado, 0 políticas.

| Campo | Tipo | Nulo | Default / PK |
|---|---|---|---|
| `id` | `uuid` | NO | **PK** · `gen_random_uuid()` |
| `project_id` | `uuid` | NO | — |
| `title` | `text` | NO | — |
| `description` | `text` | SÍ | — |
| `assigned_to` | `uuid` | SÍ | — |
| `created_by` | `uuid` | SÍ | — |
| `priority` | `text` | NO | `'media'::text` |
| `status` | `text` | NO | `'pendiente'::text` |
| `start_date` | `date` | SÍ | — |
| `due_date` | `date` | SÍ | — |
| `completed_at` | `timestamp with time zone` | SÍ | — |
| `created_at` | `timestamp with time zone` | NO | `now()` |
| `updated_at` | `timestamp with time zone` | NO | `now()` |

**Claves foráneas:**

- `tasks_created_by_fkey`: FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
- `tasks_project_id_fkey`: FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
- `tasks_assigned_to_fkey`: FOREIGN KEY (assigned_to) REFERENCES profiles(id) ON DELETE SET NULL

**Restricciones CHECK (valores permitidos reales):**

- CHECK ((status = ANY (ARRAY['pendiente'::text, 'en_proceso'::text, 'en_revision'::text, 'completada'::text, 'bloqueada'::text, 'cancelada'::text])))
- CHECK (((due_date IS NULL) OR (start_date IS NULL) OR (due_date >= start_date)))
- CHECK ((priority = ANY (ARRAY['baja'::text, 'media'::text, 'alta'::text, 'urgente'::text])))

**Índices:** `idx_tasks_assigned`, `idx_tasks_project`.

**Triggers:** `trg_tasks_audit`, `trg_tasks_updated_at`.

---

### `tickets`

**Descripción:** Tickets de soporte por cliente/proyecto/sitio (trigger valida coherencia).

**Funcionalidad:** Soporte y tickets · **Módulo del panel:** Operaciones (Soporte)

**Operaciones permitidas:** CRUD completo.

**RLS:** activado, 0 políticas.

| Campo | Tipo | Nulo | Default / PK |
|---|---|---|---|
| `id` | `uuid` | NO | **PK** · `gen_random_uuid()` |
| `client_id` | `uuid` | NO | — |
| `project_id` | `uuid` | SÍ | — |
| `website_id` | `uuid` | SÍ | — |
| `assigned_to` | `uuid` | SÍ | — |
| `subject` | `text` | NO | — |
| `description` | `text` | NO | — |
| `category` | `text` | SÍ | — |
| `priority` | `text` | NO | `'media'::text` |
| `status` | `text` | NO | `'abierto'::text` |
| `opened_at` | `timestamp with time zone` | NO | `now()` |
| `closed_at` | `timestamp with time zone` | SÍ | — |
| `created_at` | `timestamp with time zone` | NO | `now()` |
| `updated_at` | `timestamp with time zone` | NO | `now()` |

**Claves foráneas:**

- `tickets_website_id_fkey`: FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE SET NULL
- `tickets_client_id_fkey`: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT
- `tickets_project_id_fkey`: FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
- `tickets_assigned_to_fkey`: FOREIGN KEY (assigned_to) REFERENCES profiles(id) ON DELETE SET NULL

**Restricciones CHECK (valores permitidos reales):**

- CHECK ((status = ANY (ARRAY['abierto'::text, 'en_proceso'::text, 'esperando_cliente'::text, 'resuelto'::text, 'cerrado'::text])))
- CHECK ((priority = ANY (ARRAY['baja'::text, 'media'::text, 'alta'::text, 'urgente'::text])))

**Índices:** `idx_tickets_client`, `idx_tickets_status`.

**Triggers:** `trg_tickets_audit`, `trg_tickets_updated_at`, `trg_validate_ticket_relationship`.

---

### `time_entries`

**Descripción:** Horas trabajadas por proyecto/tarea/usuario (trigger valida coherencia proyecto↔tarea).

**Funcionalidad:** Actividad del equipo · **Módulo del panel:** Desarrollo / Gerencia

**Operaciones permitidas:** CRUD completo.

**RLS:** activado, 0 políticas.

| Campo | Tipo | Nulo | Default / PK |
|---|---|---|---|
| `id` | `uuid` | NO | **PK** · `gen_random_uuid()` |
| `project_id` | `uuid` | NO | — |
| `task_id` | `uuid` | SÍ | — |
| `user_id` | `uuid` | SÍ | — |
| `work_date` | `date` | NO | — |
| `hours` | `numeric(8,2)` | NO | — |
| `description` | `text` | SÍ | — |
| `created_at` | `timestamp with time zone` | NO | `now()` |
| `updated_at` | `timestamp with time zone` | NO | `now()` |

**Claves foráneas:**

- `time_entries_user_id_fkey`: FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL
- `time_entries_project_id_fkey`: FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
- `time_entries_task_id_fkey`: FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL

**Restricciones CHECK (valores permitidos reales):**

- CHECK ((hours > (0)::numeric))

**Índices:** `idx_time_entries_project`.

**Triggers:** `trg_time_entries_updated_at`, `trg_validate_time_entry_relationship`.

---

### `websites`

**Descripción:** Sitios web que relacionan cliente, proyecto, hosting y dominio (trigger valida coherencia).

**Funcionalidad:** Inventario de sitios · **Módulo del panel:** Operaciones (Sitios)

**Operaciones permitidas:** CRUD completo.

**RLS:** activado, 0 políticas.

| Campo | Tipo | Nulo | Default / PK |
|---|---|---|---|
| `id` | `uuid` | NO | **PK** · `gen_random_uuid()` |
| `client_id` | `uuid` | NO | — |
| `project_id` | `uuid` | SÍ | — |
| `hosting_account_id` | `uuid` | SÍ | — |
| `domain_id` | `uuid` | SÍ | — |
| `site_name` | `text` | NO | — |
| `site_url` | `text` | NO | — |
| `environment` | `text` | NO | `'produccion'::text` |
| `platform` | `text` | SÍ | `'WordPress'::text` |
| `status` | `text` | NO | `'activo'::text` |
| `admin_url` | `text` | SÍ | — |
| `notes` | `text` | SÍ | — |
| `created_at` | `timestamp with time zone` | NO | `now()` |
| `updated_at` | `timestamp with time zone` | NO | `now()` |

**Claves foráneas:**

- `websites_domain_id_fkey`: FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE SET NULL
- `websites_hosting_account_id_fkey`: FOREIGN KEY (hosting_account_id) REFERENCES hosting_accounts(id) ON DELETE SET NULL
- `websites_client_id_fkey`: FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT
- `websites_project_id_fkey`: FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL

**Restricciones CHECK (valores permitidos reales):**

- CHECK ((status = ANY (ARRAY['activo'::text, 'en_desarrollo'::text, 'suspendido'::text, 'retirado'::text])))
- CHECK ((environment = ANY (ARRAY['produccion'::text, 'staging'::text, 'desarrollo'::text, 'otro'::text])))

**Índices:** `idx_websites_client`, `idx_websites_hosting`, `idx_websites_project`.

**Triggers:** `trg_validate_website_relationship`, `trg_websites_audit`, `trg_websites_updated_at`.

---

## 4. Relaciones (grafo de FK)

```
  activity_logs        → profiles                 [activity_logs_user_id_fkey]
```

**Núcleo:** `clients` → `projects` → (`contracts`, `payments`, `expenses`, `deliveries`, `tasks`, `documents`, `websites`, `tickets`, `project_services`, `project_costs`, `project_history`, `time_entries`).
**Infraestructura:** `websites` conecta `clients` + `projects` + `domains` + `hosting_accounts`; `renewals` cuelga de `domains` / `hosting_accounts`.
**Comercial:** `leads` → `quotes` (y `follow_ups`); `quotes` → `quote_items`; `quotes` y `invoices` → `clients` / `projects`.
**Identidad:** `profiles.id` → `auth.users.id`; casi todas las tablas tienen un `*_by` / `assigned_to` / `responsible_id` apuntando a `profiles`.

## 5. Funciones, triggers y vistas

**Vistas:** ninguna. **Tipos ENUM:** ninguno. **Secuencias:** ninguna.

**Funciones (7, todas de trigger):**

- `log_activity()` → `trigger` (plpgsql)
- `set_updated_at()` → `trigger` (plpgsql)
- `validate_domain_relationship()` → `trigger` (plpgsql)
- `validate_payment_relationship()` → `trigger` (plpgsql)
- `validate_ticket_relationship()` → `trigger` (plpgsql)
- `validate_time_entry_relationship()` → `trigger` (plpgsql)
- `validate_website_relationship()` → `trigger` (plpgsql)

**Distribución de triggers (50):** 30 `trg_*_updated_at` (mantienen `updated_at`), 19 `trg_*_audit` (alimentan `activity_logs` mediante `log_activity()`), y 5 validadores de coherencia relacional:

- `domains`: `trg_validate_domain_relationship`
- `payments`: `trg_validate_payment_relationship`
- `tickets`: `trg_validate_ticket_relationship`
- `time_entries`: `trg_validate_time_entry_relationship`
- `websites`: `trg_validate_website_relationship`

> Implicación de diseño: `activity_logs` y `project_history` son tablas de solo lectura desde la UI; se llenan automáticamente. `updated_at` no debe enviarse en los formularios.

## 6. Mapeo módulo → tablas

- **Dashboard**: `clients`, `projects`, `quotes`, `invoices`, `payments`, `expenses`, `leads`, `activity_logs`, `deliveries`, `tasks`, `renewals`
- **Clientes**: `clients`, `contacts`, `projects`, `contracts`, `invoices`, `quotes`, `documents`, `payments`, `domains`, `hosting_accounts`, `websites`, `tickets`, `activity_logs`
- **Contabilidad**: `quotes`, `quote_items`, `invoices`, `payments`, `expenses`, `project_costs`, `contracts`, `service_catalog`
- **Desarrollo**: `projects`, `project_services`, `project_history`, `tasks`, `time_entries`, `deliveries`, `contracts`, `documents`, `domains`, `hosting_accounts`, `websites`, `tickets`, `incidents`
- **Marketing**: `leads`, `campaigns`, `follow_ups`, `service_catalog`, `clients`, `documents`
- **Gerencia**: `payments`, `expenses`, `project_costs`, `invoices`, `contracts`, `projects`, `clients`, `activity_logs`, `time_entries`, `profiles`
- **Operaciones / Soporte**: `domains`, `hosting_accounts`, `websites`, `renewals`, `maintenance_plans`, `tickets`, `incidents`, `surveys`, `documents`
- **Configuración**: `profiles`, `service_catalog`, `schema_migrations`

## 7. Matriz de permisos (aplicada en el backend)

| Permiso | administrador | direccion | finanzas | desarrollo | comercial | soporte |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `dashboard.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `clients.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `clients.manage` | ✅ | ✅ | — | — | ✅ | — |
| `projects.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `projects.manage` | ✅ | ✅ | — | ✅ | — | — |
| `accounting.view` | ✅ | ✅ | ✅ | — | — | — |
| `accounting.manage` | ✅ | ✅ | ✅ | — | — | — |
| `marketing.view` | ✅ | ✅ | — | — | ✅ | — |
| `marketing.manage` | ✅ | ✅ | — | — | ✅ | — |
| `ops.view` | ✅ | ✅ | — | ✅ | — | ✅ |
| `ops.manage` | ✅ | ✅ | — | ✅ | — | ✅ |
| `management.view` | ✅ | ✅ | ✅ | — | — | — |
| `users.manage` | ✅ | — | — | — | — | — |
| `settings.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

> `desarrollo`, `comercial` y `soporte` no pueden leer `payments`, `expenses`, `invoices` ni la vista de Gerencia: la información financiera privada queda protegida.

## 8. Campos de enlaces (Google Drive / documentos)

| Tabla | Campo | Uso |
|---|---|---|
| `documents` | `file_url` | Documento / carpeta de Drive |
| `contracts` | `contract_url` | Contrato firmado |
| `quotes` | `quote_url` | Cotización |
| `invoices` | `invoice_url` | Factura |
| `payments` | `receipt_url` | Comprobante de recaudo |
| `expenses` | `receipt_url` | Comprobante de gasto |
| `deliveries` | `delivery_url` | Entregable |
| `websites` | `site_url` | Sitio publicado |
| `websites` | `admin_url` | Acceso al panel del sitio |
| `hosting_accounts` | `panel_url` | Panel de hosting |

> FASE 1: solo enlaces manuales. No se configura Google Drive API ni OAuth.

## 9. Funcionalidades pedidas **no representables** con el esquema actual

| Requerimiento | Situación real | Tratamiento |
|---|---|---|
| Gastos extras | `expenses` no tiene columna de tipo/adición; solo `category` libre | Migración incremental: tabla `extra_expenses` |
| Bonificaciones | No existe tabla | Migración incremental: tabla `bonuses` |
| Distribuciones / participación de Pixelée / "mis utilidades" | No existe tabla | Migración incremental: `profit_distributions` + `profit_distribution_items` |
| Retiros | No existe tabla | Migración incremental: `withdrawals` |
| Inversión real, leads y conversiones por campaña | `campaigns` solo tiene `budget`, `channel`, `objective`, fechas y estado | Migración incremental: `campaign_metrics` (registro manual) |
| "Fase" del proyecto | No existe `phase`; existe `status` + `tasks.status` + `deliveries.status` | Se muestra el `status` real y el avance por tareas/entregables; no se inventa una columna |
| "Carpeta Drive" del proyecto | No existe campo dedicado | Se usa `documents.file_url` con `document_type` |
| Google Ads / Meta Ads como entidades | No hay tablas; `campaigns.channel` admite texto libre | Se registra el canal como texto (`Google Ads`, `Meta Ads`, …), sin integraciones de API |
| Recaudos vs facturación | `invoices` (emitido) y `payments` (cobrado) están separados | Se mantienen separados en Contabilidad y en todos los cálculos |

> **Estado:** estas 6 tablas ya fueron creadas por `supabase/migrations/0003_pixelee_extras.sql`.
> La migración es **solo `CREATE TABLE IF NOT EXISTS`**: no borra, no renombra, no altera tablas existentes y no toca RLS.
> Reutiliza la función `public.set_updated_at()` que ya existía para los triggers de `updated_at`.
> Detalle completo en §11.

## 10. Decisiones de cálculo (backend)

- **Valor contratado:** `sum(contracts.amount)` (o `projects.total_amount` cuando no hay contrato), por cliente/proyecto.
- **Dinero recaudado:** `sum(payments.amount)` donde `status = 'confirmado'`. Los pagos `pendiente`/`rechazado` **no** cuentan como ingresos.
- **Facturado:** `sum(invoices.total_amount)` con `status <> 'anulada'`. Nunca se suma a recaudado.
- **Saldo pendiente:** `valor contratado − recaudado confirmado`.
- **Gastos asociados:** `sum(expenses.amount) + sum(project_costs.amount)` + `extra_expenses`.
- **Utilidad estimada:** `recaudado confirmado − gastos − bonificaciones aplicadas`.
- **Participación de Pixelée:** porcentaje registrado en `profit_distribution_items` sobre la utilidad del periodo.
- Todos los importes son `numeric(14,2)` y se calculan en el backend (nunca en el frontend).

## 11. Migración incremental aplicada (`0003_pixelee_extras.sql`)

Aplicada el 2026-11-11 con `pnpm db:migrate`. Registrada en
`public.schema_migrations`. **No ejecuta ningún `DROP`, `ALTER TABLE` sobre
tablas existentes, `RENAME`, ni cambio de RLS/políticas.**

| Tabla nueva | Columnas | Propósito |
|---|---|---|
| `extra_expenses` | `id, project_id→projects, description, category, amount, spent_at, receipt_url, notes, created_by→profiles, created_at, updated_at` | Gastos extraordinarios, separados de `expenses` |
| `bonuses` | `id, client_id→clients, project_id→projects, amount, reason, status, granted_at, notes, created_by→profiles, created_at, updated_at` | Bonificaciones aplicadas al cliente |
| `profit_distributions` | `id, period_start, period_end, total_profit, status, notes, created_by→profiles, created_at, updated_at` | Distribución de utilidades por periodo |
| `profit_distribution_items` | `id, distribution_id→profit_distributions, profile_id→profiles, percentage, amount, status, created_at` | Participación de cada persona (incluye «mis utilidades») |
| `withdrawals` | `id, distribution_item_id→profit_distribution_items, profile_id→profiles, amount, withdrawn_at, notes, created_by→profiles, created_at` | Retiros del administrador |
| `campaign_metrics` | `id, campaign_id→campaigns, spent, impressions, clicks, leads, conversions, recorded_at, notes, created_by→profiles, created_at` | Inversión/resultados reales por campaña (registro manual) |

Todas usan `uuid` con `gen_random_uuid()`, `numeric(14,2)` para importes,
`CHECK` de importes no negativos, RLS activado sin políticas (igual que el
resto del esquema) y la función existente `public.set_updated_at()`.

### 11.1 Archivos de migración apartados

`supabase/legacy-no-aplicar/` conserva `0001_init_schema.sql` y
`0002_security_rls.sql` del primer diseño (esquema propio). **No se aplican**
porque la base de datos ya tenía su propio esquema. `pnpm db:migrate` solo
lee `supabase/migrations/*.sql`.

### 11.2 Autenticación en FASE 1

- `auth.users` comienza con 0 usuarios. El primer usuario que inicie sesión
  recibe automáticamente un perfil `administrador` activo en `public.profiles`
  (el backend ejecuta `ensureProfile`). Los siguientes quedan `soporte` e
  inactivos hasta que un administrador los active.
- `profiles.role` tiene un CHECK que **no incluye** el default `colaborador`:
  por eso el backend siempre envía un rol explícito válido.
- El proyecto tiene `mailer_autoconfirm = false` y sin SMTP. Para que el alta
  desde la pantalla de login funcione sin `SUPABASE_SERVICE_ROLE_KEY`, el
  backend crea el usuario de Auth ya confirmado directamente en
  `auth.users` / `auth.identities` (equivalente a «Add user → Auto Confirm»
  del dashboard). Controlable con `AUTO_CONFIRM_SIGNUP`.
- `auth.identities.email` y `auth.users.confirmed_at` son **columnas
  generadas**: no se escriben. GoTrue además exige varias columnas de texto
  como `''` y no `NULL`.
- La contraseña se hashea con bcrypt (`extensions.crypt` / `pgcrypto`), igual
  que GoTrue. La verificación del JWT se hace contra `/auth/v1/user`.
- No se expone `SUPABASE_SERVICE_ROLE_KEY` al frontend (de hecho no se usa).

### 11.3 Conexión

- Host directo `db.pyboszwmrzvzzpekmeps.supabase.co` es **IPv6-only** en este
  proyecto; el equipo no tiene IPv6. Se usa el **Session pooler IPv4**
  `aws-1-us-west-2.pooler.supabase.com:6543` (región obtenida del rango AWS
  del registro AAAA).
- El frontend nunca consulta Supabase directamente: todo pasa por Express.

---

*Auditoría ejecutada contra el catálogo en vivo. Los nombres de columnas, tipos, FK, índices, CHECK y triggers son literales.*
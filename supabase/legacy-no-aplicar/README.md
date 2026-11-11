# Migraciones NO aplicables a este proyecto Supabase

Estos dos archivos corresponden al **diseño de esquema propio** que se hizo en la
primera iteración de FASE 1, cuando aún no se conocía la base de datos real.

El proyecto Supabase `pyboszwmrzvzzpekmeps` **ya posee su propio esquema** (31 tablas
en `public`, con `clients.company_name`, `projects.project_name`, `quotes`, `invoices`,
`payments`, `expenses`, etc.). Por decisión del usuario:

> "NO quiero modificar ni reemplazar la estructura existente de Supabase para
> adaptarla a una estructura nueva. El código y la interfaz deben adaptarse a la
> base de datos actual."

**Estos archivos NO se ejecutan.** Se conservan solo como referencia histórica.
El script `pnpm db:migrate` lee únicamente `supabase/migrations/*.sql`.

La única migración aplicable es `supabase/migrations/0003_pixelee_extras.sql`,
que es estrictamente aditiva (`CREATE TABLE IF NOT EXISTS`) y no toca ninguna
tabla, columna, restricción ni política RLS existente.

La referencia completa del esquema real está en `SUPABASE_SCHEMA_MAP.md`.

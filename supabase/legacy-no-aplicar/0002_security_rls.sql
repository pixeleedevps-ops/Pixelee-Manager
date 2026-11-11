-- ============================================================
-- PIXELÉE MANAGER - Migración 0002: Seguridad y RLS
-- El backend se conecta como owner (service role) de Supabase
-- y por eso RLS queda habilitado sin políticas públicas:
-- ninguna conexión anon/key expone datos.
-- ============================================================

-- Habilitar RLS en todas las tablas de negocio
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop;
end $$;

-- No existen políticas para roles anon/authenticated:
-- el acceso es exclusivamente desde el backend con credenciales
-- de service role / connection string de postgres.

-- Vista de utilidad por proyecto (solo lectura desde backend)
create or replace view public.v_project_finance as
select
  p.id as project_id,
  p.client_id,
  p.name as project_name,
  coalesce((select sum(pay.amount) from payments pay where pay.project_id = p.id), 0) as income,
  coalesce((select sum(e.amount) from expenses e where e.project_id = p.id), 0) as expenses,
  coalesce((select sum(b.amount) from bonuses b where b.project_id = p.id and b.status = 'aplicada'), 0) as bonuses
from projects p;

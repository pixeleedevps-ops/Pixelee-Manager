-- =============================================================================
-- PIXELÉE MANAGER — Migración incremental 0003
-- Adaptación al esquema EXISTENTE de Supabase (proyecto pyboszwmrzvzzpekmeps).
--
-- REGLAS RESPETADAS:
--  * Solo CREATE TABLE IF NOT EXISTS. No DROP, no ALTER sobre tablas existentes,
--    no RENAME, no cambio de columnas, no modificación de RLS ni de políticas.
--  * No duplica entidades existentes: solo cubre funcionalidades pedidas que
--    NO tienen tabla equivalente en el esquema real (ver SUPABASE_SCHEMA_MAP.md §9).
--  * Reutiliza la función existente public.set_updated_at() para los triggers.
--  * RLS se activa en las tablas nuevas, sin políticas (igual que el resto del
--    esquema): el acceso se controla en la capa API del backend.
--  * Todas las PK son UUID con gen_random_uuid(), igual que el esquema real.
--  * Importes NUMERIC(14,2). Fechas DATE / TIMESTAMPTZ.
-- =============================================================================

-- 1) Gastos extras -----------------------------------------------------------
-- `expenses` existe pero no distingue gasto normal de extraordinario.
create table if not exists public.extra_expenses (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid references public.projects(id) on delete set null,
  description  text not null,
  category     text not null default 'otro',
  amount       numeric(14,2) not null check (amount >= 0),
  spent_at     date not null default current_date,
  receipt_url  text,
  notes        text,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_extra_expenses_project on public.extra_expenses(project_id);
alter table public.extra_expenses enable row level security;

-- 2) Bonificaciones ----------------------------------------------------------
create table if not exists public.bonuses (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid references public.clients(id) on delete set null,
  project_id   uuid references public.projects(id) on delete set null,
  amount       numeric(14,2) not null check (amount >= 0),
  reason       text not null,
  status       text not null default 'pendiente'
               check (status in ('pendiente','aplicada','anulada')),
  granted_at   date not null default current_date,
  notes        text,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_bonuses_client on public.bonuses(client_id);
create index if not exists idx_bonuses_project on public.bonuses(project_id);
alter table public.bonuses enable row level security;

-- 3) Distribución de utilidades ---------------------------------------------
create table if not exists public.profit_distributions (
  id            uuid primary key default gen_random_uuid(),
  period_start  date not null,
  period_end    date not null,
  total_profit  numeric(14,2) not null default 0 check (total_profit >= 0),
  status        text not null default 'borrador'
                check (status in ('borrador','aprobada','pagada','anulada')),
  notes         text,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (period_end >= period_start)
);

create table if not exists public.profit_distribution_items (
  id               uuid primary key default gen_random_uuid(),
  distribution_id  uuid not null references public.profit_distributions(id) on delete cascade,
  profile_id       uuid references public.profiles(id) on delete set null,
  percentage       numeric(5,2) not null check (percentage >= 0 and percentage <= 100),
  amount           numeric(14,2) not null check (amount >= 0),
  status           text not null default 'pendiente'
                   check (status in ('pendiente','pagado','anulado')),
  created_at       timestamptz not null default now()
);
create index if not exists idx_pdi_distribution on public.profit_distribution_items(distribution_id);
alter table public.profit_distributions enable row level security;
alter table public.profit_distribution_items enable row level security;

-- 4) Retiros del administrador ----------------------------------------------
create table if not exists public.withdrawals (
  id                      uuid primary key default gen_random_uuid(),
  distribution_item_id    uuid references public.profit_distribution_items(id) on delete set null,
  profile_id              uuid references public.profiles(id) on delete set null,
  amount                  numeric(14,2) not null check (amount > 0),
  withdrawn_at            date not null default current_date,
  notes                   text,
  created_by              uuid references public.profiles(id) on delete set null,
  created_at              timestamptz not null default now()
);
create index if not exists idx_withdrawals_profile on public.withdrawals(profile_id);
alter table public.withdrawals enable row level security;

-- 5) Métricas de campaña (registro MANUAL, sin APIs publicitarias) -----------
-- `campaigns` solo tiene `budget`. Aquí se registra inversión real, leads y
-- conversiones por campaña, una fila por periodo de medición.
create table if not exists public.campaign_metrics (
  id            uuid primary key default gen_random_uuid(),
  campaign_id   uuid not null references public.campaigns(id) on delete cascade,
  spent         numeric(14,2) not null default 0 check (spent >= 0),
  impressions   integer not null default 0 check (impressions >= 0),
  clicks        integer not null default 0 check (clicks >= 0),
  leads         integer not null default 0 check (leads >= 0),
  conversions   integer not null default 0 check (conversions >= 0),
  recorded_at   date not null default current_date,
  notes         text,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists idx_campaign_metrics_campaign on public.campaign_metrics(campaign_id);
alter table public.campaign_metrics enable row level security;

-- 6) Triggers de updated_at reutilizando la función YA EXISTENTE -------------
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_extra_expenses_updated_at') then
    create trigger trg_extra_expenses_updated_at
      before update on public.extra_expenses
      for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_bonuses_updated_at') then
    create trigger trg_bonuses_updated_at
      before update on public.bonuses
      for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_profit_distributions_updated_at') then
    create trigger trg_profit_distributions_updated_at
      before update on public.profit_distributions
      for each row execute function public.set_updated_at();
  end if;
end $$;

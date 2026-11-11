-- ============================================================
-- PIXELÉE MANAGER - Migración 0001: Esquema inicial
-- Supabase PostgreSQL | UUID | NUMERIC para valores monetarios
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Enums ----------
do $$ begin
  create type user_role as enum ('admin','gerente','contador','desarrollador','marketing');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_status as enum ('activo','inactivo');
exception when duplicate_object then null; end $$;

do $$ begin
  create type client_status as enum ('prospecto','activo','inactivo');
exception when duplicate_object then null; end $$;

do $$ begin
  create type project_type as enum ('desarrollo','marketing');
exception when duplicate_object then null; end $$;

do $$ begin
  create type project_status as enum ('propuesta','en_curso','pausado','completado','cancelado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type phase_status as enum ('pendiente','en_curso','completada','bloqueada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type quotation_status as enum ('borrador','enviada','aprobada','rechazada','vencida');
exception when duplicate_object then null; end $$;

do $$ begin
  create type contract_status as enum ('borrador','activo','finalizado','cancelado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum ('transferencia','efectivo','tarjeta','otro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type expense_type as enum ('normal','extra');
exception when duplicate_object then null; end $$;

do $$ begin
  create type bonus_status as enum ('pendiente','aplicada','rechazada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type distribution_status as enum ('borrador','aprobada','pagada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type distribution_item_status as enum ('pendiente','pagado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type campaign_platform as enum ('google_ads','meta_ads','tiktok_ads','otro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type campaign_status as enum ('borrador','activa','pausada','finalizada');
exception when duplicate_object then null; end $$;

-- ---------- Usuarios y roles ----------
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  password_hash text not null,
  full_name     text not null,
  role          user_role not null default 'desarrollador',
  status        user_status not null default 'activo',
  last_login_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
-- Email único sin distinguir mayúsculas (índice expresión, no restricción)
create unique index if not exists users_email_uniq on users (lower(email));

-- ---------- Clientes ----------
create table if not exists clients (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  tax_id       text,
  contact_name text,
  email        text,
  phone        text,
  address      text,
  status       client_status not null default 'activo',
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
-- Evita duplicados de clientes por nombre
create unique index if not exists clients_name_uniq on clients (lower(name));
create unique index if not exists clients_tax_id_uniq on clients (tax_id) where tax_id is not null;

-- ---------- Documentos de clientes (enlaces manuales) ----------
create table if not exists client_documents (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references clients(id) on delete cascade,
  title      text not null,
  doc_type   text not null default 'otro',
  url        text not null,
  created_at timestamptz not null default now()
);

-- ---------- Proyectos ----------
create table if not exists projects (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references clients(id) on delete restrict,
  name        text not null,
  type        project_type not null,
  status      project_status not null default 'propuesta',
  owner_id    uuid references users(id) on delete set null,
  start_date  date,
  due_date    date,
  domain      text,
  hosting     text,
  budget      numeric(14,2) not null default 0 check (budget >= 0),
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists projects_client_idx on projects(client_id);
create index if not exists projects_owner_idx on projects(owner_id);
create unique index if not exists projects_name_client_uniq on projects (client_id, lower(name));

-- ---------- Responsables de proyecto (equipos) ----------
create table if not exists project_members (
  project_id uuid not null references projects(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

-- ---------- Fases del proyecto ----------
create table if not exists project_phases (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  name         text not null,
  status       phase_status not null default 'pendiente',
  order_index  int not null default 0,
  start_date   date,
  due_date     date,
  completed_at timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists project_phases_project_idx on project_phases(project_id);

-- ---------- Enlaces documentales del proyecto ----------
create table if not exists project_links (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title      text not null,
  url        text not null,
  created_at timestamptz not null default now()
);

-- ---------- Cotizaciones ----------
create table if not exists quotations (
  id           uuid primary key default gen_random_uuid(),
  number       text not null,
  client_id    uuid not null references clients(id) on delete restrict,
  project_id   uuid references projects(id) on delete set null,
  status       quotation_status not null default 'borrador',
  issue_date   date not null default current_date,
  valid_until  date,
  tax_percent  numeric(5,2) not null default 0 check (tax_percent >= 0 and tax_percent <= 100),
  subtotal     numeric(14,2) not null default 0 check (subtotal >= 0),
  tax_amount   numeric(14,2) not null default 0 check (tax_amount >= 0),
  total        numeric(14,2) not null default 0 check (total >= 0),
  notes        text,
  created_by   uuid references users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint quotations_number_uniq unique (number)
);

create table if not exists quotation_items (
  id             uuid primary key default gen_random_uuid(),
  quotation_id   uuid not null references quotations(id) on delete cascade,
  description    text not null,
  quantity       numeric(12,2) not null default 1 check (quantity > 0),
  unit_price     numeric(14,2) not null check (unit_price >= 0),
  amount         numeric(14,2) not null check (amount >= 0),
  order_index    int not null default 0
);
create index if not exists quotation_items_quotation_idx on quotation_items(quotation_id);

-- ---------- Contratos ----------
create table if not exists contracts (
  id             uuid primary key default gen_random_uuid(),
  number         text not null,
  client_id      uuid not null references clients(id) on delete restrict,
  project_id     uuid references projects(id) on delete set null,
  quotation_id   uuid references quotations(id) on delete set null,
  title          text not null,
  status         contract_status not null default 'borrador',
  start_date     date,
  end_date       date,
  amount         numeric(14,2) not null default 0 check (amount >= 0),
  signed_url     text,
  notes          text,
  created_by     uuid references users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint contracts_number_uniq unique (number)
);
create index if not exists contracts_client_idx on contracts(client_id);
create index if not exists contracts_project_idx on contracts(project_id);

-- ---------- Recaudos ----------
create table if not exists payments (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references clients(id) on delete restrict,
  contract_id  uuid references contracts(id) on delete set null,
  project_id   uuid references projects(id) on delete set null,
  received_at  date not null default current_date,
  amount       numeric(14,2) not null check (amount > 0),
  method       payment_method not null default 'transferencia',
  reference    text,
  notes        text,
  created_by   uuid references users(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists payments_client_idx on payments(client_id);
create index if not exists payments_contract_idx on payments(contract_id);
create index if not exists payments_date_idx on payments(received_at);

-- ---------- Gastos (normales y extras) ----------
create table if not exists expenses (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid references projects(id) on delete set null,
  category     text not null,
  expense_type expense_type not null default 'normal',
  spent_at     date not null default current_date,
  amount       numeric(14,2) not null check (amount > 0),
  description  text not null,
  provider     text,
  receipt_url  text,
  created_by   uuid references users(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists expenses_project_idx on expenses(project_id);
create index if not exists expenses_date_idx on expenses(spent_at);
create index if not exists expenses_type_idx on expenses(expense_type);

-- ---------- Bonificaciones ----------
create table if not exists bonuses (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid references clients(id) on delete set null,
  project_id  uuid references projects(id) on delete set null,
  granted_at  date not null default current_date,
  amount      numeric(14,2) not null check (amount > 0),
  reason      text not null,
  status      bonus_status not null default 'pendiente',
  created_by  uuid references users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists bonuses_project_idx on bonuses(project_id);

-- ---------- Distribución de utilidades ----------
create table if not exists profit_distributions (
  id                 uuid primary key default gen_random_uuid(),
  label              text not null,
  period_start       date not null,
  period_end         date not null,
  total_income       numeric(14,2) not null default 0,
  total_expenses     numeric(14,2) not null default 0,
  total_bonuses      numeric(14,2) not null default 0,
  total_profit       numeric(14,2) not null default 0,
  distributed_amount numeric(14,2) not null default 0,
  status             distribution_status not null default 'borrador',
  created_by         uuid references users(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint profit_d_periods_chk check (period_end >= period_start)
);

create table if not exists distribution_items (
  id              uuid primary key default gen_random_uuid(),
  distribution_id uuid not null references profit_distributions(id) on delete cascade,
  user_id         uuid not null references users(id) on delete restrict,
  percentage      numeric(6,2) not null check (percentage >= 0 and percentage <= 100),
  amount          numeric(14,2) not null default 0 check (amount >= 0),
  status          distribution_item_status not null default 'pendiente',
  paid_at         date,
  created_at      timestamptz not null default now(),
  unique (distribution_id, user_id)
);

-- ---------- Marketing: servicios ----------
create table if not exists services (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create unique index if not exists services_name_uniq on services (lower(name));

-- ---------- Marketing: campañas ----------
create table if not exists campaigns (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references clients(id) on delete restrict,
  project_id     uuid references projects(id) on delete set null,
  service_id     uuid references services(id) on delete set null,
  name           text not null,
  platform       campaign_platform not null default 'google_ads',
  status         campaign_status not null default 'borrador',
  responsible_id uuid references users(id) on delete set null,
  start_date     date,
  end_date       date,
  budget         numeric(14,2) not null default 0 check (budget >= 0),
  investment     numeric(14,2) not null default 0 check (investment >= 0),
  objective      text,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists campaigns_client_idx on campaigns(client_id);
create index if not exists campaigns_service_idx on campaigns(service_id);

-- ---------- Marketing: resultados (registro manual) ----------
create table if not exists campaign_metrics (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references campaigns(id) on delete cascade,
  recorded_at  date not null default current_date,
  spend        numeric(14,2) not null default 0 check (spend >= 0),
  impressions  bigint not null default 0 check (impressions >= 0),
  clicks       int not null default 0 check (clicks >= 0),
  leads        int not null default 0 check (leads >= 0),
  conversions  int not null default 0 check (conversions >= 0),
  notes        text,
  created_by   uuid references users(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists campaign_metrics_campaign_idx on campaign_metrics(campaign_id);
create index if not exists campaign_metrics_date_idx on campaign_metrics(recorded_at);

-- ---------- Configuración ----------
create table if not exists settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------- Triggers updated_at ----------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
  foreach t in array array['users','clients','projects','quotations','contracts','bonuses','profit_distributions','campaigns']
  loop
    execute format('drop trigger if exists %I on %I', 'trg_'||t||'_updated_at', t);
    execute format('create trigger trg_%I_updated_at before update on %I for each row execute function set_updated_at()', t, t);
  end loop;
end $$;

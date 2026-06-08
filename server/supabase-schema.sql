-- Supabase schema for Inventory Management System
-- Run this file in Supabase Dashboard -> SQL Editor -> New query -> Run.

create table if not exists public.app_users (
  id text primary key,
  username text not null unique,
  password text not null,
  role text not null check (role in ('admin', 'manager')) default 'admin',
  created_at timestamptz not null default now()
);

create table if not exists public.inventory (
  id text primary key,
  name text not null,
  category text not null,
  quantity integer not null default 0 check (quantity >= 0),
  min_stock integer not null default 0 check (min_stock >= 0),
  price numeric(12, 2) not null default 0 check (price >= 0),
  status text not null check (status in ('В наличии', 'Низкий запас', 'Критический')),
  location text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id text primary key,
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id text primary key,
  name text not null unique,
  delivery_days integer not null default 7 check (delivery_days between 1 and 365),
  created_at timestamptz not null default now()
);

alter table public.suppliers
add column if not exists delivery_days integer not null default 7;

alter table public.suppliers
drop constraint if exists suppliers_delivery_days_check;

alter table public.suppliers
add constraint suppliers_delivery_days_check check (delivery_days between 1 and 365);

create table if not exists public.orders (
  id text primary key,
  product text not null,
  quantity integer not null check (quantity > 0),
  supplier text not null,
  predicted_stock integer not null default 0 check (predicted_stock >= 0),
  ai_confidence integer not null default 0 check (ai_confidence between 0 and 100),
  order_value numeric(14, 2) not null default 0 check (order_value >= 0),
  status text not null check (status in ('completed', 'processing', 'pending', 'scheduled', 'paused', 'cancelled')),
  created_at timestamptz not null default now(),
  created_at_display text,
  delivery_date date not null,
  reason text not null default 'Создано вручную'
);

create table if not exists public.stock_movements (
  id text primary key,
  product_id text not null,
  product_name text not null,
  type text not null check (type in ('inbound', 'outbound', 'adjustment')),
  quantity integer not null check (quantity >= 0),
  source text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.sales_history (
  id text primary key,
  product_id text not null,
  product_name text not null,
  category text not null,
  quantity integer not null check (quantity >= 0),
  revenue numeric(14, 2) not null default 0 check (revenue >= 0),
  cost numeric(14, 2) not null default 0 check (cost >= 0),
  sold_at timestamptz not null default now()
);

create table if not exists public.ml_forecasts (
  id text primary key,
  product_id text not null,
  product_name text not null,
  forecast_date date not null,
  horizon_label text not null,
  actual_demand integer not null default 0 check (actual_demand >= 0),
  predicted_demand integer not null default 0 check (predicted_demand >= 0),
  confidence integer not null default 0 check (confidence between 0 and 100),
  recommended_order integer not null default 0 check (recommended_order >= 0),
  lead_days integer not null default 1 check (lead_days > 0),
  status text not null check (status in ('Критическая', 'Средняя', 'Низкая')),
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  id integer primary key default 1 check (id = 1),
  ml_enabled boolean not null default true,
  ml_confidence_threshold integer not null default 85,
  ml_update_frequency text not null default 'daily' check (ml_update_frequency in ('hourly', 'daily', 'weekly', 'monthly')),
  ml_training_data_days integer not null default 90,
  auto_order_enabled boolean not null default true,
  min_order_quantity integer not null default 10,
  max_order_quantity integer not null default 1000,
  order_buffer integer not null default 20,
  approval_required boolean not null default false,
  email_notifications boolean not null default true,
  low_stock_alerts boolean not null default true,
  order_confirmations boolean not null default true,
  ml_recommendations boolean not null default true,
  default_supplier text not null default '',
  order_lead_time integer not null default 7,
  auto_order_strategy text not null default 'ml_forecast' check (auto_order_strategy in ('ml_forecast', 'min_stock', 'hybrid')),
  order_priority text not null default 'critical_only' check (order_priority in ('critical_only', 'critical_and_low', 'all_below_min')),
  notification_email text not null default '',
  digest_frequency text not null default 'daily' check (digest_frequency in ('daily', 'weekly', 'monthly')),
  seasonality_mode text not null default 'auto' check (seasonality_mode in ('auto', 'manual')),
  seasonality_coefficients jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_inventory_updated_at on public.inventory;
create trigger set_inventory_updated_at
before update on public.inventory
for each row execute function public.set_updated_at();

drop trigger if exists set_settings_updated_at on public.settings;
create trigger set_settings_updated_at
before update on public.settings
for each row execute function public.set_updated_at();


alter table public.settings add column if not exists auto_order_strategy text not null default 'ml_forecast';
alter table public.settings drop constraint if exists settings_auto_order_strategy_check;
alter table public.settings add constraint settings_auto_order_strategy_check check (auto_order_strategy in ('ml_forecast', 'min_stock', 'hybrid'));

alter table public.settings add column if not exists order_priority text not null default 'critical_only';
alter table public.settings drop constraint if exists settings_order_priority_check;
alter table public.settings add constraint settings_order_priority_check check (order_priority in ('critical_only', 'critical_and_low', 'all_below_min'));

alter table public.settings add column if not exists notification_email text not null default '';

alter table public.settings add column if not exists digest_frequency text not null default 'daily';
alter table public.settings drop constraint if exists settings_digest_frequency_check;
alter table public.settings add constraint settings_digest_frequency_check check (digest_frequency in ('daily', 'weekly', 'monthly'));

alter table public.settings add column if not exists seasonality_mode text not null default 'auto';
alter table public.settings drop constraint if exists settings_seasonality_mode_check;
alter table public.settings add constraint settings_seasonality_mode_check check (seasonality_mode in ('auto', 'manual'));

alter table public.settings add column if not exists seasonality_coefficients jsonb not null default '{}'::jsonb;



insert into public.stock_movements (id, product_id, product_name, type, quantity, source, created_at)
select 'MOV-SEED-' || id, id, name, 'inbound', quantity, 'Начальный остаток', created_at
from public.inventory
where quantity > 0
on conflict (id) do nothing;

insert into public.categories (id, name)
select 'CAT-' || md5(trim(category)), trim(category)
from public.inventory
where trim(coalesce(category, '')) <> ''
on conflict (name) do nothing;

insert into public.suppliers (id, name, delivery_days)
select 'SUP-' || md5(trim(supplier)), trim(supplier), 7
from public.orders
where trim(coalesce(supplier, '')) <> ''
  and lower(regexp_replace(trim(supplier), '[«»"''\s]', '', 'g')) <> 'techopttorg'
on conflict (name) do nothing;

update public.settings
set default_supplier = ''
where id = 1
  and lower(regexp_replace(trim(default_supplier), '[«»"''\s]', '', 'g')) = 'techopttorg';

-- В этом варианте нет демонстрационных пользователей, товаров и заказов.
-- После запуска приложения создайте первого администратора на экране входа.
-- Таблицы inventory и orders будут заполняться только реальными действиями в интерфейсе.
-- Поставщиков можно добавлять в разделе «Автозаказы» через меню «Поставщики».
-- Строка settings создаётся автоматически при первом чтении/сохранении настроек.

-- Категории можно добавлять в разделе «Складские запасы» через кнопку «Добавить категорию».

-- История склада и продаж хранится в stock_movements и sales_history.
-- ML-прогнозы хранятся в ml_forecasts и создаются через POST /api/ml/forecasts/generate.

-- В settings добавлены параметры автозаказа: auto_order_strategy и order_priority.

-- Email-настройки хранятся в settings.notification_email и settings.digest_frequency.

-- Настройки сезонности ML: settings.seasonality_mode и settings.seasonality_coefficients.

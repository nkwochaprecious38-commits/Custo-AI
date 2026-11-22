-- Custo AI database schema
-- Run in the Supabase SQL editor (or `supabase db push`). Safe to run once on a fresh project.
set search_path = public, extensions;

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Core tenancy
-- ---------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  slug text unique,
  website text,
  plan text not null default 'starter' check (plan in ('starter','professional','enterprise')),
  demo_seeded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'team_member' check (role in ('org_admin','store_manager','ecommerce_manager','marketing_manager','analyst','team_member')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index on public.organization_members(user_id);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role text not null default 'team_member' check (role in ('org_admin','store_manager','ecommerce_manager','marketing_manager','analyst','team_member')),
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','accepted','revoked')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);
create index on public.invitations(org_id);
create index on public.invitations(lower(email));

-- ---------------------------------------------------------------------------
-- Access helpers (security definer so policies do not recurse)
-- ---------------------------------------------------------------------------
create or replace function public.is_org_member(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organization_members m where m.org_id = p_org and m.user_id = auth.uid());
$$;

create or replace function public.has_org_role(p_org uuid, p_roles text[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organization_members m where m.org_id = p_org and m.user_id = auth.uid() and m.role = any(p_roles));
$$;

-- Roles allowed to change commerce configuration (campaigns, rules, catalog)
create or replace function public.can_edit(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_org_role(p_org, array['org_admin','store_manager','ecommerce_manager','marketing_manager']);
$$;

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ---------------------------------------------------------------------------
-- Stores and integrations
-- ---------------------------------------------------------------------------
create table public.stores (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  url text,
  platform text not null default 'custom' check (platform in ('shopify','shopify_plus','woocommerce','bigcommerce','adobe_commerce','shopware','salesforce_commerce','custom')),
  status text not null default 'not_connected' check (status in ('not_connected','pending','connected','error')),
  tracking_key text not null unique default encode(gen_random_bytes(16), 'hex'),
  product_count integer not null default 0,
  last_synced_at timestamptz,
  last_event_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.stores(org_id);

create table public.store_integrations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  store_id uuid references public.stores(id) on delete cascade,
  provider text not null,
  status text not null default 'not_configured' check (status in ('not_configured','pending','connected','error')),
  config jsonb not null default '{}'::jsonb,
  last_tested_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, provider, store_id)
);
create index on public.store_integrations(org_id);

-- Secrets live in a table with RLS enabled and NO policies: only the service role (server) can read it.
create table public.integration_credentials (
  integration_id uuid primary key references public.store_integrations(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  credentials jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------
create table public.brands (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (org_id, name)
);

create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  parent_id uuid references public.product_categories(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (org_id, name)
);

create table public.product_attributes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  attr_type text not null default 'text' check (attr_type in ('text','number','boolean','list')),
  allowed_values text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (org_id, name)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  store_id uuid references public.stores(id) on delete set null,
  external_id text,
  title text not null check (char_length(title) between 1 and 300),
  description text,
  price numeric(12,2) not null default 0 check (price >= 0),
  compare_at_price numeric(12,2) check (compare_at_price is null or compare_at_price >= 0),
  currency text not null default 'USD',
  sku text,
  category_id uuid references public.product_categories(id) on delete set null,
  brand_id uuid references public.brands(id) on delete set null,
  inventory_quantity integer not null default 0,
  status text not null default 'active' check (status in ('active','draft','archived')),
  image_url text,
  tags text[] not null default '{}',
  attributes jsonb not null default '{}'::jsonb,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.products(org_id);
create index on public.products(org_id, category_id);
alter table public.products add constraint products_external_unique unique (org_id, store_id, external_id);

-- ---------------------------------------------------------------------------
-- Customers and behavior
-- ---------------------------------------------------------------------------
create table public.customer_profiles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  store_id uuid references public.stores(id) on delete set null,
  external_id text,
  email text,
  consent_status text not null default 'unknown' check (consent_status in ('granted','denied','unknown')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  visit_count integer not null default 1,
  total_orders integer not null default 0,
  total_spent numeric(12,2) not null default 0,
  discount_orders integer not null default 0,
  has_abandoned_cart boolean not null default false,
  favorite_category text,
  country text,
  device text,
  attributes jsonb not null default '{}'::jsonb,
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.customer_profiles(org_id);
alter table public.customer_profiles add constraint customer_external_unique unique (org_id, external_id);

create table public.customer_segments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text,
  match_type text not null default 'all' check (match_type in ('all','any')),
  rules jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('active','inactive')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.customer_segments(org_id);

create table public.behavioral_events (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  store_id uuid references public.stores(id) on delete set null,
  customer_id uuid references public.customer_profiles(id) on delete set null,
  session_id text,
  event_type text not null check (event_type in ('page_view','product_view','product_click','add_to_cart','remove_from_cart','checkout_start','purchase','search','recommendation_impression','recommendation_click','content_impression','content_click')),
  product_id uuid references public.products(id) on delete set null,
  properties jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  is_sample boolean not null default false
);
create index on public.behavioral_events(org_id, occurred_at);
create index on public.behavioral_events(org_id, event_type, occurred_at);
create index on public.behavioral_events(product_id);

create table public.cart_events (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid references public.customer_profiles(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  action text not null check (action in ('add','remove','abandon')),
  quantity integer not null default 1,
  occurred_at timestamptz not null default now(),
  is_sample boolean not null default false
);
create index on public.cart_events(org_id, occurred_at);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  store_id uuid references public.stores(id) on delete set null,
  customer_id uuid references public.customer_profiles(id) on delete set null,
  external_id text,
  total numeric(12,2) not null default 0,
  currency text not null default 'USD',
  items jsonb not null default '[]'::jsonb,
  attributed_campaign_id uuid,
  discount_used boolean not null default false,
  placed_at timestamptz not null default now(),
  is_sample boolean not null default false
);
create index on public.orders(org_id, placed_at);

create table public.search_queries (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid references public.customer_profiles(id) on delete set null,
  query text not null,
  results_count integer not null default 0,
  clicked_product_id uuid references public.products(id) on delete set null,
  occurred_at timestamptz not null default now(),
  is_sample boolean not null default false
);
create index on public.search_queries(org_id, occurred_at);

create table public.search_synonyms (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  terms text[] not null check (array_length(terms, 1) >= 2),
  one_way boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Campaigns, merchandising, content, experiments
-- ---------------------------------------------------------------------------
create table public.commerce_campaigns (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  objective text not null default 'conversion' check (objective in ('awareness','engagement','conversion','retention','clearance')),
  segment_id uuid references public.customer_segments(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','scheduled','active','paused','completed')),
  starts_at timestamptz,
  ends_at timestamptz,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create index on public.commerce_campaigns(org_id);

create table public.recommendation_campaigns (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  campaign_id uuid references public.commerce_campaigns(id) on delete set null,
  name text not null check (char_length(name) between 1 and 160),
  rec_type text not null check (rec_type in ('recommended_for_you','frequently_bought_together','similar_products','recently_viewed','best_sellers','trending','related_products','new_arrivals','complementary','replenishment')),
  segment_id uuid references public.customer_segments(id) on delete set null,
  placement text not null default 'product_page' check (placement in ('home_page','product_page','category_page','cart_page','checkout','post_purchase','search_results','email')),
  max_products integer not null default 8 check (max_products between 1 and 48),
  rules jsonb not null default '{"include_categories":[],"exclude_categories":[],"exclude_out_of_stock":true,"exclude_product_ids":[]}'::jsonb,
  status text not null default 'draft' check (status in ('draft','active','paused','scheduled')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.recommendation_campaigns(org_id);

create table public.recommendation_impressions (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  campaign_id uuid references public.recommendation_campaigns(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  customer_id uuid references public.customer_profiles(id) on delete set null,
  occurred_at timestamptz not null default now(),
  is_sample boolean not null default false
);
create index on public.recommendation_impressions(org_id, campaign_id);

create table public.recommendation_clicks (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  campaign_id uuid references public.recommendation_campaigns(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  customer_id uuid references public.customer_profiles(id) on delete set null,
  occurred_at timestamptz not null default now(),
  is_sample boolean not null default false
);
create index on public.recommendation_clicks(org_id, campaign_id);

create table public.merchandising_rules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  campaign_id uuid references public.commerce_campaigns(id) on delete set null,
  name text not null check (char_length(name) between 1 and 160),
  scope text not null default 'category' check (scope in ('all','category','search')),
  category_id uuid references public.product_categories(id) on delete cascade,
  search_term text,
  rule_type text not null check (rule_type in ('pin','boost','bury','exclude','prioritize_best_sellers','highlight_new_arrivals','promote_seasonal','exclude_out_of_stock','prioritize_category')),
  product_ids uuid[] not null default '{}',
  config jsonb not null default '{}'::jsonb,
  priority integer not null default 100,
  status text not null default 'draft' check (status in ('draft','active','paused','scheduled')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.merchandising_rules(org_id);

create table public.content_campaigns (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  campaign_id uuid references public.commerce_campaigns(id) on delete set null,
  name text not null check (char_length(name) between 1 and 160),
  content_type text not null check (content_type in ('homepage_banner','promotional_message','collection_section','landing_page','category_content','popup','featured_products')),
  segment_id uuid references public.customer_segments(id) on delete set null,
  placement text not null default 'home_hero',
  content jsonb not null default '{}'::jsonb,
  priority integer not null default 100,
  status text not null default 'draft' check (status in ('draft','scheduled','active','paused')),
  starts_at timestamptz,
  ends_at timestamptz,
  impressions integer not null default 0,
  clicks integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.content_campaigns(org_id);

create table public.ab_experiments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  hypothesis text,
  experiment_type text not null check (experiment_type in ('recommendation_layout','homepage_banner','product_sorting','promotional_message','search_layout','product_display','call_to_action')),
  primary_metric text not null default 'conversion_rate' check (primary_metric in ('click_through_rate','conversion_rate','add_to_cart_rate','average_order_value','revenue_per_visitor')),
  segment_id uuid references public.customer_segments(id) on delete set null,
  traffic_allocation integer not null default 100 check (traffic_allocation between 1 and 100),
  status text not null default 'draft' check (status in ('draft','running','paused','completed')),
  started_at timestamptz,
  ended_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.ab_experiments(org_id);

create table public.experiment_variations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  experiment_id uuid not null references public.ab_experiments(id) on delete cascade,
  name text not null,
  description text,
  is_control boolean not null default false,
  traffic_weight integer not null default 50 check (traffic_weight between 0 and 100),
  visitors integer not null default 0 check (visitors >= 0),
  clicks integer not null default 0 check (clicks >= 0),
  add_to_carts integer not null default 0 check (add_to_carts >= 0),
  conversions integer not null default 0 check (conversions >= 0),
  revenue numeric(12,2) not null default 0 check (revenue >= 0),
  created_at timestamptz not null default now()
);
create index on public.experiment_variations(experiment_id);

-- ---------------------------------------------------------------------------
-- Analytics, notifications, reports, audit
-- ---------------------------------------------------------------------------
create table public.analytics_events (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  metric_date date not null,
  metric text not null,
  dimension text,
  value numeric not null default 0,
  created_at timestamptz not null default now()
);
create index on public.analytics_events(org_id, metric_date);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.notifications(org_id, user_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  report_type text not null default 'analytics',
  config jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on public.audit_logs(org_id, created_at desc);

-- updated_at triggers
do $$ declare t text; begin
  foreach t in array array['organizations','profiles','stores','store_integrations','products','customer_segments','commerce_campaigns','recommendation_campaigns','merchandising_rules','content_campaigns','ab_experiments'] loop
    execute format('create trigger touch_%1$s before update on public.%1$s for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.invitations enable row level security;
alter table public.integration_credentials enable row level security;

create policy org_select on public.organizations for select using (public.is_org_member(id));
create policy org_update on public.organizations for update using (public.has_org_role(id, array['org_admin'])) with check (public.has_org_role(id, array['org_admin']));

create policy profile_select on public.profiles for select using (
  id = auth.uid() or exists (
    select 1 from public.organization_members a join public.organization_members b on a.org_id = b.org_id
    where a.user_id = auth.uid() and b.user_id = profiles.id)
);
create policy profile_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy members_select on public.organization_members for select using (public.is_org_member(org_id));
create policy members_update on public.organization_members for update using (public.has_org_role(org_id, array['org_admin'])) with check (public.has_org_role(org_id, array['org_admin']));
create policy members_delete on public.organization_members for delete using (public.has_org_role(org_id, array['org_admin']) or user_id = auth.uid());

create policy invites_select on public.invitations for select using (public.has_org_role(org_id, array['org_admin']));
create policy invites_insert on public.invitations for insert with check (public.has_org_role(org_id, array['org_admin']));
create policy invites_update on public.invitations for update using (public.has_org_role(org_id, array['org_admin']));
create policy invites_delete on public.invitations for delete using (public.has_org_role(org_id, array['org_admin']));
-- integration_credentials: intentionally no policies (service role only)

-- Generic org scoped tables: members read; editors write
do $$ declare t text; begin
  foreach t in array array['stores','store_integrations','brands','product_categories','product_attributes','products','customer_segments','search_synonyms','commerce_campaigns','recommendation_campaigns','merchandising_rules','content_campaigns','ab_experiments','experiment_variations','reports'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %1$s_select on public.%1$I for select using (public.is_org_member(org_id))', t);
    execute format('create policy %1$s_insert on public.%1$I for insert with check (public.can_edit(org_id))', t);
    execute format('create policy %1$s_update on public.%1$I for update using (public.can_edit(org_id)) with check (public.can_edit(org_id))', t);
    execute format('create policy %1$s_delete on public.%1$I for delete using (public.can_edit(org_id))', t);
  end loop;
end $$;

-- Behavioral data: members read, editors may delete (for data removal requests); inserts arrive through the server tracking API or seeding function
do $$ declare t text; begin
  foreach t in array array['customer_profiles','behavioral_events','cart_events','orders','search_queries','recommendation_impressions','recommendation_clicks','analytics_events'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %1$s_select on public.%1$I for select using (public.is_org_member(org_id))', t);
    execute format('create policy %1$s_delete on public.%1$I for delete using (public.has_org_role(org_id, array[''org_admin'',''store_manager'']))', t);
  end loop;
end $$;

alter table public.notifications enable row level security;
create policy notif_select on public.notifications for select using (public.is_org_member(org_id) and (user_id is null or user_id = auth.uid()));
create policy notif_update on public.notifications for update using (public.is_org_member(org_id) and (user_id is null or user_id = auth.uid()));

alter table public.audit_logs enable row level security;
create policy audit_select on public.audit_logs for select using (public.has_org_role(org_id, array['org_admin','store_manager','analyst']));
create policy audit_insert on public.audit_logs for insert with check (public.is_org_member(org_id) and user_id = auth.uid());

-- Grants (Supabase grants these by default; included for completeness on self hosted setups)
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to authenticated, service_role;

-- Lets the API embed member profiles (profiles.id equals auth.users.id)
alter table public.organization_members add constraint organization_members_profile_fk foreign key (user_id) references public.profiles(id) on delete cascade;

-- Purchase events can be retried by storefronts; an order id is only recorded once per organization
alter table public.orders add constraint orders_external_unique unique (org_id, external_id);

-- Custo AI database schema. Run in the Supabase SQL editor (or `supabase db push`).
-- Every business table carries org_id and is protected by row level security.

create extension if not exists pgcrypto;

-- ---------- Core tenancy ----------
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  slug text unique not null,
  website text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, company text,
  created_at timestamptz not null default now()
);
create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'team_member' check (role in ('org_admin','store_manager','ecommerce_manager','marketing_manager','analyst','team_member')),
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);
create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  role text not null default 'team_member' check (role in ('org_admin','store_manager','ecommerce_manager','marketing_manager','analyst','team_member')),
  status text not null default 'pending' check (status in ('pending','accepted','revoked')),
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists invitations_email_idx on invitations (lower(email));

-- ---------- Access helpers ----------
create or replace function custo_is_member(p_org uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from memberships where org_id = p_org and user_id = auth.uid()) $$;
create or replace function custo_is_org_admin(p_org uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from memberships where org_id = p_org and user_id = auth.uid() and role = 'org_admin') $$;
create or replace function custo_can_write(p_org uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from memberships where org_id = p_org and user_id = auth.uid()
   and role in ('org_admin','store_manager','ecommerce_manager','marketing_manager')) $$;

-- ---------- Commerce data ----------
create table if not exists stores (
  id uuid primary key default gen_random_uuid(), org_id uuid not null references organizations(id) on delete cascade,
  name text not null, url text not null, platform text not null default 'shopify',
  status text not null default 'not_connected' check (status in ('not_connected','connected','error')),
  last_synced_at timestamptz, product_count int not null default 0,
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists store_integrations (
  id uuid primary key default gen_random_uuid(), org_id uuid not null references organizations(id) on delete cascade,
  store_id uuid references stores(id) on delete cascade, provider text not null,
  status text not null default 'not_connected' check (status in ('not_connected','testing','connected','error')),
  shop_domain text, last_tested_at timestamptz, last_error text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (store_id, provider)
);
-- Credentials: no policies, so only the service role (server routes) can read or write.
create table if not exists integration_secrets (
  integration_id uuid primary key references store_integrations(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  secret text not null, created_at timestamptz not null default now()
);
create table if not exists brands (
  id uuid primary key default gen_random_uuid(), org_id uuid not null references organizations(id) on delete cascade,
  name text not null, website text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists product_categories (
  id uuid primary key default gen_random_uuid(), org_id uuid not null references organizations(id) on delete cascade,
  name text not null, parent text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists products (
  id uuid primary key default gen_random_uuid(), org_id uuid not null references organizations(id) on delete cascade,
  store_id uuid references stores(id) on delete set null,
  name text not null, sku text, price numeric(12,2) check (price >= 0), category text, brand text,
  inventory int not null default 0 check (inventory >= 0), image_url text, status text not null default 'active' check (status in ('active','draft','archived')),
  description text, tags text, external_id text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists products_org_external on products (org_id, external_id) where external_id is not null;
create table if not exists product_attributes (
  id uuid primary key default gen_random_uuid(), org_id uuid not null references organizations(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade, name text not null, value text not null,
  created_at timestamptz not null default now()
);
create table if not exists customer_profiles (
  id uuid primary key default gen_random_uuid(), org_id uuid not null references organizations(id) on delete cascade,
  external_id text, consent_given boolean not null default false, total_orders int not null default 0,
  total_spend numeric(12,2) not null default 0, last_seen_at timestamptz, attributes jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create table if not exists segments (
  id uuid primary key default gen_random_uuid(), org_id uuid not null references organizations(id) on delete cascade,
  name text not null, description text, attribute text not null, operator text not null, value text not null,
  status text not null default 'active' check (status in ('active','paused','draft')), member_count int not null default 0,
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists behavioral_events (
  id uuid primary key default gen_random_uuid(), org_id uuid not null references organizations(id) on delete cascade,
  store_id uuid references stores(id) on delete set null, customer_id uuid references customer_profiles(id) on delete set null,
  product_id uuid references products(id) on delete set null, event_type text not null, properties jsonb not null default '{}',
  occurred_at timestamptz not null default now()
);
create index if not exists behavioral_events_org_time on behavioral_events (org_id, occurred_at desc);
create table if not exists search_queries (
  id uuid primary key default gen_random_uuid(), org_id uuid not null references organizations(id) on delete cascade,
  store_id uuid references stores(id) on delete set null, query text not null, results_count int not null default 0,
  clicked boolean not null default false, occurred_at timestamptz not null default now()
);
create table if not exists search_synonyms (
  id uuid primary key default gen_random_uuid(), org_id uuid not null references organizations(id) on delete cascade,
  term text not null, synonyms text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists rec_campaigns (
  id uuid primary key default gen_random_uuid(), org_id uuid not null references organizations(id) on delete cascade,
  name text not null, rec_type text not null, audience text, placement text not null, inclusion_rules text, exclusion_rules text,
  status text not null default 'draft' check (status in ('draft','active','paused')),
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists rec_impressions (
  id uuid primary key default gen_random_uuid(), org_id uuid not null references organizations(id) on delete cascade,
  campaign_id uuid references rec_campaigns(id) on delete cascade, product_id uuid references products(id) on delete set null,
  customer_id uuid references customer_profiles(id) on delete set null, occurred_at timestamptz not null default now()
);
create table if not exists rec_clicks (
  id uuid primary key default gen_random_uuid(), org_id uuid not null references organizations(id) on delete cascade,
  campaign_id uuid references rec_campaigns(id) on delete cascade, product_id uuid references products(id) on delete set null,
  customer_id uuid references customer_profiles(id) on delete set null, occurred_at timestamptz not null default now()
);
create table if not exists merch_rules (
  id uuid primary key default gen_random_uuid(), org_id uuid not null references organizations(id) on delete cascade,
  name text not null, action text not null check (action in ('pin','promote','demote','exclude','prioritize')),
  target_type text not null default 'product', target text not null, boost int not null default 1,
  starts_on date, ends_on date, status text not null default 'draft' check (status in ('draft','scheduled','active','paused')),
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists content_campaigns (
  id uuid primary key default gen_random_uuid(), org_id uuid not null references organizations(id) on delete cascade,
  name text not null, surface text not null, headline text, body text, cta_label text, cta_url text, audience text,
  starts_on date, ends_on date, status text not null default 'draft' check (status in ('draft','scheduled','active','paused')),
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(), org_id uuid not null references organizations(id) on delete cascade,
  name text not null, channel text not null, goal text, audience text, starts_on date, ends_on date,
  status text not null default 'draft' check (status in ('draft','scheduled','active','paused','completed')),
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists experiments (
  id uuid primary key default gen_random_uuid(), org_id uuid not null references organizations(id) on delete cascade,
  name text not null, test_type text not null, primary_metric text not null default 'conversion_rate', hypothesis text,
  status text not null default 'draft' check (status in ('draft','running','paused','completed')),
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists experiment_variations (
  id uuid primary key default gen_random_uuid(), org_id uuid not null references organizations(id) on delete cascade,
  experiment_id uuid not null references experiments(id) on delete cascade, name text not null,
  visitors int not null default 0 check (visitors >= 0), clicks int not null default 0 check (clicks >= 0),
  add_to_carts int not null default 0 check (add_to_carts >= 0), orders int not null default 0 check (orders >= 0),
  revenue numeric(12,2) not null default 0 check (revenue >= 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(), org_id uuid not null references organizations(id) on delete cascade,
  store_id uuid references stores(id) on delete set null, name text not null, properties jsonb not null default '{}',
  occurred_at timestamptz not null default now()
);
create table if not exists orders (
  id uuid primary key default gen_random_uuid(), org_id uuid not null references organizations(id) on delete cascade,
  store_id uuid references stores(id) on delete set null, customer_id uuid references customer_profiles(id) on delete set null,
  campaign_id uuid references campaigns(id) on delete set null, external_id text, total numeric(12,2) not null default 0,
  currency text not null default 'USD', placed_at timestamptz not null default now()
);
create table if not exists cart_events (
  id uuid primary key default gen_random_uuid(), org_id uuid not null references organizations(id) on delete cascade,
  store_id uuid references stores(id) on delete set null, customer_id uuid references customer_profiles(id) on delete set null,
  product_id uuid references products(id) on delete set null, action text not null check (action in ('add','remove','checkout')),
  occurred_at timestamptz not null default now()
);
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(), org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade, title text not null, body text, read boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists reports (
  id uuid primary key default gen_random_uuid(), org_id uuid not null references organizations(id) on delete cascade,
  name text not null, type text not null, config jsonb not null default '{}', created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(), org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references auth.users(id), action text not null, entity text not null, entity_id text, details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_org_time on audit_logs (org_id, created_at desc);

-- ---------- Keep updated_at fresh ----------
create or replace function touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
do $$ declare t text; begin
  foreach t in array array['organizations','stores','store_integrations','brands','product_categories','products','segments','search_synonyms',
    'rec_campaigns','merch_rules','content_campaigns','campaigns','experiments','experiment_variations'] loop
    execute format('drop trigger if exists touch_%1$s on %1$s; create trigger touch_%1$s before update on %1$s for each row execute function touch_updated_at();', t);
  end loop;
end $$;

-- ---------- Workspace creation on sign up ----------
-- Registration metadata (full_name, company, website) comes from supabase.auth.signUp options.data.
-- If a pending invitation exists for the email, the user joins that organization instead of creating a new one.
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare inv record; new_org uuid; org_name text; base_slug text;
begin
  insert into profiles (id, full_name, company) values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'company')
  on conflict (id) do nothing;
  select * into inv from invitations where lower(email) = lower(new.email) and status = 'pending' order by created_at desc limit 1;
  if found then
    insert into memberships (org_id, user_id, role) values (inv.org_id, new.id, inv.role) on conflict do nothing;
    update invitations set status = 'accepted' where id = inv.id;
  else
    org_name := coalesce(nullif(trim(new.raw_user_meta_data->>'company'), ''), split_part(new.email, '@', 1) || ' workspace');
    base_slug := lower(regexp_replace(org_name, '[^a-zA-Z0-9]+', '-', 'g'));
    insert into organizations (name, slug, website) values (org_name, left(base_slug, 40) || '-' || substr(gen_random_uuid()::text, 1, 6), new.raw_user_meta_data->>'website')
    returning id into new_org;
    insert into memberships (org_id, user_id, role) values (new_org, new.id, 'org_admin');
    insert into audit_logs (org_id, user_id, action, entity, entity_id) values (new_org, new.id, 'workspace.created', 'organization', new_org::text);
  end if;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- Fallback for accounts created before this schema existed.
create or replace function ensure_workspace() returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); org uuid; u record;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select org_id into org from memberships where user_id = uid limit 1;
  if org is not null then return org; end if;
  select * into u from auth.users where id = uid;
  insert into organizations (name, slug) values (coalesce(nullif(trim(u.raw_user_meta_data->>'company'), ''), 'My workspace'), 'ws-' || substr(gen_random_uuid()::text, 1, 10)) returning id into org;
  insert into memberships (org_id, user_id, role) values (org, uid, 'org_admin');
  return org;
end $$;

-- ---------- Row level security ----------
alter table organizations enable row level security;
alter table profiles enable row level security;
alter table memberships enable row level security;
alter table invitations enable row level security;
alter table integration_secrets enable row level security; -- intentionally no policies

drop policy if exists org_select on organizations;
create policy org_select on organizations for select using (custo_is_member(id));
drop policy if exists org_update on organizations;
create policy org_update on organizations for update using (custo_is_org_admin(id)) with check (custo_is_org_admin(id));
drop policy if exists profile_select on profiles;
create policy profile_select on profiles for select using (id = auth.uid() or exists (
  select 1 from memberships a join memberships b on a.org_id = b.org_id where a.user_id = auth.uid() and b.user_id = profiles.id));
drop policy if exists profile_update on profiles;
create policy profile_update on profiles for update using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists member_select on memberships;
create policy member_select on memberships for select using (custo_is_member(org_id));
drop policy if exists member_update on memberships;
create policy member_update on memberships for update using (custo_is_org_admin(org_id)) with check (custo_is_org_admin(org_id));
drop policy if exists member_delete on memberships;
create policy member_delete on memberships for delete using (custo_is_org_admin(org_id) and user_id <> auth.uid());
drop policy if exists invite_all on invitations;
create policy invite_all on invitations for all using (custo_is_org_admin(org_id)) with check (custo_is_org_admin(org_id));

do $$ declare t text; begin
  foreach t in array array['stores','store_integrations','brands','product_categories','products','product_attributes','customer_profiles','segments',
    'behavioral_events','search_queries','search_synonyms','rec_campaigns','rec_impressions','rec_clicks','merch_rules','content_campaigns','campaigns',
    'experiments','experiment_variations','analytics_events','orders','cart_events','reports'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_sel', t); execute format('drop policy if exists %I on %I', t || '_ins', t); execute format('drop policy if exists %I on %I', t || '_upd', t); execute format('drop policy if exists %I on %I', t || '_del', t);
    execute format('create policy %I on %I for select using (custo_is_member(org_id))', t || '_sel', t);
    execute format('create policy %I on %I for insert with check (custo_can_write(org_id))', t || '_ins', t);
    execute format('create policy %I on %I for update using (custo_can_write(org_id)) with check (custo_can_write(org_id))', t || '_upd', t);
    execute format('create policy %I on %I for delete using (custo_can_write(org_id))', t || '_del', t);
  end loop;
end $$;

alter table notifications enable row level security;
drop policy if exists notif_sel on notifications;
create policy notif_sel on notifications for select using (custo_is_member(org_id) and (user_id is null or user_id = auth.uid()));
drop policy if exists notif_upd on notifications;
create policy notif_upd on notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
alter table audit_logs enable row level security;
drop policy if exists audit_sel on audit_logs;
create policy audit_sel on audit_logs for select using (custo_is_member(org_id));
drop policy if exists audit_ins on audit_logs;
create policy audit_ins on audit_logs for insert with check (custo_is_member(org_id) and user_id = auth.uid());
-- audit_logs has no update or delete policy: records are append only.

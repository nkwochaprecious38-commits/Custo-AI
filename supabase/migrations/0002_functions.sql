-- Custo AI: workspace provisioning, analytics and demo data functions
set search_path = public, extensions;

-- Flag configuration rows created by the demo dataset so they can be removed in one step
alter table public.customer_segments add column if not exists is_sample boolean not null default false;
alter table public.commerce_campaigns add column if not exists is_sample boolean not null default false;
alter table public.recommendation_campaigns add column if not exists is_sample boolean not null default false;
alter table public.merchandising_rules add column if not exists is_sample boolean not null default false;
alter table public.content_campaigns add column if not exists is_sample boolean not null default false;
alter table public.ab_experiments add column if not exists is_sample boolean not null default false;

-- ---------------------------------------------------------------------------
-- New user: create profile and either join an invited organization or create a workspace
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_inv public.invitations;
  v_org uuid;
  v_company text;
  v_slug text;
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, nullif(trim(v_meta->>'full_name'), ''), new.email)
  on conflict (id) do nothing;

  select * into v_inv from public.invitations i
  where i.status = 'pending'
    and lower(i.email) = lower(new.email)
    and (v_meta->>'invite_token' is null or i.token = v_meta->>'invite_token')
  order by i.created_at desc limit 1;

  if v_inv.id is not null then
    insert into public.organization_members (org_id, user_id, role) values (v_inv.org_id, new.id, v_inv.role)
    on conflict do nothing;
    update public.invitations set status = 'accepted', accepted_at = now() where id = v_inv.id;
    insert into public.audit_logs (org_id, user_id, action, entity_type, entity_id, details)
    values (v_inv.org_id, new.id, 'member.joined', 'invitation', v_inv.id::text, jsonb_build_object('email', new.email, 'role', v_inv.role));
    return new;
  end if;

  v_company := coalesce(nullif(trim(v_meta->>'company_name'), ''), split_part(new.email, '@', 2), 'My workspace');
  v_slug := regexp_replace(lower(v_company), '[^a-z0-9]+', '', 'g') || substr(encode(gen_random_bytes(3), 'hex'), 1, 6);

  insert into public.organizations (name, slug, website)
  values (left(v_company, 120), v_slug, nullif(trim(v_meta->>'website'), ''))
  returning id into v_org;

  insert into public.organization_members (org_id, user_id, role) values (v_org, new.id, 'org_admin');
  insert into public.audit_logs (org_id, user_id, action, entity_type, entity_id, details)
  values (v_org, new.id, 'workspace.created', 'organization', v_org::text, jsonb_build_object('name', v_company));
  insert into public.notifications (org_id, user_id, title, body)
  values (v_org, new.id, 'Welcome to Custo AI', 'Your workspace is ready. Connect a store or explore the demo dataset to get started.');
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Create an additional workspace for the signed in user
create or replace function public.create_workspace(p_name text, p_website text default null)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare v_org uuid;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Workspace name is required'; end if;
  insert into public.organizations (name, slug, website)
  values (left(trim(p_name), 120), regexp_replace(lower(p_name), '[^a-z0-9]+', '', 'g') || substr(encode(gen_random_bytes(3), 'hex'), 1, 6), nullif(trim(p_website), ''))
  returning id into v_org;
  insert into public.organization_members (org_id, user_id, role) values (v_org, auth.uid(), 'org_admin');
  insert into public.audit_logs (org_id, user_id, action, entity_type, entity_id) values (v_org, auth.uid(), 'workspace.created', 'organization', v_org::text);
  return v_org;
end; $$;

-- Accept a pending invitation as an existing user
create or replace function public.accept_invitation(p_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_inv public.invitations; v_email text;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select email into v_email from auth.users where id = auth.uid();
  select * into v_inv from public.invitations where token = p_token and status = 'pending';
  if v_inv.id is null then raise exception 'This invitation is no longer valid'; end if;
  if lower(v_inv.email) <> lower(v_email) then raise exception 'This invitation was sent to a different email address'; end if;
  insert into public.organization_members (org_id, user_id, role) values (v_inv.org_id, auth.uid(), v_inv.role) on conflict do nothing;
  update public.invitations set status = 'accepted', accepted_at = now() where id = v_inv.id;
  return v_inv.org_id;
end; $$;

-- Prevent removing or demoting the last admin of an organization
create or replace function public.protect_last_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'DELETE' and old.role = 'org_admin') or (tg_op = 'UPDATE' and old.role = 'org_admin' and new.role <> 'org_admin') then
    -- The user account itself is being deleted: allow it
    if tg_op = 'DELETE' and not exists (select 1 from auth.users where id = old.user_id) then
      return old;
    end if;
    if (select count(*) from public.organization_members where org_id = old.org_id and role = 'org_admin') <= 1
       and exists (select 1 from public.organizations where id = old.org_id) then
      raise exception 'Each workspace needs at least one Organization Admin';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end; $$;
drop trigger if exists protect_last_admin on public.organization_members;
create trigger protect_last_admin before update or delete on public.organization_members
for each row execute function public.protect_last_admin();

-- Members of the organization, or the server (service role) acting on its behalf
create or replace function public.can_read_org(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_org_member(p_org) or coalesce(auth.jwt()->>'role', '') = 'service_role';
$$;

-- ---------------------------------------------------------------------------
-- Segment rule evaluation (whitelisted fields and operators only)
-- ---------------------------------------------------------------------------
create or replace function public.segment_where(p_rules jsonb, p_match text)
returns text language plpgsql immutable as $$
declare
  r jsonb; v_expr text; v_kind text; v_op text; v_val text; v_parts text[] := '{}'; v_cond text;
begin
  if p_rules is null or jsonb_typeof(p_rules) <> 'array' or jsonb_array_length(p_rules) = 0 then return 'true'; end if;
  for r in select * from jsonb_array_elements(p_rules) loop
    v_op := r->>'operator'; v_val := r->>'value';
    case r->>'field'
      when 'total_orders' then v_expr := 'c.total_orders'; v_kind := 'num';
      when 'total_spent' then v_expr := 'c.total_spent'; v_kind := 'num';
      when 'visit_count' then v_expr := 'c.visit_count'; v_kind := 'num';
      when 'discount_orders' then v_expr := 'c.discount_orders'; v_kind := 'num';
      when 'days_since_last_seen' then v_expr := 'extract(epoch from (now() - c.last_seen_at)) / 86400'; v_kind := 'num';
      when 'days_since_first_seen' then v_expr := 'extract(epoch from (now() - c.first_seen_at)) / 86400'; v_kind := 'num';
      when 'has_abandoned_cart' then v_expr := 'c.has_abandoned_cart'; v_kind := 'bool';
      when 'favorite_category' then v_expr := 'c.favorite_category'; v_kind := 'text';
      when 'country' then v_expr := 'c.country'; v_kind := 'text';
      when 'device' then v_expr := 'c.device'; v_kind := 'text';
      when 'consent_status' then v_expr := 'c.consent_status'; v_kind := 'text';
      else raise exception 'Unsupported segment field: %', r->>'field';
    end case;
    if v_kind = 'num' then
      if v_val !~ '^-?[0-9]+(\.[0-9]+)?$' then raise exception 'Value for % must be a number', r->>'field'; end if;
      v_cond := case v_op when 'gt' then format('%s > %s', v_expr, v_val) when 'gte' then format('%s >= %s', v_expr, v_val)
        when 'lt' then format('%s < %s', v_expr, v_val) when 'lte' then format('%s <= %s', v_expr, v_val)
        when 'eq' then format('%s = %s', v_expr, v_val) when 'neq' then format('%s <> %s', v_expr, v_val) else null end;
    elsif v_kind = 'bool' then
      v_cond := case when v_op in ('eq','neq') and v_val in ('true','false') then format('%s %s %s', v_expr, case v_op when 'eq' then '=' else '<>' end, v_val) else null end;
    else
      v_cond := case v_op when 'eq' then format('lower(coalesce(%s, '''')) = lower(%L)', v_expr, v_val)
        when 'neq' then format('lower(coalesce(%s, '''')) <> lower(%L)', v_expr, v_val)
        when 'contains' then format('coalesce(%s, '''') ilike %L', v_expr, '%' || v_val || '%') else null end;
    end if;
    if v_cond is null then raise exception 'Unsupported operator % for field %', v_op, r->>'field'; end if;
    v_parts := v_parts || ('(' || v_cond || ')');
  end loop;
  return array_to_string(v_parts, case when p_match = 'any' then ' or ' else ' and ' end);
end; $$;

create or replace function public.segment_stats(p_org uuid, p_rules jsonb, p_match text default 'all')
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  if not public.can_read_org(p_org) then raise exception 'Not authorized'; end if;
  execute format('select jsonb_build_object(''customers'', count(*), ''orders'', coalesce(sum(c.total_orders),0), ''revenue'', coalesce(sum(c.total_spent),0), ''avg_spent'', coalesce(round(avg(c.total_spent),2),0), ''total_customers'', (select count(*) from public.customer_profiles where org_id = %L)) from public.customer_profiles c where c.org_id = %L and (%s)', p_org, p_org, public.segment_where(p_rules, p_match))
  into v;
  return v;
end; $$;

create or replace function public.segment_preview(p_org uuid, p_rules jsonb, p_match text default 'all', p_limit int default 10)
returns setof public.customer_profiles language plpgsql stable security definer set search_path = public as $$
begin
  if not public.can_read_org(p_org) then raise exception 'Not authorized'; end if;
  return query execute format('select c.* from public.customer_profiles c where c.org_id = %L and (%s) order by c.total_spent desc limit %s', p_org, public.segment_where(p_rules, p_match), least(greatest(p_limit,1),100));
end; $$;

create or replace function public.segment_performance(p_org uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare s record; v_out jsonb := '[]'::jsonb; v jsonb;
begin
  if not public.can_read_org(p_org) then raise exception 'Not authorized'; end if;
  for s in select id, name, rules, match_type, status from public.customer_segments where org_id = p_org order by created_at loop
    v := public.segment_stats(p_org, s.rules, s.match_type);
    v_out := v_out || jsonb_build_array(jsonb_build_object('id', s.id, 'name', s.name, 'status', s.status, 'match_type', s.match_type) || v);
  end loop;
  return v_out;
end; $$;

-- ---------------------------------------------------------------------------
-- Analytics
-- ---------------------------------------------------------------------------
create or replace function public.analytics_summary(p_org uuid, p_from timestamptz, p_to timestamptz)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_totals jsonb; v_daily jsonb; v_top jsonb; v_search jsonb; v_campaigns jsonb; v_categories jsonb; v_flags jsonb; v_devices jsonb;
begin
  if not public.can_read_org(p_org) then raise exception 'Not authorized'; end if;

  with ev as (select event_type, session_id from public.behavioral_events where org_id = p_org and occurred_at >= p_from and occurred_at < p_to),
  o as (select total, attributed_campaign_id from public.orders where org_id = p_org and placed_at >= p_from and placed_at < p_to)
  select jsonb_build_object(
    'visitors', (select count(distinct session_id) from ev),
    'page_views', (select count(*) from ev where event_type = 'page_view'),
    'product_views', (select count(*) from ev where event_type = 'product_view'),
    'product_clicks', (select count(*) from ev where event_type = 'product_click'),
    'add_to_carts', (select count(*) from ev where event_type = 'add_to_cart'),
    'rec_impressions', (select count(*) from ev where event_type = 'recommendation_impression'),
    'rec_clicks', (select count(*) from ev where event_type = 'recommendation_click'),
    'searches', (select count(*) from ev where event_type = 'search'),
    'orders', (select count(*) from o),
    'revenue', (select coalesce(sum(total),0) from o),
    'attributed_revenue', (select coalesce(sum(total),0) from o where attributed_campaign_id is not null),
    'active_campaigns', (select count(*) from public.recommendation_campaigns where org_id = p_org and status = 'active')
                      + (select count(*) from public.content_campaigns where org_id = p_org and status = 'active')
                      + (select count(*) from public.merchandising_rules where org_id = p_org and status = 'active')
  ) into v_totals;

  with days as (select dd from generate_series(date_trunc('day', p_from), date_trunc('day', p_to - interval '1 second'), interval '1 day') as dd),
  e as (select date_trunc('day', occurred_at) as dd, count(distinct session_id) visitors,
          count(*) filter (where event_type = 'product_view') product_views,
          count(*) filter (where event_type = 'add_to_cart') add_to_carts,
          count(*) filter (where event_type = 'recommendation_click') rec_clicks
        from public.behavioral_events where org_id = p_org and occurred_at >= p_from and occurred_at < p_to group by 1),
  o as (select date_trunc('day', placed_at) as dd, count(*) orders, sum(total) revenue from public.orders where org_id = p_org and placed_at >= p_from and placed_at < p_to group by 1)
  select coalesce(jsonb_agg(jsonb_build_object('date', to_char(days.dd, 'YYYY-MM-DD'), 'visitors', coalesce(e.visitors,0), 'product_views', coalesce(e.product_views,0),
    'add_to_carts', coalesce(e.add_to_carts,0), 'rec_clicks', coalesce(e.rec_clicks,0), 'orders', coalesce(o.orders,0), 'revenue', coalesce(o.revenue,0)) order by days.dd), '[]'::jsonb)
  into v_daily from days left join e on e.dd = days.dd left join o on o.dd = days.dd;

  select coalesce(jsonb_agg(t order by (t->>'views')::int desc), '[]'::jsonb) into v_top from (
    select jsonb_build_object('id', p.id, 'title', p.title, 'price', p.price, 'category', c.name, 'image_url', p.image_url,
      'views', count(*) filter (where e.event_type = 'product_view'),
      'clicks', count(*) filter (where e.event_type in ('product_click','recommendation_click')),
      'add_to_carts', count(*) filter (where e.event_type = 'add_to_cart'),
      'purchases', count(*) filter (where e.event_type = 'purchase')) t
    from public.behavioral_events e join public.products p on p.id = e.product_id left join public.product_categories c on c.id = p.category_id
    where e.org_id = p_org and e.occurred_at >= p_from and e.occurred_at < p_to
    group by p.id, c.name order by count(*) filter (where e.event_type = 'product_view') desc limit 10
  ) s;

  with q as (select lower(trim(query)) query, results_count, clicked_product_id from public.search_queries where org_id = p_org and occurred_at >= p_from and occurred_at < p_to)
  select jsonb_build_object(
    'total', (select count(*) from q),
    'zero_results', (select count(*) from q where results_count = 0),
    'with_click', (select count(*) from q where clicked_product_id is not null),
    'top_queries', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (select query, count(*) searches, round(avg(results_count)) avg_results, count(clicked_product_id) clicks from q group by query order by count(*) desc limit 10) x),
    'zero_queries', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (select query, count(*) searches from q where results_count = 0 group by query order by count(*) desc limit 10) x)
  ) into v_search;

  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_campaigns from (
    select rc.id, rc.name, rc.rec_type, rc.placement, rc.status,
      (select count(*) from public.recommendation_impressions i where i.campaign_id = rc.id and i.occurred_at >= p_from and i.occurred_at < p_to) impressions,
      (select count(*) from public.recommendation_clicks k where k.campaign_id = rc.id and k.occurred_at >= p_from and k.occurred_at < p_to) clicks,
      (select coalesce(sum(total),0) from public.orders o where o.attributed_campaign_id = rc.id and o.placed_at >= p_from and o.placed_at < p_to) attributed_revenue
    from public.recommendation_campaigns rc where rc.org_id = p_org order by rc.created_at
  ) x;

  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_categories from (
    select coalesce(c.name, 'Uncategorized') category, count(*) filter (where e.event_type = 'product_view') views, count(*) filter (where e.event_type = 'add_to_cart') add_to_carts, count(*) filter (where e.event_type = 'purchase') purchases
    from public.behavioral_events e join public.products p on p.id = e.product_id left join public.product_categories c on c.id = p.category_id
    where e.org_id = p_org and e.occurred_at >= p_from and e.occurred_at < p_to group by 1 order by 2 desc
  ) x;

  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_devices from (
    select coalesce(properties->>'device', 'unknown') device, count(distinct session_id) sessions
    from public.behavioral_events where org_id = p_org and event_type = 'page_view' and occurred_at >= p_from and occurred_at < p_to group by 1 order by 2 desc
  ) x;

  select jsonb_build_object(
    'has_sample', exists (select 1 from public.behavioral_events where org_id = p_org and is_sample),
    'has_live', exists (select 1 from public.behavioral_events where org_id = p_org and not is_sample),
    'connected_stores', (select count(*) from public.stores where org_id = p_org and status = 'connected')
  ) into v_flags;

  return jsonb_build_object('totals', v_totals, 'daily', v_daily, 'top_products', v_top, 'search', v_search, 'campaigns', v_campaigns, 'categories', v_categories, 'devices', v_devices, 'flags', v_flags);
end; $$;

create or replace function public.product_performance(p_org uuid, p_from timestamptz, p_to timestamptz)
returns table (product_id uuid, views bigint, clicks bigint, add_to_carts bigint, purchases bigint, prior_views bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.can_read_org(p_org) then raise exception 'Not authorized'; end if;
  return query
  select e.product_id,
    count(*) filter (where e.event_type = 'product_view' and e.occurred_at >= p_from),
    count(*) filter (where e.event_type in ('product_click','recommendation_click') and e.occurred_at >= p_from),
    count(*) filter (where e.event_type = 'add_to_cart' and e.occurred_at >= p_from),
    count(*) filter (where e.event_type = 'purchase' and e.occurred_at >= p_from),
    count(*) filter (where e.event_type = 'product_view' and e.occurred_at < p_from)
  from public.behavioral_events e
  where e.org_id = p_org and e.product_id is not null
    and e.occurred_at >= p_from - (p_to - p_from) and e.occurred_at < p_to
  group by e.product_id;
end; $$;

-- ---------------------------------------------------------------------------
-- Demo dataset (every row flagged is_sample = true)
-- ---------------------------------------------------------------------------
create or replace function public.clear_demo_data(p_org uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_org_role(p_org, array['org_admin','store_manager','ecommerce_manager']) then raise exception 'Only admins and managers can change demo data'; end if;
  delete from public.recommendation_clicks where org_id = p_org and is_sample;
  delete from public.recommendation_impressions where org_id = p_org and is_sample;
  delete from public.behavioral_events where org_id = p_org and is_sample;
  delete from public.cart_events where org_id = p_org and is_sample;
  delete from public.search_queries where org_id = p_org and is_sample;
  delete from public.orders where org_id = p_org and is_sample;
  delete from public.customer_profiles where org_id = p_org and is_sample;
  delete from public.ab_experiments where org_id = p_org and is_sample;
  delete from public.content_campaigns where org_id = p_org and is_sample;
  delete from public.merchandising_rules where org_id = p_org and is_sample;
  delete from public.recommendation_campaigns where org_id = p_org and is_sample;
  delete from public.commerce_campaigns where org_id = p_org and is_sample;
  delete from public.customer_segments where org_id = p_org and is_sample;
  delete from public.products where org_id = p_org and is_sample;
  delete from public.product_categories c where c.org_id = p_org and not exists (select 1 from public.products p where p.category_id = c.id);
  delete from public.brands b where b.org_id = p_org and not exists (select 1 from public.products p where p.brand_id = b.id);
  update public.organizations set demo_seeded_at = coalesce(demo_seeded_at, now()) where id = p_org;
  insert into public.audit_logs (org_id, user_id, action, entity_type) values (p_org, auth.uid(), 'demo_data.cleared', 'organization');
end; $$;

create or replace function public.seed_demo_data(p_org uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  v_products uuid[]; v_prices numeric[]; v_n int; v_customers uuid[]; v_nc int;
  v_rec1 uuid; v_rec2 uuid; v_rec3 uuid; v_rec4 uuid; v_seg_high uuid; v_seg_new uuid; v_exp uuid; v_camp uuid;
  r record; v_cat uuid; v_brand uuid;
begin
  if not public.has_org_role(p_org, array['org_admin','store_manager','ecommerce_manager']) then raise exception 'Only admins and managers can change demo data'; end if;
  if exists (select 1 from public.products where org_id = p_org and is_sample) then return; end if;

  -- Catalog
  for r in select * from (values
    ('CloudStride Everyday Walking Shoe','Footwear','Northline','Lightweight walking shoe with a cushioned foam midsole and breathable knit upper for all day comfort.',89.00,null::numeric,142,'{walking,comfort,cushioned,sneakers}'::text[],'{"color":"Grey","material":"Knit","gender":"Unisex"}'),
    ('Trailwise Waterproof Hiker','Footwear','Northline','Waterproof hiking boot with grippy outsole and padded collar for rugged trails.',139.00,159.00,64,'{hiking,boots,waterproof,outdoor}','{"color":"Brown","material":"Leather","gender":"Men"}'),
    ('Metro Leather Loafer','Footwear','Atelier Nine','Soft leather loafer with a flexible sole, made for long days in the city.',119.00,null,38,'{loafer,leather,office}','{"color":"Black","material":"Leather","gender":"Women"}'),
    ('Pace Runner 2','Footwear','Northline','Responsive running shoe with supportive arch and a springy, cushioned ride.',109.00,129.00,0,'{running,sneakers,cushioned,sport}','{"color":"Blue","material":"Mesh","gender":"Unisex"}'),
    ('Linen Relaxed Shirt','Apparel','Atelier Nine','Breathable linen shirt with a relaxed fit for warm weather.',64.00,null,210,'{linen,summer,shirt}','{"color":"White","material":"Linen","size":"S,M,L,XL"}'),
    ('Merino Crew Sweater','Apparel','Atelier Nine','Fine merino wool crew neck that is warm, soft and easy to layer.',98.00,null,85,'{wool,knitwear,winter}','{"color":"Navy","material":"Merino","size":"S,M,L"}'),
    ('Everyday Stretch Jean','Apparel','Denim Works','Mid rise jean with comfortable stretch and a straight leg.',79.00,95.00,160,'{denim,jeans,stretch}','{"color":"Indigo","material":"Denim","size":"26,28,30,32"}'),
    ('Packable Rain Jacket','Apparel','Northline','Packable waterproof shell with taped seams and adjustable hood.',129.00,null,47,'{jacket,rain,waterproof,outdoor}','{"color":"Olive","material":"Nylon","size":"S,M,L,XL"}'),
    ('Organic Cotton Tee','Apparel','Denim Works','Heavyweight organic cotton tee with a clean, boxy fit.',32.00,null,320,'{tee,cotton,basics}','{"color":"Black","material":"Cotton","size":"XS,S,M,L,XL"}'),
    ('Wrap Midi Dress','Apparel','Atelier Nine','Flowing wrap dress in a soft printed crepe.',118.00,148.00,22,'{dress,occasion}','{"color":"Rose","material":"Crepe","size":"XS,S,M,L"}'),
    ('Hydra Barrier Serum','Skincare','Lumen Lab','Hyaluronic serum that hydrates and supports the skin barrier for dry and sensitive skin.',42.00,null,180,'{serum,hydrating,sensitive}','{"skin_type":"Dry, Sensitive","volume":"30 ml"}'),
    ('Daily Mineral SPF 50','Skincare','Lumen Lab','Lightweight mineral sunscreen with no white cast, suitable for daily wear.',28.00,null,260,'{spf,sunscreen,daily}','{"skin_type":"All","volume":"50 ml"}'),
    ('Gentle Gel Cleanser','Skincare','Lumen Lab','Low foam gel cleanser that removes makeup without stripping.',22.00,null,300,'{cleanser,gentle}','{"skin_type":"All","volume":"150 ml"}'),
    ('Overnight Repair Cream','Skincare','Velour','Rich overnight moisturizer with ceramides and peptides.',58.00,null,90,'{moisturizer,night,repair}','{"skin_type":"Dry","volume":"50 ml"}'),
    ('Vitamin C Glow Drops','Skincare','Velour','Brightening vitamin C drops for a more even looking complexion.',46.00,52.00,12,'{vitamin c,brightening}','{"skin_type":"Normal, Combination","volume":"30 ml"}'),
    ('Satin Lip Color','Beauty','Velour','Creamy satin lipstick with comfortable, buildable color.',24.00,null,410,'{lipstick,makeup}','{"shade":"Rosewood","finish":"Satin"}'),
    ('Skin Tint Foundation','Beauty','Velour','Sheer to medium coverage skin tint with a natural finish.',36.00,null,150,'{foundation,makeup,lightweight}','{"shade_range":"24 shades","finish":"Natural"}'),
    ('Volume Lift Mascara','Beauty','Velour','Lengthening and volumizing mascara that resists smudging.',26.00,null,0,'{mascara,makeup}','{"color":"Black"}'),
    ('Nourishing Hair Oil','Beauty','Lumen Lab','Lightweight hair oil that tames frizz and adds shine.',30.00,null,140,'{haircare,oil}','{"hair_type":"All","volume":"100 ml"}'),
    ('Aura Wireless Earbuds','Electronics','Sonance','Noise cancelling wireless earbuds with 30 hour battery life and a comfortable fit.',149.00,179.00,95,'{earbuds,wireless,noise cancelling,audio}','{"connectivity":"Bluetooth 5.3","battery":"30 h"}'),
    ('Studio Over Ear Headphones','Electronics','Sonance','Over ear headphones with plush cushions for comfortable long listening sessions.',229.00,null,40,'{headphones,audio,comfortable}','{"connectivity":"Bluetooth, 3.5 mm","battery":"40 h"}'),
    ('Pulse Fitness Watch','Electronics','Kinetic','Fitness watch that tracks steps, walking routes, heart rate and sleep.',199.00,null,55,'{watch,fitness,walking,health}','{"display":"AMOLED","water_resistance":"5 ATM"}'),
    ('65W USB C Charger','Electronics','Kinetic','Compact fast charger for laptops, tablets and phones.',39.00,null,230,'{charger,usb c,accessories}','{"ports":"2 USB C","power":"65 W"}'),
    ('Portable Bluetooth Speaker','Electronics','Sonance','Rugged waterproof speaker with rich sound for outdoor use.',89.00,99.00,70,'{speaker,audio,waterproof,outdoor}','{"battery":"18 h","rating":"IP67"}'),
    ('4K Streaming Webcam','Electronics','Kinetic','4K webcam with auto focus and dual microphones for clear video calls.',129.00,null,0,'{webcam,video,office}','{"resolution":"4K","mount":"Clip"}'),
    ('Stoneware Dinner Set','Home','Hearth & Co','Twelve piece reactive glaze stoneware set for everyday dining.',149.00,null,30,'{tableware,kitchen,dining}','{"pieces":"12","dishwasher_safe":"Yes"}'),
    ('Washed Linen Bedding Set','Home','Hearth & Co','Stonewashed linen duvet cover and pillowcases that soften with every wash.',189.00,229.00,44,'{bedding,linen,bedroom}','{"size":"Queen, King","material":"Linen"}'),
    ('Soy Wax Candle Trio','Home','Hearth & Co','Three hand poured soy candles in cedar, fig and amber.',48.00,null,120,'{candle,gift,fragrance}','{"burn_time":"40 h each"}'),
    ('Ergonomic Desk Chair','Home','Form Studio','Adjustable desk chair with lumbar support for comfortable all day sitting.',349.00,399.00,18,'{chair,office,ergonomic,comfortable}','{"adjustable":"Height, arms, lumbar"}'),
    ('Oak Floating Shelf','Home','Form Studio','Solid oak floating shelf with hidden bracket.',69.00,null,75,'{shelf,storage,oak}','{"width":"80 cm"}'),
    ('Ceramic Pour Over Set','Home','Hearth & Co','Ceramic dripper and carafe for slow, flavorful coffee.',54.00,null,60,'{coffee,kitchen,gift}','{"capacity":"600 ml"}'),
    ('Cotton Throw Blanket','Home','Hearth & Co','Soft woven cotton throw for the sofa or bed.',79.00,null,0,'{throw,blanket,living room}','{"size":"130 x 170 cm"}')
  ) as t(title, category, brand, description, price, compare_at, inventory, tags, attrs) loop
    insert into public.product_categories (org_id, name) values (p_org, r.category) on conflict (org_id, name) do update set name = excluded.name returning id into v_cat;
    insert into public.brands (org_id, name) values (p_org, r.brand) on conflict (org_id, name) do update set name = excluded.name returning id into v_brand;
    insert into public.products (org_id, title, description, price, compare_at_price, category_id, brand_id, inventory_quantity, tags, attributes, sku, is_sample, status)
    values (p_org, r.title, r.description, r.price, r.compare_at, v_cat, v_brand, r.inventory, r.tags, r.attrs::jsonb, 'DEMO-' || upper(substr(md5(r.title),1,6)), true, 'active');
  end loop;

  select array_agg(id order by (inventory_quantity = 0), md5(title)), array_agg(price order by (inventory_quantity = 0), md5(title)) into v_products, v_prices from public.products where org_id = p_org and is_sample;
  v_n := array_length(v_products, 1);

  -- Customers
  insert into public.customer_profiles (org_id, external_id, email, consent_status, first_seen_at, last_seen_at, visit_count, total_orders, total_spent, discount_orders, has_abandoned_cart, favorite_category, country, device, is_sample)
  select p_org, 'demo_' || g, 'shopper' || g || '@example.com',
    (array['granted','granted','granted','unknown'])[1 + floor(random()*4)::int],
    now() - (random() * interval '180 days'), now() - (random()^2 * interval '75 days'),
    1 + floor(random()^2 * 30)::int, 0, 0, 0, random() < 0.18,
    (array['Footwear','Apparel','Skincare','Beauty','Electronics','Home'])[1 + floor(random()*6)::int],
    (array['United States','United States','United Kingdom','Canada','Germany','Australia'])[1 + floor(random()*6)::int],
    (array['mobile','mobile','desktop','tablet'])[1 + floor(random()*4)::int], true
  from generate_series(1, 600) g;
  select array_agg(id) into v_customers from public.customer_profiles where org_id = p_org and is_sample;
  v_nc := array_length(v_customers, 1);

  -- Segments
  insert into public.customer_segments (org_id, name, description, match_type, rules, is_sample) values
    (p_org, 'High value customers', 'Customers who have spent more than 300 in total', 'all', '[{"field":"total_spent","operator":"gt","value":"300"}]', true) returning id into v_seg_high;
  insert into public.customer_segments (org_id, name, description, match_type, rules, is_sample) values
    (p_org, 'First time visitors', 'Shoppers with a single recorded visit', 'all', '[{"field":"visit_count","operator":"lte","value":"1"}]', true) returning id into v_seg_new;
  insert into public.customer_segments (org_id, name, description, match_type, rules, is_sample) values
    (p_org, 'Returning customers', 'Shoppers with more than one order', 'all', '[{"field":"total_orders","operator":"gte","value":"2"}]', true),
    (p_org, 'Abandoned cart visitors', 'Shoppers who left items in their cart', 'all', '[{"field":"has_abandoned_cart","operator":"eq","value":"true"}]', true),
    (p_org, 'Discount focused shoppers', 'Shoppers who mostly purchase with a discount', 'all', '[{"field":"discount_orders","operator":"gte","value":"2"}]', true),
    (p_org, 'Beauty product shoppers', 'Shoppers whose favorite category is Beauty or Skincare', 'any', '[{"field":"favorite_category","operator":"eq","value":"Beauty"},{"field":"favorite_category","operator":"eq","value":"Skincare"}]', true),
    (p_org, 'Inactive customers', 'Not seen in the last 45 days', 'all', '[{"field":"days_since_last_seen","operator":"gt","value":"45"}]', true);

  -- Campaigns
  insert into public.commerce_campaigns (org_id, name, objective, status, starts_at, ends_at, notes, is_sample)
  values (p_org, 'Spring wardrobe refresh', 'conversion', 'active', now() - interval '20 days', now() + interval '25 days', 'Demo campaign grouping spring recommendations and banners.', true) returning id into v_camp;
  insert into public.recommendation_campaigns (org_id, campaign_id, name, rec_type, placement, status, is_sample) values (p_org, v_camp, 'Product page: similar items', 'similar_products', 'product_page', 'active', true) returning id into v_rec1;
  insert into public.recommendation_campaigns (org_id, name, rec_type, placement, status, is_sample) values (p_org, 'Cart: frequently bought together', 'frequently_bought_together', 'cart_page', 'active', true) returning id into v_rec2;
  insert into public.recommendation_campaigns (org_id, name, rec_type, placement, segment_id, status, is_sample) values (p_org, 'Home: recommended for you', 'recommended_for_you', 'home_page', v_seg_high, 'active', true) returning id into v_rec3;
  insert into public.recommendation_campaigns (org_id, name, rec_type, placement, status, is_sample) values (p_org, 'Post purchase: replenishment', 'replenishment', 'post_purchase', 'paused', true) returning id into v_rec4;

  insert into public.content_campaigns (org_id, campaign_id, name, content_type, segment_id, placement, content, status, impressions, clicks, is_sample, starts_at, ends_at) values
    (p_org, v_camp, 'Welcome banner for new visitors', 'homepage_banner', v_seg_new, 'home_hero', '{"headline":"New here? Start with our best sellers","body":"Explore the pieces our customers reorder most.","cta_label":"Shop best sellers","cta_url":"/collections/best-sellers","theme":"charcoal"}', 'active', 0, 0, true, now() - interval '20 days', now() + interval '25 days'),
    (p_org, null, 'Loyalty message for high value customers', 'promotional_message', v_seg_high, 'site_header', '{"headline":"Free express shipping on your next order","body":"A thank you for being a loyal customer.","cta_label":"Shop now","cta_url":"/","theme":"teal"}', 'active', 0, 0, true, null, null),
    (p_org, null, 'Skincare routine popup', 'popup', null, 'exit_intent', '{"headline":"Build your routine","body":"Answer three quick questions and we will suggest products for your skin type.","cta_label":"Start the quiz","cta_url":"/quiz","theme":"mauve"}', 'draft', 0, 0, true, null, null);

  insert into public.merchandising_rules (org_id, name, scope, category_id, rule_type, product_ids, priority, status, is_sample)
  select p_org, 'Pin walking shoe in Footwear', 'category', c.id, 'pin', array[(select id from public.products where org_id = p_org and is_sample and title like 'CloudStride%')], 10, 'active', true
  from public.product_categories c where c.org_id = p_org and c.name = 'Footwear';
  insert into public.merchandising_rules (org_id, name, scope, rule_type, priority, status, is_sample) values
    (p_org, 'Hide out of stock products', 'all', 'exclude_out_of_stock', 1, 'active', true),
    (p_org, 'Prioritize best sellers sitewide', 'all', 'prioritize_best_sellers', 50, 'active', true);

  -- Sessions and events over the last 60 days
  create temp table _s on commit drop as
  select 'demo_s_' || d || '_' || g as session_id,
    date_trunc('day', now()) - (d || ' days')::interval + (random() * interval '23 hours') as ts,
    case when random() < 0.7 then v_customers[1 + floor(random() * v_nc)::int] end as customer_id,
    (array['mobile','mobile','mobile','desktop','desktop','tablet'])[1 + floor(random()*6)::int] as device,
    random() as r_cart, random() as r_buy, random() as r_search, random() as r_rec
  from generate_series(0, 59) d, generate_series(1, 160) g
  where g <= 110 + (59 - d) * 0.7 + random() * 30;

  insert into public.behavioral_events (org_id, session_id, customer_id, event_type, properties, occurred_at, is_sample)
  select p_org, session_id, customer_id, 'page_view', jsonb_build_object('device', device, 'path', '/'), ts, true from _s;

  create temp table _v on commit drop as
  select s.*, v_products[1 + floor(v_n * random()^1.6)::int] as product_id, k
  from _s s, generate_series(1, 4) k where k <= 1 + floor(s.r_rec * 4);

  insert into public.behavioral_events (org_id, session_id, customer_id, event_type, product_id, properties, occurred_at, is_sample)
  select p_org, session_id, customer_id, 'product_view', product_id, jsonb_build_object('device', device), ts + (k || ' minutes')::interval, true from _v;
  insert into public.behavioral_events (org_id, session_id, customer_id, event_type, product_id, occurred_at, is_sample)
  select p_org, session_id, customer_id, 'product_click', product_id, ts + (k || ' minutes')::interval, true from _v where random() < 0.45;

  -- Recommendation impressions and clicks
  insert into public.behavioral_events (org_id, session_id, customer_id, event_type, product_id, properties, occurred_at, is_sample)
  select p_org, session_id, customer_id, 'recommendation_impression', product_id, jsonb_build_object('campaign_id', (array[v_rec1, v_rec2, v_rec3])[1 + (k % 3)]), ts + interval '1 minute', true from _v;
  insert into public.recommendation_impressions (org_id, campaign_id, product_id, customer_id, occurred_at, is_sample)
  select p_org, (array[v_rec1, v_rec2, v_rec3])[1 + (k % 3)], product_id, customer_id, ts + interval '1 minute', true from _v;
  create temp table _rc on commit drop as select * from _v where random() < case k % 3 when 0 then 0.09 when 1 then 0.12 else 0.06 end;
  insert into public.behavioral_events (org_id, session_id, customer_id, event_type, product_id, properties, occurred_at, is_sample)
  select p_org, session_id, customer_id, 'recommendation_click', product_id, jsonb_build_object('campaign_id', (array[v_rec1, v_rec2, v_rec3])[1 + (k % 3)]), ts + interval '2 minutes', true from _rc;
  insert into public.recommendation_clicks (org_id, campaign_id, product_id, customer_id, occurred_at, is_sample)
  select p_org, (array[v_rec1, v_rec2, v_rec3])[1 + (k % 3)], product_id, customer_id, ts + interval '2 minutes', true from _rc;

  -- Cart and purchase
  create temp table _c on commit drop as select distinct on (session_id) * from _v where r_cart < 0.14 order by session_id, k;
  insert into public.behavioral_events (org_id, session_id, customer_id, event_type, product_id, occurred_at, is_sample)
  select p_org, session_id, customer_id, 'add_to_cart', product_id, ts + interval '6 minutes', true from _c;
  insert into public.cart_events (org_id, customer_id, product_id, action, occurred_at, is_sample)
  select p_org, customer_id, product_id, case when r_buy < 0.24 then 'add' else 'abandon' end, ts + interval '6 minutes', true from _c;
  insert into public.behavioral_events (org_id, session_id, customer_id, event_type, product_id, occurred_at, is_sample)
  select p_org, session_id, customer_id, 'purchase', product_id, ts + interval '12 minutes', true from _c where r_buy < 0.24;
  insert into public.orders (org_id, customer_id, external_id, total, items, attributed_campaign_id, discount_used, placed_at, is_sample)
  select p_org, c.customer_id, 'DEMO-' || substr(md5(c.session_id), 1, 8),
    p.price * (1 + floor(random()*2)), jsonb_build_array(jsonb_build_object('product_id', p.id, 'title', p.title, 'price', p.price)),
    case when random() < 0.3 then (array[v_rec1, v_rec2, v_rec3, v_rec2])[1 + floor(random()*4)::int] end, random() < 0.25, c.ts + interval '12 minutes', true
  from _c c join public.products p on p.id = c.product_id where c.r_buy < 0.24;

  -- Searches
  insert into public.search_queries (org_id, customer_id, query, results_count, clicked_product_id, occurred_at, is_sample)
  select p_org, s.customer_id, q.query, q.results,
    case when q.results > 0 and random() < 0.42 then v_products[1 + floor(random() * v_n)::int] end, s.ts + interval '30 seconds', true
  from _s s cross join lateral (
    select query, results from (values ('walking shoes',4,9),('comfortable shoes for walking',5,5),('linen shirt',2,6),('spf',2,8),('serum for dry skin',3,6),('wireless earbuds',2,7),('rain jacket',2,4),('gift for her',6,5),('vegan leather tote',0,3),('usb c hub 8 port',0,2),('desk chair',1,3),('candles',1,4),('retinol night cream',0,2),('kids sneakers',0,2),('jeans',2,7),('headphones',3,5))
    as t(query, results, w) order by -ln(random()) / w + s.r_search * 0 limit 1) q
  where s.r_search < 0.32;
  insert into public.behavioral_events (org_id, session_id, customer_id, event_type, occurred_at, is_sample)
  select p_org, session_id, customer_id, 'search', ts + interval '30 seconds', true from _s where r_search < 0.32;

  -- Roll up customer aggregates from demo orders
  update public.customer_profiles c set
    total_orders = x.n, total_spent = x.revenue, discount_orders = x.disc
  from (select customer_id, count(*) n, sum(total) revenue, count(*) filter (where discount_used) disc from public.orders where org_id = p_org and is_sample and customer_id is not null group by customer_id) x
  where c.id = x.customer_id;
  update public.content_campaigns set impressions = 2400 + floor(random()*800), clicks = 90 + floor(random()*60) where org_id = p_org and is_sample and status = 'active';

  -- Experiment with recorded demo counts
  insert into public.ab_experiments (org_id, name, hypothesis, experiment_type, primary_metric, status, started_at, is_sample)
  values (p_org, 'Product page carousel vs grid', 'Showing similar items as a grid will increase recommendation clicks compared to the carousel.', 'recommendation_layout', 'click_through_rate', 'running', now() - interval '14 days', true)
  returning id into v_exp;
  insert into public.experiment_variations (org_id, experiment_id, name, description, is_control, traffic_weight, visitors, clicks, add_to_carts, conversions, revenue) values
    (p_org, v_exp, 'Control: carousel', 'Current horizontal carousel with 8 products', true, 50, 4212, 341, 298, 121, 10982.00),
    (p_org, v_exp, 'Variation: grid', 'Two row grid with 8 products', false, 50, 4187, 402, 311, 126, 11440.00);

  update public.organizations set demo_seeded_at = now() where id = p_org;
  insert into public.audit_logs (org_id, user_id, action, entity_type) values (p_org, auth.uid(), 'demo_data.loaded', 'organization');
end; $$;

grant execute on all functions in schema public to authenticated, service_role;
revoke execute on function public.handle_new_user() from authenticated, anon;

-- Remove a workspace automatically when its last member is removed or their account is deleted
create or replace function public.cleanup_empty_org()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.organization_members where org_id = old.org_id) then
    delete from public.organizations where id = old.org_id;
  end if;
  return null;
end; $$;

drop trigger if exists cleanup_empty_org on public.organization_members;
create trigger cleanup_empty_org after delete on public.organization_members
for each row execute function public.cleanup_empty_org();

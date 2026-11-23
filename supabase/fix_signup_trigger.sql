-- Restores the Custo AI signup function and trigger.
-- Use this if another script replaced handle_new_user(): new users must get a workspace AND be added to it as admin.
-- Safe to run more than once.

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

-- Remove any workspaces left behind with no members (created by the replaced function)
delete from public.organizations o where not exists (select 1 from public.organization_members m where m.org_id = o.id);

-- Give every existing user who has no workspace one (for accounts created while the function was broken)
do $$
declare u record; v_org uuid;
begin
  for u in select au.id, au.email, au.raw_user_meta_data as meta from auth.users au
           where not exists (select 1 from public.organization_members m where m.user_id = au.id)
  loop
    insert into public.profiles (id, full_name, email) values (u.id, nullif(trim(u.meta->>'full_name'), ''), u.email) on conflict (id) do nothing;
    insert into public.organizations (name, slug, website)
    values (left(coalesce(nullif(trim(u.meta->>'company_name'), ''), split_part(u.email, '@', 2), 'My workspace'), 120),
            'ws' || substr(encode(gen_random_bytes(5), 'hex'), 1, 10), nullif(trim(u.meta->>'website'), ''))
    returning id into v_org;
    insert into public.organization_members (org_id, user_id, role) values (v_org, u.id, 'org_admin');
  end loop;
end $$;

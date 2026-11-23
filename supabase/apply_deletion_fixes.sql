-- Custo AI: apply all account deletion fixes in one go. Safe to run more than once.
-- 1) Allows deleting an account that is the only admin of a workspace
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

-- 2) Removes a workspace automatically when its last member is gone, and sweeps existing empty workspaces
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

-- One time sweep: remove workspaces that are already empty
delete from public.organizations o where not exists (select 1 from public.organization_members m where m.org_id = o.id);

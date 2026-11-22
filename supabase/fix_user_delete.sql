-- Lets an account be deleted from Supabase Authentication even when it is the only admin of a workspace.
-- Removing a member by hand (or demoting them) still requires at least one Organization Admin to remain.
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

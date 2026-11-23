-- Deletes a workspace (and its data) automatically when its last member is removed or their account is deleted.
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

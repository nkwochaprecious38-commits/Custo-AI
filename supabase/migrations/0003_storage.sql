-- Product image storage (Supabase Storage). Images are public to read; only workspace editors can upload into their organization folder.
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true) on conflict (id) do nothing;

create policy "Editors upload product images" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.can_edit((storage.foldername(name))[1]::uuid));
create policy "Editors update product images" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.can_edit((storage.foldername(name))[1]::uuid));
create policy "Editors delete product images" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.can_edit((storage.foldername(name))[1]::uuid));
create policy "Public read product images" on storage.objects for select using (bucket_id = 'product-images');

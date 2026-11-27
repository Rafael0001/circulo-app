alter table public.pulsos drop constraint if exists pulsos_content_check;
alter table public.pulsos add constraint pulsos_content_check check (char_length(content) <= 280);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pulso-photos',
  'pulso-photos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.pulso_photos (
  id uuid primary key default gen_random_uuid(),
  pulso_id uuid not null references public.pulsos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  url text not null,
  storage_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists pulso_photos_pulso_idx
  on public.pulso_photos (pulso_id, sort_order);

alter table public.pulso_photos enable row level security;

drop policy if exists pulso_photos_select on public.pulso_photos;
create policy pulso_photos_select
  on public.pulso_photos
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.pulsos p
      where p.id = pulso_photos.pulso_id
        and public.can_view_pulso(p.user_id, p.circle_visibility)
    )
  );

drop policy if exists pulso_photos_insert on public.pulso_photos;
create policy pulso_photos_insert
  on public.pulso_photos
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.pulsos p
      where p.id = pulso_photos.pulso_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists pulso_photos_update on public.pulso_photos;
create policy pulso_photos_update
  on public.pulso_photos
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists pulso_photos_delete on public.pulso_photos;
create policy pulso_photos_delete
  on public.pulso_photos
  for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists pulso_photos_storage_select on storage.objects;
create policy pulso_photos_storage_select
  on storage.objects
  for select
  to public
  using (bucket_id = 'pulso-photos');

drop policy if exists pulso_photos_storage_insert on storage.objects;
create policy pulso_photos_storage_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'pulso-photos'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

drop policy if exists pulso_photos_storage_update on storage.objects;
create policy pulso_photos_storage_update
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'pulso-photos'
    and (storage.foldername(name))[1] = (auth.uid())::text
  )
  with check (
    bucket_id = 'pulso-photos'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

drop policy if exists pulso_photos_storage_delete on storage.objects;
create policy pulso_photos_storage_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'pulso-photos'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

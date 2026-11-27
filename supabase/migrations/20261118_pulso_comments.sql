create table if not exists public.pulso_comments (
  id uuid primary key default gen_random_uuid(),
  pulso_id uuid not null references public.pulsos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  constraint pulso_comments_content_check check (
    char_length(content) >= 1 and char_length(content) <= 280
  )
);

create index if not exists pulso_comments_pulso_idx
  on public.pulso_comments (pulso_id, created_at);

alter table public.pulso_comments enable row level security;

drop policy if exists pulso_comments_select on public.pulso_comments;
create policy pulso_comments_select
  on public.pulso_comments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.pulsos p
      where p.id = pulso_comments.pulso_id
        and public.can_view_pulso(p.user_id, p.circle_visibility)
    )
    and (
      user_id = auth.uid()
      or not public.is_blocked(user_id, auth.uid())
    )
  );

drop policy if exists pulso_comments_insert on public.pulso_comments;
create policy pulso_comments_insert
  on public.pulso_comments
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.pulsos p
      where p.id = pulso_comments.pulso_id
        and public.can_view_pulso(p.user_id, p.circle_visibility)
    )
  );

drop policy if exists pulso_comments_update on public.pulso_comments;
create policy pulso_comments_update
  on public.pulso_comments
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and char_length(content) >= 1
    and char_length(content) <= 280
  );

drop policy if exists pulso_comments_delete on public.pulso_comments;
create policy pulso_comments_delete
  on public.pulso_comments
  for delete
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.pulsos p
      where p.id = pulso_comments.pulso_id
        and p.user_id = auth.uid()
    )
  );

do $$
begin
  alter publication supabase_realtime add table public.pulso_comments;
exception
  when duplicate_object then null;
end $$;

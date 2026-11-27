create table if not exists public.pulso_reactions (
  id uuid primary key default gen_random_uuid(),
  pulso_id uuid not null references public.pulsos (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  constraint pulso_reactions_emoji_check check (
    emoji in ('❤️', '😂', '😮', '😢', '👏', '🔥', '👍', '🎉', '🥰', '🤔')
  ),
  constraint pulso_reactions_unique_user unique (pulso_id, user_id)
);

create index if not exists pulso_reactions_pulso_idx
  on public.pulso_reactions (pulso_id, created_at);

alter table public.pulso_reactions enable row level security;

drop policy if exists pulso_reactions_select on public.pulso_reactions;
create policy pulso_reactions_select
  on public.pulso_reactions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.pulsos p
      where p.id = pulso_reactions.pulso_id
        and public.can_view_pulso(p.user_id, p.circle_visibility, p.include_inner)
    )
    and (
      user_id = (select auth.uid())
      or not public.is_blocked(user_id, (select auth.uid()))
    )
  );

drop policy if exists pulso_reactions_insert on public.pulso_reactions;
create policy pulso_reactions_insert
  on public.pulso_reactions
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.pulsos p
      where p.id = pulso_reactions.pulso_id
        and public.can_view_pulso(p.user_id, p.circle_visibility, p.include_inner)
    )
  );

drop policy if exists pulso_reactions_update on public.pulso_reactions;
create policy pulso_reactions_update
  on public.pulso_reactions
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists pulso_reactions_delete on public.pulso_reactions;
create policy pulso_reactions_delete
  on public.pulso_reactions
  for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1
      from public.pulsos p
      where p.id = pulso_reactions.pulso_id
        and p.user_id = (select auth.uid())
    )
  );

grant select, insert, update, delete on public.pulso_reactions to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.pulso_reactions;
exception
  when duplicate_object then null;
end $$;

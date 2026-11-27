create table if not exists public.user_circles (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  label text not null,
  color text,
  sort_order integer not null default 0,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists user_circles_user_sort_idx
  on public.user_circles (user_id, sort_order);

alter table public.user_circles enable row level security;

drop policy if exists user_circles_select on public.user_circles;
create policy user_circles_select
  on public.user_circles
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists user_circles_insert on public.user_circles;
create policy user_circles_insert
  on public.user_circles
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists user_circles_update on public.user_circles;
create policy user_circles_update
  on public.user_circles
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists user_circles_delete on public.user_circles;
create policy user_circles_delete
  on public.user_circles
  for delete
  to authenticated
  using ((select auth.uid()) = user_id and is_default = false);

grant select, insert, update, delete on public.user_circles to authenticated;

create or replace function public.circle_rank(author_id uuid, circle_id text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select uc.sort_order
      from public.user_circles uc
      where uc.user_id = author_id
        and uc.id = coalesce(circle_id, 'conhecidos')
      limit 1
    ),
    public.circle_rank(coalesce(circle_id, 'conhecidos'))
  );
$$;

create or replace function public.pulso_reaches_circle(
  author_id uuid,
  visibility text,
  placement text,
  include_inner boolean
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when coalesce(include_inner, true) then
      public.circle_rank(author_id, coalesce(placement, 'conhecidos'))
        <= public.circle_rank(author_id, coalesce(visibility, 'conhecidos'))
    else
      coalesce(placement, '') = coalesce(visibility, '')
  end;
$$;

create or replace function public.can_view_pulso(author_id uuid, visibility text, include_inner boolean)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    author_id = auth.uid()
    or (
      not public.is_blocked(author_id, auth.uid())
      and exists (
        select 1
        from public.friendships f
        where f.user_id = author_id
          and f.friend_id = auth.uid()
          and public.pulso_reaches_circle(
            author_id,
            visibility,
            f.circle,
            coalesce(include_inner, true)
          )
      )
    );
$$;

revoke all on function public.circle_rank(uuid, text) from public;
revoke all on function public.pulso_reaches_circle(uuid, text, text, boolean) from public;
grant execute on function public.circle_rank(uuid, text) to authenticated;
grant execute on function public.pulso_reaches_circle(uuid, text, text, boolean) to authenticated;

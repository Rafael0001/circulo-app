create or replace function public.circle_rank(circle_id text)
returns integer
language sql
immutable
set search_path = public
as $$
  select case
    when circle_id = 'intimos' then 0
    when circle_id = 'amigos' then 1
    else 2
  end;
$$;

-- Outer rings include inner ones: conhecidos → amigos + íntimos; amigos → íntimos.
create or replace function public.pulso_reaches_circle(visibility text, placement text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select public.circle_rank(coalesce(placement, 'conhecidos'))
      <= public.circle_rank(coalesce(visibility, 'conhecidos'));
$$;

create or replace function public.can_view_pulso(author_id uuid, visibility text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    author_id = auth.uid()
    or exists (
      select 1
      from public.friendships f
      where f.user_id = author_id
        and f.friend_id = auth.uid()
        and public.pulso_reaches_circle(visibility, f.circle)
    );
$$;

revoke all on function public.circle_rank(text) from public;
revoke all on function public.can_view_pulso(uuid, text) from public;
grant execute on function public.circle_rank(text) to authenticated;
grant execute on function public.can_view_pulso(uuid, text) to authenticated;

drop policy if exists friendships_select on public.friendships;
create policy friendships_select
  on public.friendships
  for select
  to authenticated
  using (user_id = auth.uid() or friend_id = auth.uid());

drop policy if exists pulsos_select on public.pulsos;
create policy pulsos_select
  on public.pulsos
  for select
  to authenticated
  using (public.can_view_pulso(user_id, circle_visibility));

alter table public.pulsos alter column circle_visibility set default 'conhecidos';

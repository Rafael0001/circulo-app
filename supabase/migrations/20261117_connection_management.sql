alter table public.friendships
  add column if not exists muted boolean not null default false;

alter table public.connection_blocks
  add column if not exists blocked_name text,
  add column if not exists blocked_avatar text;

create table if not exists public.connection_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.connection_blocks enable row level security;

drop policy if exists connection_blocks_select on public.connection_blocks;
create policy connection_blocks_select
  on public.connection_blocks
  for select
  to authenticated
  using (blocker_id = auth.uid());

drop policy if exists connection_blocks_insert on public.connection_blocks;
create policy connection_blocks_insert
  on public.connection_blocks
  for insert
  to authenticated
  with check (blocker_id = auth.uid() and blocker_id <> blocked_id);

drop policy if exists connection_blocks_delete on public.connection_blocks;
create policy connection_blocks_delete
  on public.connection_blocks
  for delete
  to authenticated
  using (blocker_id = auth.uid());

drop policy if exists profiles_select_blocked on public.profiles;
create policy profiles_select_blocked
  on public.profiles
  for select
  to authenticated
  using (
    exists (
      select 1 from public.connection_blocks b
      where b.blocker_id = auth.uid() and b.blocked_id = profiles.id
    )
  );

drop policy if exists friendships_insert on public.friendships;
create policy friendships_insert
  on public.friendships
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and user_id <> friend_id
    and not public.is_blocked(user_id, friend_id)
  );

create or replace function public.is_blocked(user_a uuid, user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.connection_blocks
    where (blocker_id = user_a and blocked_id = user_b)
       or (blocker_id = user_b and blocked_id = user_a)
  );
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
    or (
      not public.is_blocked(author_id, auth.uid())
      and exists (
        select 1
        from public.friendships f
        where f.user_id = author_id
          and f.friend_id = auth.uid()
          and public.pulso_reaches_circle(visibility, f.circle)
      )
    );
$$;

create or replace function public.remove_from_circle(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'not_authenticated';
  end if;
  if target is null or target = me then
    raise exception 'invalid_target';
  end if;

  delete from public.friendships
  where (user_id = me and friend_id = target)
     or (user_id = target and friend_id = me);
end;
$$;

create or replace function public.block_person(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'not_authenticated';
  end if;
  if target is null or target = me then
    raise exception 'invalid_target';
  end if;

  insert into public.connection_blocks (blocker_id, blocked_id)
  values (me, target)
  on conflict (blocker_id, blocked_id) do nothing;

  delete from public.friendships
  where (user_id = me and friend_id = target)
     or (user_id = target and friend_id = me);
end;
$$;

create or replace function public.unblock_person(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'not_authenticated';
  end if;

  delete from public.connection_blocks
  where blocker_id = me and blocked_id = target;
end;
$$;

revoke all on function public.is_blocked(uuid, uuid) from public;
revoke all on function public.remove_from_circle(uuid) from public;
revoke all on function public.block_person(uuid) from public;
revoke all on function public.unblock_person(uuid) from public;
grant execute on function public.is_blocked(uuid, uuid) to authenticated;
grant execute on function public.remove_from_circle(uuid) to authenticated;
grant execute on function public.block_person(uuid) to authenticated;
grant execute on function public.unblock_person(uuid) to authenticated;

create or replace function public.accept_invite(invite_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  session_row public.qr_sessions%rowtype;
  friend public.profiles%rowtype;
  already boolean := false;
begin
  if me is null then
    raise exception 'not_authenticated';
  end if;

  select * into session_row from public.qr_sessions where token = trim(invite_token);
  if not found then
    raise exception 'invalid_invite';
  end if;
  if session_row.expires_at < now() then
    raise exception 'expired_invite';
  end if;
  if session_row.user_id = me then
    raise exception 'self_invite';
  end if;

  select * into friend from public.profiles where id = session_row.user_id;
  if not found then
    raise exception 'invalid_invite';
  end if;

  if public.is_blocked(me, friend.id) then
    raise exception 'blocked_relationship';
  end if;

  select exists (
    select 1 from public.friendships where user_id = me and friend_id = friend.id
  ) into already;

  insert into public.friendships (user_id, friend_id, circle)
  values (me, friend.id, 'conhecidos')
  on conflict (user_id, friend_id) do nothing;

  insert into public.friendships (user_id, friend_id, circle)
  values (friend.id, me, 'conhecidos')
  on conflict (user_id, friend_id) do nothing;

  if not exists (select 1 from public.friendships where user_id = me and friend_id = friend.id)
     or not exists (select 1 from public.friendships where user_id = friend.id and friend_id = me) then
    raise exception 'incomplete_relationship';
  end if;

  return jsonb_build_object(
    'status', case when already then 'already' else 'created' end,
    'id', friend.id,
    'name', coalesce(friend.name, 'Amigo'),
    'avatar_url', friend.avatar_url
  );
end;
$$;

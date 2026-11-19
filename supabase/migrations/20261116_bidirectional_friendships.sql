-- Mirror any one-way friendships and keep accept_invite atomic.
insert into public.friendships (user_id, friend_id, circle)
select f.friend_id, f.user_id, coalesce(f.circle, 'conhecidos')
from public.friendships f
where f.user_id <> f.friend_id
  and not exists (
    select 1
    from public.friendships r
    where r.user_id = f.friend_id
      and r.friend_id = f.user_id
  )
on conflict (user_id, friend_id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'friendships'
  ) then
    execute 'alter publication supabase_realtime add table public.friendships';
  end if;
end;
$$;

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

create or replace function public.list_mutual_friends(target uuid)
returns table (
  id uuid,
  name text,
  avatar_url text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null or target is null or target = me then
    return;
  end if;

  if public.is_blocked(me, target) then
    return;
  end if;

  if not exists (
    select 1
    from public.friendships
    where user_id = me and friend_id = target
  ) then
    return;
  end if;

  return query
  select
    p.id,
    coalesce(p.name, 'Amigo') as name,
    p.avatar_url
  from public.friendships mine
  inner join public.friendships theirs
    on theirs.user_id = target
   and theirs.friend_id = mine.friend_id
  inner join public.profiles p
    on p.id = mine.friend_id
  where mine.user_id = me
    and mine.friend_id <> target
    and not public.is_blocked(me, mine.friend_id)
    and not public.is_blocked(target, mine.friend_id)
  order by coalesce(p.name, 'Amigo');
end;
$$;

revoke all on function public.list_mutual_friends(uuid) from public;
grant execute on function public.list_mutual_friends(uuid) to authenticated;

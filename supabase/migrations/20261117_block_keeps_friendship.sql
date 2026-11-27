create or replace function public.block_person(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  snapshot public.profiles%rowtype;
begin
  if me is null then
    raise exception 'not_authenticated';
  end if;
  if target is null or target = me then
    raise exception 'invalid_target';
  end if;

  select * into snapshot from public.profiles where id = target;

  insert into public.connection_blocks (blocker_id, blocked_id, blocked_name, blocked_avatar)
  values (me, target, snapshot.name, snapshot.avatar_url)
  on conflict (blocker_id, blocked_id) do update
    set blocked_name = excluded.blocked_name,
        blocked_avatar = excluded.blocked_avatar;
end;
$$;

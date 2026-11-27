alter table public.friendships
  add column if not exists map_order integer not null default 0;

comment on column public.friendships.map_order is
  'Ordem visual do amigo no mapa de conexões do dono, apenas dentro do mesmo círculo.';

with ranked as (
  select
    user_id,
    friend_id,
    row_number() over (partition by user_id, circle order by friend_id) - 1 as rn
  from public.friendships
)
update public.friendships f
set map_order = ranked.rn
from ranked
where f.user_id = ranked.user_id
  and f.friend_id = ranked.friend_id;

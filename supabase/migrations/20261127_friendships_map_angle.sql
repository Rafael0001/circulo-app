alter table public.friendships
  add column if not exists map_angle double precision;

comment on column public.friendships.map_angle is
  'Angulo visual do amigo no anel do mapa de conexoes do dono, em graus.';

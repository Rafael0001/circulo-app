create table if not exists public.pulso_hides (
  user_id uuid not null references public.profiles (id) on delete cascade,
  pulso_id uuid not null references public.pulsos (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, pulso_id)
);

comment on table public.pulso_hides is
  'Pulsos ocultos da timeline por usuario. Nao altera o pulso original nem a visibilidade para outros.';

create index if not exists pulso_hides_user_idx
  on public.pulso_hides (user_id, created_at desc);

alter table public.pulso_hides enable row level security;

drop policy if exists pulso_hides_select on public.pulso_hides;
create policy pulso_hides_select
  on public.pulso_hides
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists pulso_hides_insert on public.pulso_hides;
create policy pulso_hides_insert
  on public.pulso_hides
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.pulsos p
      where p.id = pulso_hides.pulso_id
        and public.can_view_pulso(p.user_id, p.circle_visibility, p.include_inner)
    )
  );

drop policy if exists pulso_hides_delete on public.pulso_hides;
create policy pulso_hides_delete
  on public.pulso_hides
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, delete on public.pulso_hides to authenticated;

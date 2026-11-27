create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  pulso_filter text not null default 'all'
    check (pulso_filter in ('all', 'urgent', 'none')),
  all_circles boolean not null default true,
  circle_ids text[] not null default '{}'::text[],
  updated_at timestamptz not null default now()
);

comment on table public.notification_preferences is
  'Preferencias de notificacao de pulsos por usuario. Nao altera visibilidade dos pulsos.';

alter table public.notification_preferences enable row level security;

drop policy if exists notification_preferences_select on public.notification_preferences;
create policy notification_preferences_select
  on public.notification_preferences
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists notification_preferences_insert on public.notification_preferences;
create policy notification_preferences_insert
  on public.notification_preferences
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists notification_preferences_update on public.notification_preferences;
create policy notification_preferences_update
  on public.notification_preferences
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists notification_preferences_delete on public.notification_preferences;
create policy notification_preferences_delete
  on public.notification_preferences
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.notification_preferences to authenticated;

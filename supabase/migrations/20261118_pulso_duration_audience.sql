alter table public.pulsos
  add column if not exists duration_hours integer,
  add column if not exists include_inner boolean not null default true;

alter table public.pulsos drop constraint if exists pulsos_duration_hours_check;
alter table public.pulsos add constraint pulsos_duration_hours_check
  check (duration_hours is null or duration_hours in (12, 24, 48));

create or replace function public.pulso_reaches_circle(visibility text, placement text, include_inner boolean)
returns boolean
language sql
immutable
set search_path = public
as $$
  select case
    when coalesce(include_inner, true) then
      public.circle_rank(coalesce(placement, 'conhecidos'))
        <= public.circle_rank(coalesce(visibility, 'conhecidos'))
    else
      coalesce(placement, '') = coalesce(visibility, '')
  end;
$$;

create or replace function public.pulso_reaches_circle(visibility text, placement text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select public.pulso_reaches_circle(visibility, placement, true);
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
          and public.pulso_reaches_circle(visibility, f.circle, coalesce(include_inner, true))
      )
    );
$$;

create or replace function public.can_view_pulso(author_id uuid, visibility text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_view_pulso(author_id, visibility, true);
$$;

revoke all on function public.pulso_reaches_circle(text, text, boolean) from public;
revoke all on function public.can_view_pulso(uuid, text, boolean) from public;
grant execute on function public.pulso_reaches_circle(text, text, boolean) to authenticated;
grant execute on function public.can_view_pulso(uuid, text, boolean) to authenticated;

drop policy if exists pulsos_select on public.pulsos;
create policy pulsos_select
  on public.pulsos
  for select
  to authenticated
  using (public.can_view_pulso(user_id, circle_visibility, include_inner));

drop policy if exists pulso_photos_select on public.pulso_photos;
create policy pulso_photos_select
  on public.pulso_photos
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.pulsos p
      where p.id = pulso_photos.pulso_id
        and public.can_view_pulso(p.user_id, p.circle_visibility, p.include_inner)
    )
  );

drop policy if exists pulso_comments_select on public.pulso_comments;
create policy pulso_comments_select
  on public.pulso_comments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.pulsos p
      where p.id = pulso_comments.pulso_id
        and public.can_view_pulso(p.user_id, p.circle_visibility, p.include_inner)
    )
    and (
      user_id = auth.uid()
      or not public.is_blocked(user_id, auth.uid())
    )
  );

drop policy if exists pulso_comments_insert on public.pulso_comments;
create policy pulso_comments_insert
  on public.pulso_comments
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.pulsos p
      where p.id = pulso_comments.pulso_id
        and public.can_view_pulso(p.user_id, p.circle_visibility, p.include_inner)
    )
  );

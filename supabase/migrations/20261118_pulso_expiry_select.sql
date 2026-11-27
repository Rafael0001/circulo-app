drop policy if exists pulsos_select on public.pulsos;
create policy pulsos_select
  on public.pulsos
  for select
  to authenticated
  using (
    public.can_view_pulso(user_id, circle_visibility, include_inner)
    and (expires_at is null or expires_at > now())
  );

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
        and (p.expires_at is null or p.expires_at > now())
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
        and (p.expires_at is null or p.expires_at > now())
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
        and (p.expires_at is null or p.expires_at > now())
    )
  );

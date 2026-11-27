create or replace function public.pulso_reaches_circle(visibility text, placement text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select public.circle_rank(coalesce(placement, 'conhecidos'))
      <= public.circle_rank(coalesce(visibility, 'conhecidos'));
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
    or exists (
      select 1
      from public.friendships f
      where f.user_id = author_id
        and f.friend_id = auth.uid()
        and public.pulso_reaches_circle(visibility, f.circle)
    );
$$;

revoke all on function public.pulso_reaches_circle(text, text) from public;
grant execute on function public.pulso_reaches_circle(text, text) to authenticated;

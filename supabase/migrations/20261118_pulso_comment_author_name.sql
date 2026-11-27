alter table public.pulso_comments
  add column if not exists author_name text;

create or replace function public.set_pulso_comment_author_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select coalesce(nullif(trim(p.name), ''), 'Amigo')
    into new.author_name
  from public.profiles p
  where p.id = new.user_id;

  if new.author_name is null or btrim(new.author_name) = '' then
    new.author_name := 'Amigo';
  end if;

  return new;
end;
$$;

drop trigger if exists pulso_comments_set_author_name on public.pulso_comments;
create trigger pulso_comments_set_author_name
  before insert or update of user_id
  on public.pulso_comments
  for each row
  execute function public.set_pulso_comment_author_name();

update public.pulso_comments c
set author_name = coalesce(nullif(trim(p.name), ''), 'Amigo')
from public.profiles p
where p.id = c.user_id
  and (c.author_name is null or btrim(c.author_name) = '');

-- Run once in the SQL editor of YOUR Supabase project. No subscription is required by the app.
create table public.projects (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(name) <= 10000),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 5000000),
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);
create index projects_owner_updated on public.projects(owner_id, updated_at desc);
alter table public.projects enable row level security;
create policy "Read own projects" on public.projects for select to authenticated using (owner_id = (select auth.uid()));
create policy "Insert own projects" on public.projects for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "Update own projects" on public.projects for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Delete own projects" on public.projects for delete to authenticated using (owner_id = (select auth.uid()));
grant select, insert, update, delete on public.projects to authenticated;
revoke all on public.projects from anon;

create function public.touch_project() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.owner_id <> old.owner_id then raise exception 'Owner cannot change'; end if;
  if new.revision <> old.revision + 1 then raise exception 'Revision conflict'; end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger project_update before update on public.projects for each row execute function public.touch_project();

insert into storage.buckets (id, name, public, file_size_limit)
values ('plans', 'plans', false, 26214400);
create policy "Read own plans" on storage.objects for select to authenticated
using (bucket_id = 'plans' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Upload own plans" on storage.objects for insert to authenticated
with check (bucket_id = 'plans' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Update own plans" on storage.objects for update to authenticated
using (bucket_id = 'plans' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'plans' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Delete own plans" on storage.objects for delete to authenticated
using (bucket_id = 'plans' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Only used if the owner later enables the optional GPT feature.
create table public.ai_daily_usage (
  owner_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  attempts integer not null check (attempts between 0 and 20),
  primary key (owner_id, day)
);
alter table public.ai_daily_usage enable row level security;
revoke all on public.ai_daily_usage from anon, authenticated;
create function public.consume_plan_analysis() returns boolean
language plpgsql security definer set search_path = '' as $$
declare used integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.ai_daily_usage(owner_id, day, attempts)
  values (auth.uid(), (now() at time zone 'utc')::date, 1)
  on conflict(owner_id, day) do update set attempts = public.ai_daily_usage.attempts + 1
  where public.ai_daily_usage.attempts < 20
  returning attempts into used;
  return used is not null;
end;
$$;
revoke all on function public.consume_plan_analysis() from public, anon;
grant execute on function public.consume_plan_analysis() to authenticated;

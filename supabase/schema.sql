create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  published boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.arguments (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id) on delete cascade,
  side text not null check (side in ('pro', 'con')),
  author text not null default 'Анонимен',
  text text not null check (char_length(text) > 0),
  created_at timestamptz not null default now()
);

create index if not exists arguments_topic_id_idx on public.arguments(topic_id);

create table if not exists public.argument_comments (
  id uuid primary key default gen_random_uuid(),
  argument_id uuid not null references public.arguments(id) on delete cascade,
  type text not null check (type in ('pro', 'con')),
  text text not null check (char_length(text) > 0),
  created_at timestamptz not null default now()
);

create index if not exists argument_comments_argument_id_idx on public.argument_comments(argument_id);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

alter table public.admin_users enable row level security;
alter table public.topics enable row level security;
alter table public.arguments enable row level security;
alter table public.argument_comments enable row level security;

drop policy if exists "Admin users can read admin_users" on public.admin_users;
create policy "Admin users can read admin_users"
  on public.admin_users
  for select
  to authenticated
  using (public.is_admin() or user_id = auth.uid());

drop policy if exists "Public can read topics" on public.topics;
create policy "Public can read topics"
  on public.topics
  for select
  to anon, authenticated
  using (published = true or public.is_admin());

drop policy if exists "Admins can insert topics" on public.topics;
create policy "Admins can insert topics"
  on public.topics
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update topics" on public.topics;
create policy "Admins can update topics"
  on public.topics
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete topics" on public.topics;
create policy "Admins can delete topics"
  on public.topics
  for delete
  to authenticated
  using (public.is_admin());

drop policy if exists "Public can read arguments" on public.arguments;
create policy "Public can read arguments"
  on public.arguments
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.topics t
      where t.id = topic_id
        and (t.published = true or public.is_admin())
    )
  );

drop policy if exists "Admins can insert arguments" on public.arguments;
create policy "Admins can insert arguments"
  on public.arguments
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Public can insert arguments" on public.arguments;
create policy "Public can insert arguments"
  on public.arguments
  for insert
  to anon, authenticated
  with check (
    exists (
      select 1
      from public.topics t
      where t.id = topic_id
        and t.published = true
    )
  );

drop policy if exists "Admins can update arguments" on public.arguments;
create policy "Admins can update arguments"
  on public.arguments
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete arguments" on public.arguments;
create policy "Admins can delete arguments"
  on public.arguments
  for delete
  to authenticated
  using (public.is_admin());

drop policy if exists "Public can read comments" on public.argument_comments;
create policy "Public can read comments"
  on public.argument_comments
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can insert comments" on public.argument_comments;
create policy "Public can insert comments"
  on public.argument_comments
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Admins can delete comments" on public.argument_comments;
create policy "Admins can delete comments"
  on public.argument_comments
  for delete
  to authenticated
  using (public.is_admin());

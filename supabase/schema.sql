-- Run this in the Supabase SQL editor for your project.
-- Mirrors src/types/index.ts DocumentRecord. Supabase Auth (auth.users)
-- provides the user id referenced by user_id below.

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_url text not null,
  domain text not null,
  title text not null,
  category text not null default 'Uncategorized',
  tags text[] not null default '{}',
  content text not null,
  outline jsonb not null default '[]',
  scroll_progress real not null default 0,
  is_completed boolean not null default false,
  added_at bigint not null,
  last_read_at bigint not null,
  updated_at bigint not null
);

create index if not exists documents_user_id_idx on public.documents (user_id);
create index if not exists documents_updated_at_idx on public.documents (updated_at);

alter table public.documents enable row level security;

create policy "Users can read their own documents"
  on public.documents for select
  using (auth.uid() = user_id);

create policy "Users can insert their own documents"
  on public.documents for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own documents"
  on public.documents for update
  using (auth.uid() = user_id);

create policy "Users can delete their own documents"
  on public.documents for delete
  using (auth.uid() = user_id);

-- Enables Realtime sync so progress/read-state updates propagate live
-- between a user's other signed-in devices.
alter publication supabase_realtime add table public.documents;

-- Run this entire block in your Supabase SQL Editor
-- Go to: supabase.com → your project → SQL Editor → New Query → paste this → Run

-- Chats table
create table chats (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  created_at timestamp with time zone default now()
);

-- Messages table
create table messages (
  id uuid default gen_random_uuid() primary key,
  chat_id uuid references chats(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamp with time zone default now()
);

-- Row Level Security (users can only see their own data)
alter table chats enable row level security;
alter table messages enable row level security;

create policy "Users can manage their own chats"
  on chats for all
  using (auth.uid() = user_id);

create policy "Users can manage messages in their chats"
  on messages for all
  using (
    chat_id in (
      select id from chats where user_id = auth.uid()
    )
  );

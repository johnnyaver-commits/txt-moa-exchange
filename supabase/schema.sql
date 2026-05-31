create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text,
  bio text default '正在整理 TXT 收藏。',
  avatar_url text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  content text not null,
  category text not null check (category in ('CD', '照片小卡', '小物')),
  status text not null check (status in ('欲交換', '徵求', '已交換')),
  tags text[] not null default '{}',
  image_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.post_likes enable row level security;
alter table public.messages enable row level security;

drop policy if exists "Profiles are readable" on public.profiles;
create policy "Profiles are readable"
  on public.profiles for select
  using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Posts are readable" on public.posts;
create policy "Posts are readable"
  on public.posts for select
  using (true);

drop policy if exists "Users can create posts" on public.posts;
create policy "Users can create posts"
  on public.posts for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own posts" on public.posts;
create policy "Users can update own posts"
  on public.posts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own posts" on public.posts;
create policy "Users can delete own posts"
  on public.posts for delete
  using (auth.uid() = user_id);

drop policy if exists "Comments are readable" on public.comments;
create policy "Comments are readable"
  on public.comments for select
  using (true);

drop policy if exists "Users can create comments" on public.comments;
create policy "Users can create comments"
  on public.comments for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own comments" on public.comments;
create policy "Users can delete own comments"
  on public.comments for delete
  using (auth.uid() = user_id);

drop policy if exists "Likes are readable" on public.post_likes;
create policy "Likes are readable"
  on public.post_likes for select
  using (true);

drop policy if exists "Users can like posts" on public.post_likes;
create policy "Users can like posts"
  on public.post_likes for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can remove own likes" on public.post_likes;
create policy "Users can remove own likes"
  on public.post_likes for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can read own conversations" on public.messages;
create policy "Users can read own conversations"
  on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "Users can send messages" on public.messages;
create policy "Users can send messages"
  on public.messages for insert
  with check (auth.uid() = sender_id);

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    'https://api.dicebear.com/9.x/thumbs/svg?seed=' || coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

create index if not exists posts_created_at_idx on public.posts(created_at desc);
create index if not exists comments_post_id_idx on public.comments(post_id);
create index if not exists messages_pair_idx on public.messages(sender_id, receiver_id, created_at desc);

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text,
  bio text default '正在整理 TXT 收藏。',
  avatar_url text,
  is_admin boolean not null default false,
  is_blocked boolean not null default false,
  blocked_at timestamptz,
  blocked_by uuid references public.profiles(id) on delete set null,
  dm_policy text not null default 'everyone',
  hide_public_posts boolean not null default false,
  hide_public_comments boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists is_blocked boolean not null default false;
alter table public.profiles add column if not exists blocked_at timestamptz;
alter table public.profiles add column if not exists blocked_by uuid references public.profiles(id) on delete set null;
alter table public.profiles add column if not exists dm_policy text not null default 'everyone';
alter table public.profiles add column if not exists hide_public_posts boolean not null default false;
alter table public.profiles add column if not exists hide_public_comments boolean not null default false;
alter table public.profiles drop constraint if exists profiles_dm_policy_check;
alter table public.profiles add constraint profiles_dm_policy_check check (dm_policy in ('everyone', 'following', 'mutual'));

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  content text not null,
  category text not null,
  status text not null,
  tags text[] not null default '{}',
  image_url text not null,
  is_hidden boolean not null default false,
  hidden_at timestamptz,
  hidden_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.posts add column if not exists is_hidden boolean not null default false;
alter table public.posts add column if not exists hidden_at timestamptz;
alter table public.posts add column if not exists hidden_by uuid references public.profiles(id) on delete set null;

alter table public.posts drop constraint if exists posts_category_check;
alter table public.posts drop constraint if exists posts_status_check;
alter table public.posts add constraint posts_category_check check (category in ('CD', '照片小卡', '小物'));
alter table public.posts add constraint posts_status_check check (status in ('欲交換', '徵求', '洽談中', '已保留', '已完成', '取消交換', '已交換'));

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

create table if not exists public.post_saves (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete set null,
  content text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.messages add column if not exists post_id uuid references public.posts(id) on delete set null;
alter table public.messages add column if not exists read_at timestamptz;

create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.exchange_reviews (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewee_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text default '',
  created_at timestamptz not null default now(),
  unique (post_id, reviewer_id, reviewee_id),
  check (reviewer_id <> reviewee_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  category text not null default '其他',
  reason text not null,
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  handled_at timestamptz,
  handled_by uuid references public.profiles(id) on delete set null,
  resolution text,
  created_at timestamptz not null default now(),
  check (post_id is not null or comment_id is not null)
);

alter table public.reports add column if not exists category text not null default '其他';
alter table public.reports add column if not exists handled_at timestamptz;
alter table public.reports add column if not exists handled_by uuid references public.profiles(id) on delete set null;
alter table public.reports add column if not exists resolution text;
alter table public.reports drop constraint if exists reports_status_check;
alter table public.reports add constraint reports_status_check check (status in ('open', 'reviewed', 'dismissed'));

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null,
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  message_id uuid references public.messages(id) on delete cascade,
  content text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in ('like', 'comment', 'follow', 'message', 'report', 'report_result', 'review', 'save'));

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_saves enable row level security;
alter table public.follows enable row level security;
alter table public.messages enable row level security;
alter table public.user_blocks enable row level security;
alter table public.exchange_reviews enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;

create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = user_id and is_admin = true
  );
$$;

create or replace function public.is_user_blocked_between(left_user_id uuid, right_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_blocks
    where (blocker_id = left_user_id and blocked_id = right_user_id)
       or (blocker_id = right_user_id and blocked_id = left_user_id)
  );
$$;

create or replace function public.is_blocked(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = user_id and is_blocked = true
  );
$$;

create or replace function public.can_send_message_to(receiver_id uuid, sender_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles receiver
    where receiver.id = receiver_id
      and (
        receiver.dm_policy = 'everyone'
        or (
          receiver.dm_policy = 'following'
          and exists (
            select 1 from public.follows
            where follower_id = receiver_id and followee_id = sender_id
          )
        )
        or (
          receiver.dm_policy = 'mutual'
          and exists (
            select 1 from public.follows
            where follower_id = receiver_id and followee_id = sender_id
          )
          and exists (
            select 1 from public.follows
            where follower_id = sender_id and followee_id = receiver_id
          )
        )
      )
  );
$$;

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
  using (auth.uid() = id and is_blocked = false)
  with check (auth.uid() = id and is_admin = false and is_blocked = false);

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
  on public.profiles for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "Posts are readable" on public.posts;
create policy "Posts are readable"
  on public.posts for select
  using (is_hidden = false or auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "Users can create posts" on public.posts;
create policy "Users can create posts"
  on public.posts for insert
  with check (auth.uid() = user_id and not public.is_blocked(auth.uid()));

drop policy if exists "Users can update own posts" on public.posts;
create policy "Users can update own posts"
  on public.posts for update
  using (auth.uid() = user_id and is_hidden = false and not public.is_blocked(auth.uid()))
  with check (auth.uid() = user_id and not public.is_blocked(auth.uid()));

drop policy if exists "Admins can update posts" on public.posts;
create policy "Admins can update posts"
  on public.posts for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

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
  with check (auth.uid() = user_id and not public.is_blocked(auth.uid()));

drop policy if exists "Users can delete own comments" on public.comments;
create policy "Users can delete own comments"
  on public.comments for delete
  using (auth.uid() = user_id);

drop policy if exists "Admins can delete comments" on public.comments;
create policy "Admins can delete comments"
  on public.comments for delete
  using (public.is_admin(auth.uid()));

drop policy if exists "Likes are readable" on public.post_likes;
create policy "Likes are readable"
  on public.post_likes for select
  using (true);

drop policy if exists "Users can like posts" on public.post_likes;
create policy "Users can like posts"
  on public.post_likes for insert
  with check (auth.uid() = user_id and not public.is_blocked(auth.uid()));

drop policy if exists "Users can remove own likes" on public.post_likes;
create policy "Users can remove own likes"
  on public.post_likes for delete
  using (auth.uid() = user_id);

drop policy if exists "Saved posts are readable by owner" on public.post_saves;
create policy "Saved posts are readable by owner"
  on public.post_saves for select
  using (auth.uid() = user_id);

drop policy if exists "Users can save posts" on public.post_saves;
create policy "Users can save posts"
  on public.post_saves for insert
  with check (auth.uid() = user_id and not public.is_blocked(auth.uid()));

drop policy if exists "Users can unsave posts" on public.post_saves;
create policy "Users can unsave posts"
  on public.post_saves for delete
  using (auth.uid() = user_id);

drop policy if exists "Follows are readable" on public.follows;
create policy "Follows are readable"
  on public.follows for select
  using (true);

drop policy if exists "Users can follow members" on public.follows;
create policy "Users can follow members"
  on public.follows for insert
  with check (auth.uid() = follower_id and not public.is_blocked(auth.uid()));

drop policy if exists "Users can unfollow members" on public.follows;
create policy "Users can unfollow members"
  on public.follows for delete
  using (auth.uid() = follower_id);

drop policy if exists "Users can read own conversations" on public.messages;
create policy "Users can read own conversations"
  on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "Users can send messages" on public.messages;
create policy "Users can send messages"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and not public.is_blocked(auth.uid())
    and not public.is_blocked(receiver_id)
    and not public.is_user_blocked_between(sender_id, receiver_id)
    and public.can_send_message_to(receiver_id, sender_id)
  );

drop policy if exists "Users can mark received messages read" on public.messages;
create policy "Users can mark received messages read"
  on public.messages for update
  using (auth.uid() = receiver_id)
  with check (auth.uid() = receiver_id);

drop policy if exists "Users can read own blocks" on public.user_blocks;
create policy "Users can read own blocks"
  on public.user_blocks for select
  using (auth.uid() = blocker_id or auth.uid() = blocked_id);

drop policy if exists "Users can block members" on public.user_blocks;
create policy "Users can block members"
  on public.user_blocks for insert
  with check (auth.uid() = blocker_id and not public.is_blocked(auth.uid()));

drop policy if exists "Users can unblock members" on public.user_blocks;
create policy "Users can unblock members"
  on public.user_blocks for delete
  using (auth.uid() = blocker_id);

drop policy if exists "Exchange reviews are readable" on public.exchange_reviews;
create policy "Exchange reviews are readable"
  on public.exchange_reviews for select
  using (true);

drop policy if exists "Users can review completed exchanges" on public.exchange_reviews;
create policy "Users can review completed exchanges"
  on public.exchange_reviews for insert
  with check (
    auth.uid() = reviewer_id
    and not public.is_blocked(auth.uid())
    and exists (
      select 1 from public.posts
      where posts.id = post_id
        and posts.user_id = reviewee_id
        and posts.status in ('已完成', '已交換')
        and posts.user_id <> auth.uid()
    )
  );

drop policy if exists "Users can update own reviews" on public.exchange_reviews;
create policy "Users can update own reviews"
  on public.exchange_reviews for update
  using (auth.uid() = reviewer_id)
  with check (auth.uid() = reviewer_id);

drop policy if exists "Users can create reports" on public.reports;
create policy "Users can create reports"
  on public.reports for insert
  with check (auth.uid() = reporter_id and not public.is_blocked(auth.uid()));

drop policy if exists "Admins can read reports" on public.reports;
create policy "Admins can read reports"
  on public.reports for select
  using (public.is_admin(auth.uid()));

drop policy if exists "Admins can update reports" on public.reports;
create policy "Admins can update reports"
  on public.reports for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can create notifications" on public.notifications;
create policy "Users can create notifications"
  on public.notifications for insert
  with check (auth.uid() = actor_id);

create or replace function public.auto_hide_heavily_reported_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.post_id is not null then
    update public.posts
    set is_hidden = true,
        hidden_at = coalesce(hidden_at, now())
    where id = new.post_id
      and is_hidden = false
      and (
        select count(*)
        from public.reports
        where post_id = new.post_id and status = 'open'
      ) >= 3;
  end if;
  return new;
end;
$$;

drop trigger if exists on_report_auto_hide_post on public.reports;
create trigger on_report_auto_hide_post
  after insert on public.reports
  for each row execute function public.auto_hide_heavily_reported_post();

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
create index if not exists posts_is_hidden_idx on public.posts(is_hidden);
create index if not exists posts_status_idx on public.posts(status);
create index if not exists profiles_is_blocked_idx on public.profiles(is_blocked);
create index if not exists comments_post_id_idx on public.comments(post_id);
create index if not exists post_saves_user_idx on public.post_saves(user_id, created_at desc);
create index if not exists follows_followee_idx on public.follows(followee_id, created_at desc);
create index if not exists follows_follower_idx on public.follows(follower_id, created_at desc);
create index if not exists messages_pair_idx on public.messages(sender_id, receiver_id, created_at desc);
create index if not exists messages_unread_idx on public.messages(receiver_id, read_at, created_at desc);
create index if not exists messages_post_id_idx on public.messages(post_id);
create index if not exists user_blocks_blocked_idx on public.user_blocks(blocked_id, created_at desc);
create index if not exists exchange_reviews_reviewee_idx on public.exchange_reviews(reviewee_id, created_at desc);
create index if not exists exchange_reviews_post_idx on public.exchange_reviews(post_id);
create index if not exists reports_status_idx on public.reports(status, created_at desc);
create index if not exists notifications_user_idx on public.notifications(user_id, is_read, created_at desc);

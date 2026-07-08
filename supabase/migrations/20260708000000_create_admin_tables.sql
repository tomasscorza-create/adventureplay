create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  role text not null check (role in ('owner', 'admin', 'support', 'analyst')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  unique (user_id)
);

create table if not exists public.admin_audits (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id),
  action text not null,
  target_user_id uuid references auth.users(id),
  previous_state jsonb,
  new_state jsonb,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.user_moderation (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  status text not null check (status in ('ACTIVE', 'SUSPENDED', 'BANNED')),
  reason text,
  expires_at timestamptz,
  issued_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

-- Enable RLS
alter table public.admin_users enable row level security;
alter table public.admin_audits enable row level security;
alter table public.user_moderation enable row level security;

-- Policies for admin_users (Admins can at least read their own row to verify login)
create policy "Admins can read own row" 
  on public.admin_users for select 
  using (user_id = auth.uid());

-- Triggers for updated_at
create trigger set_user_moderation_updated_at
  before update on public.user_moderation
  for each row
  execute function public.set_game_saves_updated_at(); -- Reusing the same generic function

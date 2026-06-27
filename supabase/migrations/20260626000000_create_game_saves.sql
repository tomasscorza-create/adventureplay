create table if not exists public.game_saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  slot_id text not null default 'default',
  save_version integer not null default 1 check (save_version > 0),
  save_data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slot_id)
);

comment on table public.game_saves is
  'Persistent Superjuego save slots. save_data stores the SaveData JSON payload from the game client.';
comment on column public.game_saves.save_version is
  'Application save schema version. Current code writes version 1.';
comment on column public.game_saves.slot_id is
  'Named player slot. The initial client adapter uses default.';

alter table public.game_saves enable row level security;

create policy "Players can read own game saves"
  on public.game_saves
  for select
  using (auth.uid() = user_id);

create policy "Players can create own game saves"
  on public.game_saves
  for insert
  with check (auth.uid() = user_id);

create policy "Players can update own game saves"
  on public.game_saves
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Players can delete own game saves"
  on public.game_saves
  for delete
  using (auth.uid() = user_id);

create or replace function public.set_game_saves_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_game_saves_updated_at on public.game_saves;

create trigger set_game_saves_updated_at
  before update on public.game_saves
  for each row
  execute function public.set_game_saves_updated_at();

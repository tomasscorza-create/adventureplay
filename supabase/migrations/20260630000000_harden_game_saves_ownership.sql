alter table public.game_saves
  add constraint game_saves_user_id_fkey
  foreign key (user_id)
  references auth.users (id)
  on delete cascade;

comment on column public.game_saves.save_version is
  'Application save schema version supplied by SAVE_SCHEMA_VERSION in the game client.';

revoke all on table public.game_saves from anon, authenticated;
grant select, insert, update, delete on table public.game_saves to authenticated;

alter function public.set_game_saves_updated_at() set search_path = '';

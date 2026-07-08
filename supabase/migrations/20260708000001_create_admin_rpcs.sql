create or replace function public.is_owner_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  is_owner boolean;
begin
  select exists(
    select 1 from admin_users 
    where user_id = auth.uid() 
      and role = 'owner'
  ) into is_owner;
  
  return is_owner;
end;
$$;

create or replace function public.get_admin_dashboard_metrics()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  total_saves int;
  unique_users int;
  recent_saves int;
  total_coins bigint;
  avg_level numeric;
  total_runs bigint;
  total_defeats bigint;
  total_time bigint;
  top_chars jsonb;
begin
  if not is_owner_admin() then
    raise exception 'Unauthorized';
  end if;

  select count(*) into total_saves from game_saves;
  select count(distinct user_id) into unique_users from game_saves;
  select count(*) into recent_saves from game_saves where updated_at > now() - interval '24 hours';
  
  select coalesce(sum((save_data->'player'->>'coins')::numeric), 0) into total_coins from game_saves;
  select coalesce(avg((save_data->'player'->>'level')::numeric), 0) into avg_level from game_saves;
  
  select coalesce(sum((save_data->'statistics'->>'runsPlayed')::numeric), 0) into total_runs from game_saves;
  select coalesce(sum((save_data->'statistics'->>'defeats')::numeric), 0) into total_defeats from game_saves;
  select coalesce(sum((save_data->'statistics'->>'gameplaySeconds')::numeric), 0) into total_time from game_saves;
  
  -- Top characters
  select jsonb_agg(ch) into top_chars from (
    select save_data->>'selectedCharacterId' as char_id, count(*) as usage_count
    from game_saves
    where save_data->>'selectedCharacterId' is not null
    group by char_id
    order by usage_count desc
    limit 5
  ) ch;

  return jsonb_build_object(
    'total_saves', total_saves,
    'unique_users', unique_users,
    'recent_saves', recent_saves,
    'total_coins', coalesce(total_coins, 0),
    'avg_level', coalesce(round(avg_level, 2), 0),
    'total_runs', coalesce(total_runs, 0),
    'total_defeats', coalesce(total_defeats, 0),
    'total_time', coalesce(total_time, 0),
    'top_characters', coalesce(top_chars, '[]'::jsonb)
  );
end;
$$;

create or replace function public.get_admin_players_list(limit_val int default 50, offset_val int default 0)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not is_owner_admin() then
    raise exception 'Unauthorized';
  end if;

  select jsonb_agg(row_to_json(t)) into result
  from (
    select 
      user_id,
      slot_id,
      updated_at,
      save_data->'player'->>'displayName' as display_name,
      (save_data->'player'->>'coins')::numeric as coins,
      save_data->>'selectedCharacterId' as selected_character_id,
      (save_data->'statistics'->>'runsPlayed')::numeric as runs_played,
      (save_data->'statistics'->>'defeats')::numeric as defeats,
      (save_data->'statistics'->>'gameplaySeconds')::numeric as gameplay_seconds,
      jsonb_array_length(save_data->'completedLevels') as completed_levels_count,
      jsonb_array_length(save_data->'unlockedCharacterIds') as unlocked_chars_count
    from game_saves
    order by updated_at desc
    limit limit_val offset offset_val
  ) t;

  return coalesce(result, '[]'::jsonb);
end;
$$;

create or replace function public.get_admin_player_detail(target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
  mod_status jsonb;
begin
  if not is_owner_admin() then
    raise exception 'Unauthorized';
  end if;

  select row_to_json(m) into mod_status
  from user_moderation m
  where m.user_id = target_user_id;

  select jsonb_build_object(
    'user_id', target_user_id,
    'moderation', mod_status,
    'saves', coalesce(jsonb_agg(
      jsonb_build_object(
        'slot_id', slot_id,
        'save_version', save_version,
        'created_at', created_at,
        'updated_at', updated_at,
        'save_data', save_data
      ) order by updated_at desc
    ), '[]'::jsonb)
  ) into result
  from game_saves
  where user_id = target_user_id;

  return coalesce(result, jsonb_build_object('user_id', target_user_id, 'saves', '[]'::jsonb));
end;
$$;

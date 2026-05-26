-- Atomic XP increment functions to prevent lost updates under concurrent writes

CREATE OR REPLACE FUNCTION public.increment_dog_xp(dog_id_param uuid, xp_amount int)
RETURNS void AS $$
BEGIN
  UPDATE public.dogs
  SET total_xp = total_xp + xp_amount,
      current_level = GREATEST(FLOOR(SQRT((total_xp + xp_amount) / 100.0))::int, 1)
  WHERE id = dog_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.increment_user_xp(user_id_param uuid, xp_amount int)
RETURNS void AS $$
DECLARE
  new_total bigint;
BEGIN
  UPDATE public.user_profiles
  SET total_xp = total_xp + xp_amount,
      updated_at = now()
  WHERE id = user_id_param
  RETURNING total_xp INTO new_total;

  UPDATE public.user_profiles
  SET current_level = GREATEST(FLOOR(SQRT(new_total / 100.0))::int, 1)
  WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

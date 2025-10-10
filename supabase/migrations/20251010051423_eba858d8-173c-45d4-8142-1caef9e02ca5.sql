
-- Update the handle_new_user function to handle duplicate USN gracefully
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert into profiles with conflict handling
  INSERT INTO public.profiles (id, name, email, usn)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'New User'),
    NEW.email,
    NEW.raw_user_meta_data->>'usn'
  )
  ON CONFLICT (usn) DO UPDATE
  SET 
    id = EXCLUDED.id,
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    updated_at = NOW();
  
  -- Insert into students if USN is provided
  IF NEW.raw_user_meta_data->>'usn' IS NOT NULL THEN
    INSERT INTO public.students (usn, name, email, major, user_id)
    VALUES (
      NEW.raw_user_meta_data->>'usn',
      COALESCE(NEW.raw_user_meta_data->>'name', 'New Student'),
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'major', 'Not Specified'),
      NEW.id
    )
    ON CONFLICT (usn) DO UPDATE
    SET
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      major = EXCLUDED.major,
      user_id = EXCLUDED.user_id,
      updated_at = NOW();
    
    -- Assign student role by default (only if not exists)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'student')
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;

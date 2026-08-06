CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  inv public.invitations%ROWTYPE;
BEGIN
  SELECT * INTO inv
  FROM public.invitations
  WHERE lower(email) = lower(NEW.email) AND status = 'pending'
  ORDER BY created_at ASC
  LIMIT 1;

  IF inv.id IS NULL THEN
    RAISE EXCEPTION 'not_invited: questa email non ha un invito valido';
  END IF;

  INSERT INTO public.profiles (id, full_name, language)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'language')::public.app_language, 'it')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, inv.role)
  ON CONFLICT DO NOTHING;

  IF inv.role = 'user' THEN
    INSERT INTO public.operator_assignments (operator_id, user_id)
    VALUES (inv.invited_by, NEW.id)
    ON CONFLICT DO NOTHING;
  ELSIF inv.role = 'operator' THEN
    -- a new operator gets visibility on every beneficiary already registered
    INSERT INTO public.operator_assignments (operator_id, user_id)
    SELECT NEW.id, ur.user_id
    FROM public.user_roles ur
    WHERE ur.role = 'user' AND ur.user_id <> NEW.id
    ON CONFLICT DO NOTHING;
  END IF;

  UPDATE public.invitations
  SET status = 'accepted', accepted_user_id = NEW.id, accepted_at = now()
  WHERE id = inv.id;

  RETURN NEW;
END;
$function$;
CREATE TABLE public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user',
  invited_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  note text,
  accepted_user_id uuid,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX invitations_pending_email_idx
  ON public.invitations (lower(email))
  WHERE status = 'pending';

CREATE INDEX invitations_invited_by_idx ON public.invitations (invited_by);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitations TO authenticated;
GRANT ALL ON public.invitations TO service_role;

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators read own invitations" ON public.invitations
  FOR SELECT TO authenticated
  USING (invited_by = auth.uid() AND private.has_role(auth.uid(), 'operator'));

CREATE POLICY "Operators create invitations" ON public.invitations
  FOR INSERT TO authenticated
  WITH CHECK (invited_by = auth.uid() AND private.has_role(auth.uid(), 'operator'));

CREATE POLICY "Operators update own invitations" ON public.invitations
  FOR UPDATE TO authenticated
  USING (invited_by = auth.uid() AND private.has_role(auth.uid(), 'operator'))
  WITH CHECK (invited_by = auth.uid() AND private.has_role(auth.uid(), 'operator'));

CREATE POLICY "Operators delete own pending invitations" ON public.invitations
  FOR DELETE TO authenticated
  USING (invited_by = auth.uid() AND status = 'pending' AND private.has_role(auth.uid(), 'operator'));

CREATE TRIGGER invitations_set_updated_at
  BEFORE UPDATE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Operators can manage assignments they own
CREATE POLICY "Operators create own assignments" ON public.operator_assignments
  FOR INSERT TO authenticated
  WITH CHECK (operator_id = auth.uid() AND private.has_role(auth.uid(), 'operator'));

CREATE POLICY "Operators delete own assignments" ON public.operator_assignments
  FOR DELETE TO authenticated
  USING (operator_id = auth.uid() AND private.has_role(auth.uid(), 'operator'));

-- Invite-only signup + auto linking
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
  END IF;

  UPDATE public.invitations
  SET status = 'accepted', accepted_user_id = NEW.id, accepted_at = now()
  WHERE id = inv.id;

  RETURN NEW;
END;
$function$;
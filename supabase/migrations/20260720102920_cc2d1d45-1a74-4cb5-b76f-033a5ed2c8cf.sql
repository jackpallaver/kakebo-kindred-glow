
CREATE SCHEMA IF NOT EXISTS private;

-- Recreate functions in private schema
CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION private.is_assigned_operator(_operator_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.operator_assignments
    WHERE operator_id = _operator_id AND user_id = _user_id
  ) AND private.has_role(_operator_id, 'operator');
$$;

-- Lock down: revoke from all API roles, grant only to authenticated for RLS evaluation
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_assigned_operator(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_assigned_operator(uuid, uuid) TO authenticated;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- Rebuild policies to reference private.* functions
DROP POLICY IF EXISTS "Operators read assigned profiles" ON public.profiles;
CREATE POLICY "Operators read assigned profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (private.is_assigned_operator(auth.uid(), id));

DROP POLICY IF EXISTS "Operators read assigned user goals" ON public.annual_goals;
CREATE POLICY "Operators read assigned user goals" ON public.annual_goals
  FOR SELECT TO authenticated
  USING (private.is_assigned_operator(auth.uid(), user_id));

DROP POLICY IF EXISTS "Operators read assigned user transactions" ON public.transactions;
CREATE POLICY "Operators read assigned user transactions" ON public.transactions
  FOR SELECT TO authenticated
  USING (private.is_assigned_operator(auth.uid(), user_id));

DROP POLICY IF EXISTS "Operators read assigned user forecasts" ON public.monthly_forecasts;
CREATE POLICY "Operators read assigned user forecasts" ON public.monthly_forecasts
  FOR SELECT TO authenticated
  USING (private.is_assigned_operator(auth.uid(), user_id));

DROP POLICY IF EXISTS "Operators read assigned user events" ON public.calendar_events;
CREATE POLICY "Operators read assigned user events" ON public.calendar_events
  FOR SELECT TO authenticated
  USING (private.is_assigned_operator(auth.uid(), user_id));

-- Drop the API-exposed originals
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.is_assigned_operator(uuid, uuid);

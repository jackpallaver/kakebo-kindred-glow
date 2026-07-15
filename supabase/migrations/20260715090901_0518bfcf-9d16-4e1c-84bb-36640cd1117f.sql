
-- Enums
CREATE TYPE public.app_role AS ENUM ('user', 'operator');
CREATE TYPE public.transaction_type AS ENUM ('income', 'expense');
CREATE TYPE public.transaction_category AS ENUM (
  'alimentari','bollette','trasporti','casa','salute',
  'svago','educazione','abbigliamento','risparmio','altro'
);
CREATE TYPE public.app_language AS ENUM ('it','en','fr','ar');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  language public.app_language NOT NULL DEFAULT 'it',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles (separate table for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- is_assigned_operator: does operator_id have user_id assigned?
CREATE TABLE public.operator_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (operator_id, user_id)
);
GRANT SELECT ON public.operator_assignments TO authenticated;
GRANT ALL ON public.operator_assignments TO service_role;
ALTER TABLE public.operator_assignments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_assigned_operator(_operator_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.operator_assignments
    WHERE operator_id = _operator_id AND user_id = _user_id
  ) AND public.has_role(_operator_id, 'operator');
$$;

-- Profiles policies
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT
  USING (auth.uid() = id);
CREATE POLICY "Operators read assigned profiles" ON public.profiles FOR SELECT
  USING (public.is_assigned_operator(auth.uid(), id));
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- User_roles policies
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Operator_assignments policies
CREATE POLICY "Operator reads own assignments" ON public.operator_assignments FOR SELECT
  USING (auth.uid() = operator_id);
CREATE POLICY "User reads own assignment" ON public.operator_assignments FOR SELECT
  USING (auth.uid() = user_id);

-- Annual goals
CREATE TABLE public.annual_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  description TEXT NOT NULL,
  target_amount NUMERIC(12,2) NOT NULL CHECK (target_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, year)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.annual_goals TO authenticated;
GRANT ALL ON public.annual_goals TO service_role;
ALTER TABLE public.annual_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own goals" ON public.annual_goals FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Operators read assigned user goals" ON public.annual_goals FOR SELECT
  USING (public.is_assigned_operator(auth.uid(), user_id));

-- Transactions
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.transaction_type NOT NULL,
  category public.transaction_category NOT NULL DEFAULT 'altro',
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own transactions" ON public.transactions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Operators read assigned user transactions" ON public.transactions FOR SELECT
  USING (public.is_assigned_operator(auth.uid(), user_id));
CREATE INDEX idx_transactions_user_date ON public.transactions(user_id, date DESC);

-- Monthly forecasts
CREATE TABLE public.monthly_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  expected_income NUMERIC(12,2) NOT NULL DEFAULT 0,
  expected_expenses JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, year, month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_forecasts TO authenticated;
GRANT ALL ON public.monthly_forecasts TO service_role;
ALTER TABLE public.monthly_forecasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own forecasts" ON public.monthly_forecasts FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Operators read assigned user forecasts" ON public.monthly_forecasts FOR SELECT
  USING (public.is_assigned_operator(auth.uid(), user_id));

-- Calendar events
CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  reminder_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT ALL ON public.calendar_events TO service_role;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own events" ON public.calendar_events FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Operators read assigned user events" ON public.calendar_events FOR SELECT
  USING (public.is_assigned_operator(auth.uid(), user_id));

-- Tips library
CREATE TABLE public.tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  language public.app_language NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (slug, language)
);
GRANT SELECT ON public.tips TO authenticated, anon;
GRANT ALL ON public.tips TO service_role;
ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read tips" ON public.tips FOR SELECT USING (true);

-- Trigger: auto-create profile + default 'user' role on new auth user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, language)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'language')::public.app_language, 'it')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_goals_updated BEFORE UPDATE ON public.annual_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_forecasts_updated BEFORE UPDATE ON public.monthly_forecasts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

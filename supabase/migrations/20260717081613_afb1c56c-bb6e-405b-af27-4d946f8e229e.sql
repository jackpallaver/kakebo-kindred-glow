
-- Change transactions.category from enum to text
ALTER TABLE public.transactions ALTER COLUMN category DROP DEFAULT;
ALTER TABLE public.transactions ALTER COLUMN category TYPE text USING category::text;
ALTER TABLE public.transactions ALTER COLUMN category SET DEFAULT 'altro';

-- Add diary field to profiles (write-once at app level)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS diary text;

-- Custom user-defined categories
CREATE TABLE IF NOT EXISTS public.custom_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_categories TO authenticated;
GRANT ALL ON public.custom_categories TO service_role;

ALTER TABLE public.custom_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own custom categories" ON public.custom_categories
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

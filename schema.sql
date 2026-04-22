-- CarWise — Supabase schema
-- Run in: Supabase Dashboard → SQL Editor → New Query

-- ── Profiles ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                 UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email              TEXT,
  stripe_customer_id TEXT UNIQUE,
  plan               TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  lookups_used       INTEGER NOT NULL DEFAULT 0,
  lookups_reset_at   TIMESTAMPTZ NOT NULL DEFAULT (
    date_trunc('month', NOW() AT TIME ZONE 'UTC') + INTERVAL '1 month'
  ),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_profile_select" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "own_profile_update" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ── Auto-create profile on signup ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

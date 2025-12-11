-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create satellites table
CREATE TABLE public.satellites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  tle_line1 TEXT NOT NULL,
  tle_line2 TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on satellites
ALTER TABLE public.satellites ENABLE ROW LEVEL SECURITY;

-- Satellites policies
CREATE POLICY "Users can view their own satellites"
ON public.satellites FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own satellites"
ON public.satellites FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own satellites"
ON public.satellites FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own satellites"
ON public.satellites FOR DELETE
USING (auth.uid() = user_id);

-- Create satellite_predictions table
CREATE TABLE public.satellite_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  satellite_id UUID REFERENCES public.satellites(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prediction_time TIMESTAMPTZ NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  altitude DOUBLE PRECISION NOT NULL,
  velocity DOUBLE PRECISION NOT NULL,
  orbital_elements JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on satellite_predictions
ALTER TABLE public.satellite_predictions ENABLE ROW LEVEL SECURITY;

-- Satellite predictions policies
CREATE POLICY "Users can view their own predictions"
ON public.satellite_predictions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own predictions"
ON public.satellite_predictions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create collision_alerts table
CREATE TABLE public.collision_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  satellite1_id UUID REFERENCES public.satellites(id) ON DELETE CASCADE NOT NULL,
  satellite2_id UUID REFERENCES public.satellites(id) ON DELETE CASCADE NOT NULL,
  distance DOUBLE PRECISION NOT NULL,
  alert_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on collision_alerts
ALTER TABLE public.collision_alerts ENABLE ROW LEVEL SECURITY;

-- Collision alerts policies
CREATE POLICY "Users can view their own alerts"
ON public.collision_alerts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own alerts"
ON public.collision_alerts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts"
ON public.collision_alerts FOR UPDATE
USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_satellites_updated_at
BEFORE UPDATE ON public.satellites
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Fix RLS policies to restrict public access

-- Drop and recreate profiles policies with proper authentication checks
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Drop and recreate collision_alerts policies with proper authentication checks
DROP POLICY IF EXISTS "Users can view their own alerts" ON public.collision_alerts;
DROP POLICY IF EXISTS "Users can insert their own alerts" ON public.collision_alerts;
DROP POLICY IF EXISTS "Users can update their own alerts" ON public.collision_alerts;

CREATE POLICY "Users can view their own alerts"
ON public.collision_alerts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own alerts"
ON public.collision_alerts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts"
ON public.collision_alerts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);
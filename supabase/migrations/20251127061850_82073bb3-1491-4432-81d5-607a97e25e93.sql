-- Ensure RLS is enabled at the database level for profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Also ensure RLS is enabled for all other user data tables
ALTER TABLE public.satellites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collision_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.satellite_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
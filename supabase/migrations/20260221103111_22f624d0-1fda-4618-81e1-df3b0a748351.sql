
-- Fix the overly permissive profiles INSERT policy
-- The trigger runs as SECURITY DEFINER so it bypasses RLS
-- Users should only be able to insert their own profile (edge case)
DROP POLICY "System inserts profiles" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

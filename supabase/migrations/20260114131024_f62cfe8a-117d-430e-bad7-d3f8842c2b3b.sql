-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Subscriptions are viewable by everyone" ON public.subscriptions;

-- Create a more restrictive policy that only allows users to see their own subscriptions
-- and channel owners to see their subscribers
CREATE POLICY "Users can view own subscriptions and channel owners can see subscribers" 
ON public.subscriptions 
FOR SELECT 
USING (
  auth.uid() = subscriber_id OR 
  auth.uid() = channel_id
);
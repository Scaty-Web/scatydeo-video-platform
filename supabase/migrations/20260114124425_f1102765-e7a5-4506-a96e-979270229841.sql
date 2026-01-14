
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create banned_users table
CREATE TABLE public.banned_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    reason text NOT NULL,
    banned_by uuid REFERENCES auth.users(id) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Create video_reports table
CREATE TABLE public.video_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
    reporter_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    reason text NOT NULL,
    status text DEFAULT 'pending',
    reviewed_by uuid REFERENCES auth.users(id),
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banned_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_reports ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
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

-- Create function to check if user is banned
CREATE OR REPLACE FUNCTION public.is_user_banned(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.banned_users
    WHERE user_id = _user_id
  )
$$;

-- Create function to get ban info
CREATE OR REPLACE FUNCTION public.get_ban_info(_user_id uuid)
RETURNS TABLE(reason text, banned_at timestamp with time zone)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT reason, created_at as banned_at
  FROM public.banned_users
  WHERE user_id = _user_id
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Moderators can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for banned_users
CREATE POLICY "Users can check if they are banned"
ON public.banned_users FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Moderators can view all bans"
ON public.banned_users FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Moderators can ban users"
ON public.banned_users FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Moderators can unban users"
ON public.banned_users FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for video_reports
CREATE POLICY "Users can report videos"
ON public.video_reports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own reports"
ON public.video_reports FOR SELECT
USING (auth.uid() = reporter_id);

CREATE POLICY "Moderators can view all reports"
ON public.video_reports FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Moderators can update reports"
ON public.video_reports FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Moderators can delete reports"
ON public.video_reports FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

-- Allow moderators to delete any video
CREATE POLICY "Moderators can delete any video"
ON public.videos FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

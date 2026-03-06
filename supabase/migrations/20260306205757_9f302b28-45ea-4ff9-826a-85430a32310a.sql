
-- Streams table
CREATE TABLE public.streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  thumbnail_url text,
  rtmp_url text NOT NULL DEFAULT 'rtmp://your-server.com/live',
  stream_key text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  playback_url text,
  is_live boolean NOT NULL DEFAULT false,
  chat_enabled boolean NOT NULL DEFAULT true,
  viewer_count integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Stream chat messages table
CREATE TABLE public.stream_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stream_chat_messages ENABLE ROW LEVEL SECURITY;

-- Streams RLS policies
CREATE POLICY "Live streams viewable by everyone" ON public.streams
  FOR SELECT USING (is_live = true OR user_id = auth.uid());

CREATE POLICY "Users can create own streams" ON public.streams
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own streams" ON public.streams
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own streams" ON public.streams
  FOR DELETE USING (auth.uid() = user_id);

-- Chat RLS policies
CREATE POLICY "Chat messages viewable on live streams" ON public.stream_chat_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.streams WHERE id = stream_id AND is_live = true)
  );

CREATE POLICY "Authenticated users can send chat messages" ON public.stream_chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat messages" ON public.stream_chat_messages
  FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime for chat and streams
ALTER PUBLICATION supabase_realtime ADD TABLE public.stream_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.streams;

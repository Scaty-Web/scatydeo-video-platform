
-- 1. Atomic view count increment RPC
CREATE OR REPLACE FUNCTION public.increment_view_count(target_video_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE videos SET views_count = views_count + 1 WHERE id = target_video_id;
END;
$$;

-- 2. Trigger to maintain video likes_count
CREATE OR REPLACE FUNCTION public.update_video_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE videos SET likes_count = likes_count + 1 WHERE id = NEW.video_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE videos SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.video_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER maintain_video_likes_count
AFTER INSERT OR DELETE ON video_likes
FOR EACH ROW EXECUTE FUNCTION update_video_likes_count();

-- 3. Trigger to maintain subscribers_count on profiles
CREATE OR REPLACE FUNCTION public.update_subscribers_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET subscribers_count = COALESCE(subscribers_count, 0) + 1 WHERE id = NEW.channel_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET subscribers_count = GREATEST(COALESCE(subscribers_count, 0) - 1, 0) WHERE id = OLD.channel_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER maintain_subscribers_count
AFTER INSERT OR DELETE ON subscriptions
FOR EACH ROW EXECUTE FUNCTION update_subscribers_count();

-- 4. Notification triggers for likes, comments, subscriptions
CREATE OR REPLACE FUNCTION public.notify_on_video_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type, link)
  SELECT v.user_id, 'New Like', 'Someone liked your video', 'video', '/watch/' || NEW.video_id
  FROM videos v WHERE v.id = NEW.video_id AND v.user_id != NEW.user_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_video_like_notify
AFTER INSERT ON video_likes
FOR EACH ROW EXECUTE FUNCTION notify_on_video_like();

CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type, link)
  SELECT v.user_id, 'New Comment', 'Someone commented on your video', 'video', '/watch/' || NEW.video_id
  FROM videos v WHERE v.id = NEW.video_id AND v.user_id != NEW.user_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_comment_notify
AFTER INSERT ON comments
FOR EACH ROW EXECUTE FUNCTION notify_on_comment();

CREATE OR REPLACE FUNCTION public.notify_on_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type, link)
  VALUES (NEW.channel_id, 'New Subscriber', 'You have a new subscriber!', 'info', NULL);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_subscription_notify
AFTER INSERT ON subscriptions
FOR EACH ROW EXECUTE FUNCTION notify_on_subscription();

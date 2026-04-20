---
name: Switch (Shorts) Feature
description: Vertical short-video system (TikTok/Shorts style) with /switch feed, /upload/switch, separate switches/switch_likes/switch_comments/switch_reports tables, and switches storage bucket
type: feature
---
# Scatydeo Switch

Vertical short-video system inspired by YouTube Shorts and TikTok.

## Constraints
- Vertical only (height > width), validated client-side via video metadata.
- Max 60 seconds, max 1 GB.
- Default cover at `src/assets/switch-default-cover.png` when uploader doesn't supply one.

## Routes
- `/switch` — full-screen vertical snap-scroll feed (TikTok-like).
- `/switch/:id` — same feed but starts on the given switch.
- `/upload/switch` — dedicated upload page.

## Database (separate from videos)
- `switches` (title, description, video_url, cover_url, duration_seconds, views/likes/comments counts, is_public)
- `switch_likes` — unique(switch_id, user_id), trigger updates likes_count
- `switch_comments` — trigger updates comments_count, SELECT requires authenticated
- `switch_reports` — moderator-only review
- RPCs: `increment_switch_view_count`, `has_user_liked_switch`, `get_switch_like_count`
- Storage bucket: `switches` (public)

## UI
- Brand mark: `src/components/SwitchLogo.tsx` — CSS-only neon purple capsule with white play arrow. Used in Navbar, BottomNav, Upload, and Feed.
- Navbar Upload button becomes a dropdown (Video / Switch) when logged in.
- BottomNav has a Switch entry between Trending and Rules.
- Channel page has a Switches tab showing 9:16 cover grid.
- Feed: tap to play/pause, mute toggle, like, comments dialog, report dialog, subscribe inline, upload shortcut.

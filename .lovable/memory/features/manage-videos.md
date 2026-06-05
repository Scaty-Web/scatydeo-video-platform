---
name: Manage Videos
description: /manage/videos page lets the signed-in user list, delete, and toggle visibility (is_public) of their own videos
type: feature
---
# Manage Videos

- Route: /manage/videos -> src/pages/ManageVideos.tsx
- Navbar SlidersHorizontal icon next to upload (signed-in only).
- Uses existing videos RLS (owner only) for UPDATE is_public and DELETE.
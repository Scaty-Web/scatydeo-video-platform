---
name: Default Assets
description: Fallback images for missing avatar, banner, and video thumbnail
type: design
---
When a user has no avatar, banner, or a video has no thumbnail, use defaults from `src/lib/defaults.ts`:
- Avatar: `src/assets/default-profile.png`
- Banner: `src/assets/default-banner.png`
- Thumbnail: `src/assets/default-thumbnail.png`

Helpers: `getAvatarUrl(url)`, `getBannerUrl(url)`, `getThumbnailUrl(url)`.

Storage buckets `avatars` and `banners` (public) hold user uploads, organized by `{user_id}/...` for RLS.

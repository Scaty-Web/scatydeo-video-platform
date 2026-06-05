# Memory: index.md
Updated: today

# Project Memory

## Core
- **Identity:** Scatydeo (Turkish video platform by SWO, 2026). Black/purple neon theme.
- **UI/UX:** YouTube-style layout. Custom neon player (0.5x-2x speed, NO quality selector). Mobile bottom nav.
- **Tech Stack:** Supabase backend. TR/EN i18n via localStorage.
- **Auth & RBAC:** Roles (admin, moderator, user) checked via `has_role` SQL function.
- **Privacy:** `video_likes` and `subscriptions` hidden. Use `get_video_like_count` RPC.
- **Live Streams:** Chat uses DB polling. `streams` & `stream_chat_messages` excluded from Supabase Realtime.
- **Switch (Shorts):** Vertical short videos at /switch with separate `switches` tables.

## Memories
- [Scatydeo Identity](mem://project/identity) — Official Turkish video platform info, links, copyright
- [Backend Infrastructure](mem://technical/backend-infrastructure) — Supabase RPCs, session storage deduplication, triggers
- [Visual Identity](mem://style/visual-identity) — Black/purple theme, YouTube layout, pill search bar
- [Subscription Privacy](mem://security/subscription-privacy) — RLS restricting subscription viewing to owners
- [Storage Management](mem://technical/storage-management) — Supabase videos and thumbnails buckets RLS
- [Role Management](mem://features/role-management-system) — admin/moderator roles, has_role, ban system
- [Visibility Policies](mem://security/visibility-policies) — PERMISSIVE read RLS for public videos/profiles
- [Contact Info](mem://project/contact-info) — Official support email used in footer
- [Comment Privacy](mem://security/comment-privacy-and-tracking) — Comments SELECT restricted to authenticated users
- [Like Privacy & RPCs](mem://security/interaction-privacy-likes) — video_likes hidden, use get_video_like_count RPC
- [Custom Video Player](mem://features/custom-video-player) — Neon custom player, no quality selector
- [Localization (i18n)](mem://features/localization-system) — TR/EN language support via localStorage
- [Trending Algorithm](mem://features/trending-system) — Trending page filters videos with 10+ views
- [Mobile Navigation](mem://style/mobile-ui-patterns) — Fixed bottom navigation bar for mobile devices
- [Password Management](mem://auth/password-management) — Secure password update via Supabase re-authentication
- [AI Video Summary](mem://features/ai-video-summary) — Gemini 2.5 Flash JWT edge function for summaries
- [Watch Page Layout](mem://style/watch-page-layout) — 2-column player and trending layout
- [Legal Policies](mem://project/legal-policies) — Internal Privacy Policy and external ToS links
- [Live Stream Security](mem://security/realtime-broadcast-control) — streams disabled from Supabase Realtime
- [v2 Welcome Screen](mem://features/v2-welcome-system) — Web Audio API intro page, scatydeo_v2_seen preference
- [Stream Recording](mem://features/live-streaming-recording) — Local/display streams saved as .webm via MediaRecorder
- [Stream Viewing & Chat](mem://features/live-streaming-viewing) — Watch page chat uses polling instead of Realtime
- [News & Download](mem://features/news-and-download) — News page, video download, threaded comment replies, M3 surfaces
- [Moderation Panel](mem://features/moderation-panel) — MOD button in navbar, ban/promote/message via ModerationDialog
- [Manage Videos](mem://features/manage-videos) — /manage/videos page lets users delete or toggle visibility of their own videos
- [News & Download](mem://features/news-and-download) — /news page with comments + video download on Watch & Switch
- [Switch (Shorts)](mem://features/switch-shorts) — Vertical short-video system, /switch feed, /upload/switch, separate switches tables, CSS-only SwitchLogo

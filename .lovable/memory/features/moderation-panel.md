---
name: Moderation Panel
description: MOD button in Navbar opens ModerationDialog for admins/moderators to ban users, promote to moderator, or send moderation messages via notifications
type: feature
---
# Moderation Panel

Two-tier moderator system:
- **Default Mod** (purple badge) — full powers: ban, unban, message, promote/demote Duo Mods. Granted by admin.
- **Duo Mod** (green badge) — limited: ban + message only. Cannot unban or promote. Assigned by Default Mod via `mod_assignments` table.

- Navbar MOD pill shows when user is admin/default_mod/duo_mod.
- `ModerationDialog.tsx` hides unban/promote for Duo Mods.
- `mod_assignments` (duo_mod_id UNIQUE, assigned_by) links each Duo Mod to the Default Mod who created them.
- Trigger `notify_default_mod_on_duo_ban` posts a notification to the assigning Default Mod whenever their Duo Mod bans someone.
- Channel.tsx shows colored role badge next to username.
- Report routing: `ReportVideoDialog` calls `get_report_recipient` RPC (first Duo Mod) then falls back to `get_default_mod_recipient` (Default Mod / admin). Sends notification with type='moderation', link to video.
- Legacy `moderator` role still exists and is treated as Default Mod in the UI.
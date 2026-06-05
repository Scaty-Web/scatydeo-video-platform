---
name: Moderation Panel
description: MOD button in Navbar opens ModerationDialog for admins/moderators to ban users, promote to moderator, or send moderation messages via notifications
type: feature
---
# Moderation Panel

- Trigger: Navbar shows MOD pill when has_role(uid,'admin'|'moderator') is true.
- Component: src/components/ModerationDialog.tsx
- Ban -> banned_users (reason required, banned_by=uid)
- Promote -> user_roles role='moderator' (admin only via RLS)
- Message -> notifications row with type='moderation', title 'Moderasyon Mesajı'
- Notifications RLS policy 'Admins and moderators can send notifications' allows insert when caller is admin/moderator.
- Notifications.tsx renders type='moderation' with shield icon and M3 chip.
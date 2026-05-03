---
name: News & Video Download
description: News page at /news with comments and video download button on Watch & Switch pages
type: feature
---
# Haberler & Video İndirme

## News
- Routes: `/news` (News.tsx)
- Tables: `news` (moderator/admin write, public read of published), `news_comments` (auth users CRUD own; moderator can delete)
- Index page shows a clickable "Haberler" banner above VideoGrid
- Sidebar has Newspaper icon entry

## Video Download
- Helper: `src/lib/download.ts` (`downloadFile`, `safeFilename`, `extFromUrl`)
- Watch page: Download button next to Share/AI Summary
- Switch feed: Download button in right action rail
- Uses fetch+blob then anchor click; falls back to direct anchor on CORS failure

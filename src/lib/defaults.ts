import defaultProfile from "@/assets/default-profile.png";
import defaultBanner from "@/assets/default-banner.png";
import defaultThumbnail from "@/assets/default-thumbnail.png";

export const DEFAULT_AVATAR_URL = defaultProfile;
export const DEFAULT_BANNER_URL = defaultBanner;
export const DEFAULT_THUMBNAIL_URL = defaultThumbnail;

export const getAvatarUrl = (url?: string | null) => url || DEFAULT_AVATAR_URL;
export const getBannerUrl = (url?: string | null) => url || DEFAULT_BANNER_URL;
export const getThumbnailUrl = (url?: string | null) => url || DEFAULT_THUMBNAIL_URL;

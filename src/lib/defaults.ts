import defaultProfile from "@/assets/default-profile.png";
import defaultBanner from "@/assets/default-banner.png";
import defaultThumbnail from "@/assets/default-thumbnail.png";

export const DEFAULT_AVATAR_URL = defaultProfile;
export const DEFAULT_BANNER_URL = defaultBanner;
export const DEFAULT_THUMBNAIL_URL = defaultThumbnail;

const isEmpty = (v?: string | null) =>
  !v || v.trim() === "" || v === "/placeholder.svg" || v === "null" || v === "undefined";

export const getAvatarUrl = (url?: string | null) => (isEmpty(url) ? DEFAULT_AVATAR_URL : url!);
export const getBannerUrl = (url?: string | null) => (isEmpty(url) ? DEFAULT_BANNER_URL : url!);
export const getThumbnailUrl = (url?: string | null) => (isEmpty(url) ? DEFAULT_THUMBNAIL_URL : url!);

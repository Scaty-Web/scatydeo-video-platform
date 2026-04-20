import { cn } from "@/lib/utils";

interface SwitchLogoProps {
  size?: number;
  className?: string;
}

/**
 * CSS-only Scatydeo Switch logo.
 * Vertical capsule (TikTok/Shorts style) with neon purple gradient and play arrow.
 */
const SwitchLogo = ({ size = 24, className }: SwitchLogoProps) => {
  const w = size * 0.6;
  const h = size;
  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: w, height: h }}
    >
      {/* Capsule body with neon gradient */}
      <div
        className="absolute inset-0 rounded-full overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg, hsl(280 100% 50%) 0%, hsl(270 80% 25%) 60%, hsl(0 0% 0%) 100%)",
          boxShadow: "0 0 12px hsl(280 100% 50% / 0.6)",
        }}
      />
      {/* Play arrow */}
      <div
        className="relative z-10"
        style={{
          width: 0,
          height: 0,
          borderLeft: `${size * 0.18}px solid white`,
          borderTop: `${size * 0.13}px solid transparent`,
          borderBottom: `${size * 0.13}px solid transparent`,
          marginLeft: 2,
          filter: "drop-shadow(0 0 3px rgba(255,255,255,0.7))",
        }}
      />
    </div>
  );
};

export default SwitchLogo;

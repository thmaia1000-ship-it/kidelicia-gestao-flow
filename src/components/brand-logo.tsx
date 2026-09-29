import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  subtitle?: string;
  variant?: "badge" | "horizontal" | "clean";
}

export function BrandLogo({
  className,
  size = "md",
  subtitle = "Gestão Comercial",
  variant = "badge",
}: BrandLogoProps) {
  if (variant === "clean") {
    return (
      <div className={cn("inline-flex flex-col", className)}>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-black uppercase tracking-wider text-[#FFEA00]">
            Biscoitos
          </span>
        </div>
        <span className="font-extrabold tracking-tight text-white">Ki Delícia</span>
        {subtitle && (
          <span className="text-[10px] font-medium uppercase tracking-widest text-[#FFEA00]">
            {subtitle}
          </span>
        )}
      </div>
    );
  }

  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
    xl: "px-6 py-3 text-xl",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2.5 rounded-lg border border-[#B5121B] bg-gradient-to-r from-[#ED1C24] via-[#ED1C24] to-[#B5121B] text-white shadow-sm transition-transform select-none",
        sizeClasses[size],
        className,
      )}
    >
      {/* Decorative seal icon */}
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#FFEA00] text-[#202124] shadow-inner font-black text-xs">
        KD
      </div>

      <div className="flex flex-col leading-tight">
        <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#FFEA00]">
          Biscoitos
        </span>
        <span className="font-black tracking-tight text-white drop-shadow-sm font-sans">
          Ki Delícia
        </span>
        {subtitle && (
          <span className="text-[9px] font-semibold text-white/90 tracking-wide">{subtitle}</span>
        )}
      </div>
    </div>
  );
}

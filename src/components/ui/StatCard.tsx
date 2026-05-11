import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
  trend?: { value: number; positive: boolean };
  accentColor?: "blue" | "green" | "red" | "yellow" | "purple";
  className?: string;
}

const ACCENT_STYLES = {
  blue: {
    icon: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    value: "text-white",
  },
  green: {
    icon: "bg-green-500/10 text-green-400 border-green-500/20",
    value: "text-green-400",
  },
  red: {
    icon: "bg-red-500/10 text-red-400 border-red-500/20",
    value: "text-red-400",
  },
  yellow: {
    icon: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    value: "text-yellow-400",
  },
  purple: {
    icon: "bg-brand-500/10 text-brand-400 border-brand-500/20",
    value: "text-brand-400",
  },
};

export function StatCard({
  label,
  value,
  subtext,
  icon,
  trend,
  accentColor = "blue",
  className,
}: StatCardProps) {
  const accent = ACCENT_STYLES[accentColor];

  return (
    <div
      className={cn(
        "glass rounded-xl p-5 flex flex-col gap-4 animate-slide-in",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0",
            accent.icon
          )}
        >
          {icon}
        </div>
        {trend !== undefined && (
          <span
            className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              trend.positive
                ? "bg-green-500/10 text-green-400"
                : "bg-red-500/10 text-red-400"
            )}
          >
            {trend.positive ? "↑" : "↓"} {Math.abs(trend.value)}%
          </span>
        )}
      </div>

      <div>
        <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">
          {label}
        </p>
        <p className={cn("text-3xl font-bold tracking-tight", accent.value)}>
          {value}
        </p>
        {subtext && (
          <p className="text-slate-500 text-xs mt-1">{subtext}</p>
        )}
      </div>
    </div>
  );
}

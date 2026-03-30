"use client";

interface MetricCardProps {
  title: string;
  value: string;
  icon: string;
  color: "orange" | "blue" | "yellow" | "green" | "light";
  small?: boolean;
  subtitle?: string;
}

const colorMap = {
  orange: "border-l-brand-orange-500 bg-gradient-to-br from-brand-orange-100/60 to-white",
  blue: "border-l-brand-blue-700 bg-gradient-to-br from-brand-blue-100/60 to-white",
  yellow: "border-l-brand-yellow-500 bg-gradient-to-br from-yellow-50 to-white",
  green: "border-l-green-500 bg-gradient-to-br from-green-50 to-white",
  light: "border-l-gray-300 bg-white",
};

const iconMap: Record<string, string> = {
  money: "R$",
  users: "👥",
  eye: "👁",
  click: "🖱",
  target: "🎯",
  chart: "📊",
  dollar: "💵",
  trending: "📈",
  tag: "🏷",
  refresh: "🔄",
};

export default function MetricCard({ title, value, icon, color, small, subtitle }: MetricCardProps) {
  return (
    <div className={`rounded-xl border-l-4 card-shadow p-3 sm:p-4 transition-all ${colorMap[color]}`}>
      <div className="flex items-center gap-1.5 mb-0.5 sm:mb-1">
        <span className={small ? "text-sm sm:text-base" : "text-base sm:text-lg"}>{iconMap[icon] ?? icon}</span>
        <span className="text-[9px] sm:text-xs font-medium text-gray-500 uppercase tracking-wide truncate">{title}</span>
      </div>
      <p className={`font-bold text-brand-blue-900 truncate ${small ? "text-sm sm:text-lg" : "text-lg sm:text-2xl"}`}>
        {value}
      </p>
      {subtitle && (
        <p className="text-[9px] sm:text-[10px] text-gray-400 mt-0.5">{subtitle}</p>
      )}
    </div>
  );
}

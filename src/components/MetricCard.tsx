"use client";

interface MetricCardProps {
  title: string;
  value: string;
  icon: string;
  color: "orange" | "blue" | "yellow" | "green" | "light";
  small?: boolean;
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

export default function MetricCard({ title, value, icon, color, small }: MetricCardProps) {
  return (
    <div className={`rounded-xl border-l-4 card-shadow p-4 transition-all hover:scale-[1.02] ${colorMap[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={small ? "text-base" : "text-lg"}>{iconMap[icon] ?? icon}</span>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</span>
      </div>
      <p className={`font-bold text-brand-blue-900 ${small ? "text-lg" : "text-xl sm:text-2xl"}`}>
        {value}
      </p>
    </div>
  );
}

"use client";

interface MetricCardProps {
  title: string;
  value: string;
  icon: string;
  color: "orange" | "blue" | "yellow" | "green" | "light";
  small?: boolean;
}

const colorMap = {
  orange: "border-l-brand-orange-500 bg-brand-orange-100/50",
  blue: "border-l-brand-blue-700 bg-brand-blue-100/50",
  yellow: "border-l-brand-yellow-500 bg-yellow-50",
  green: "border-l-green-500 bg-green-50",
  light: "border-l-gray-300 bg-white",
};

export default function MetricCard({ title, value, icon, color, small }: MetricCardProps) {
  return (
    <div
      className={`rounded-xl border-l-4 card-shadow p-4 transition-all ${colorMap[color]}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className={small ? "text-base" : "text-lg"}>{icon}</span>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {title}
        </span>
      </div>
      <p
        className={`font-bold text-brand-blue-900 ${
          small ? "text-lg" : "text-xl sm:text-2xl"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

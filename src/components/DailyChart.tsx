"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { DailyAggregate } from "@/lib/data";

interface Props {
  data: DailyAggregate[];
}

export default function DailyChart({ data }: Props) {
  const chartData = data.map((d) => ({
    ...d,
    day: new Date(d.day).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
  }));

  if (chartData.length === 0) {
    return <p className="text-gray-400 text-center py-8">Sem dados para o periodo selecionado.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <ComposedChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis dataKey="day" tick={{ fontSize: 12 }} />
        <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB" }}
          formatter={(value: number, name: string) => {
            if (name === "Investimento") return [`R$ ${value.toFixed(2)}`, name];
            return [value.toLocaleString("pt-BR"), name];
          }}
        />
        <Legend />
        <Bar
          yAxisId="left"
          dataKey="impressions"
          name="Impressoes"
          fill="#1B3A5C"
          radius={[4, 4, 0, 0]}
          barSize={32}
        />
        <Bar
          yAxisId="left"
          dataKey="clicks"
          name="Cliques"
          fill="#F7941D"
          radius={[4, 4, 0, 0]}
          barSize={32}
        />
        <Line
          yAxisId="right"
          dataKey="spent"
          name="Investimento"
          stroke="#FFC107"
          strokeWidth={3}
          dot={{ fill: "#FFC107", r: 5 }}
        />
        <Bar
          yAxisId="left"
          dataKey="leads"
          name="Leads"
          fill="#22C55E"
          radius={[4, 4, 0, 0]}
          barSize={32}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

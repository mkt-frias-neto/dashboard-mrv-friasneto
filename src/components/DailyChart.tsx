"use client";

import {
  ResponsiveContainer,
  LineChart,
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
    day: new Date(d.day + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
  }));

  if (chartData.length === 0) {
    return <p className="text-gray-400 text-center py-8">Sem dados para o periodo selecionado.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis dataKey="day" tick={{ fontSize: 12 }} />
        <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", boxShadow: "0 4px 12px rgba(0,0,0,.08)" }}
          formatter={(value: number, name: string) => {
            if (name === "Investimento") return [`R$ ${value.toFixed(2)}`, name];
            return [value.toLocaleString("pt-BR"), name];
          }}
        />
        <Legend />
        <Line
          yAxisId="left"
          dataKey="impressions"
          name="Impressoes"
          stroke="#1B3A5C"
          strokeWidth={3}
          dot={{ fill: "#1B3A5C", r: 5, strokeWidth: 2, stroke: "#fff" }}
          activeDot={{ r: 7 }}
        />
        <Line
          yAxisId="left"
          dataKey="clicks"
          name="Cliques"
          stroke="#F7941D"
          strokeWidth={3}
          dot={{ fill: "#F7941D", r: 5, strokeWidth: 2, stroke: "#fff" }}
          activeDot={{ r: 7 }}
        />
        <Line
          yAxisId="right"
          dataKey="spent"
          name="Investimento"
          stroke="#FFC107"
          strokeWidth={3}
          strokeDasharray="6 3"
          dot={{ fill: "#FFC107", r: 5, strokeWidth: 2, stroke: "#fff" }}
          activeDot={{ r: 7 }}
        />
        <Line
          yAxisId="left"
          dataKey="leads"
          name="Leads"
          stroke="#22C55E"
          strokeWidth={3}
          dot={{ fill: "#22C55E", r: 6, strokeWidth: 2, stroke: "#fff" }}
          activeDot={{ r: 8 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

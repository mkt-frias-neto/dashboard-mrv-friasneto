"use client";

import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface AgeGender {
  age: string;
  gender: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  leads: number;
  ctr: number;
}

interface Placement {
  platform: string;
  placement: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  leads: number;
}

interface Device {
  device: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  leads: number;
}

const COLORS = {
  Feminino: "#E879A0",
  Masculino: "#4A90D9",
  Outros: "#9CA3AF",
};

const PIE_COLORS = ["#1B3A5C", "#F7941D", "#FFC107", "#22C55E", "#8B5CF6", "#EC4899", "#06B6D4", "#F97316", "#6366F1"];

const fmtBRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtNum = (n: number) => n.toLocaleString("pt-BR");
const fmtPct = (n: number) => `${n.toFixed(1)}%`;

export default function DemographicsCharts() {
  const [data, setData] = useState<{
    ageGender: AgeGender[];
    placements: Placement[];
    devices: Device[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/demographics")
      .then((r) => r.json())
      .then((json) => {
        if (json.ageGender) setData(json);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block w-6 h-6 border-3 border-brand-blue-700 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 mt-2 text-xs">Carregando demograficos...</p>
      </div>
    );
  }

  if (!data) return null;

  const { ageGender, placements, devices } = data;

  // --- Age + Gender grouped bar chart data ---
  const ageGroups = Array.from(new Set(ageGender.map((d) => d.age))).filter((a) => a !== "Unknown");
  const ageBarData = ageGroups.map((age) => {
    const fem = ageGender.find((d) => d.age === age && d.gender === "Feminino");
    const masc = ageGender.find((d) => d.age === age && d.gender === "Masculino");
    return {
      age,
      Feminino: fem?.impressions ?? 0,
      Masculino: masc?.impressions ?? 0,
      leadsFem: fem?.leads ?? 0,
      leadsMasc: masc?.leads ?? 0,
      spendFem: fem?.spend ?? 0,
      spendMasc: masc?.spend ?? 0,
    };
  });

  // Gender totals for summary
  const genderTotals = ageGender.reduce(
    (acc, d) => {
      if (d.gender === "Feminino") {
        acc.femImpressions += d.impressions;
        acc.femLeads += d.leads;
        acc.femSpend += d.spend;
      } else if (d.gender === "Masculino") {
        acc.mascImpressions += d.impressions;
        acc.mascLeads += d.leads;
        acc.mascSpend += d.spend;
      }
      return acc;
    },
    { femImpressions: 0, mascImpressions: 0, femLeads: 0, mascLeads: 0, femSpend: 0, mascSpend: 0 }
  );

  const totalImpressions = genderTotals.femImpressions + genderTotals.mascImpressions;

  // --- Placement pie data ---
  const placementPieData = placements
    .filter((p) => p.impressions > 0)
    .sort((a, b) => b.impressions - a.impressions)
    .map((p) => ({
      name: `${p.platform === "instagram" ? "IG" : "FB"} ${p.placement}`,
      value: p.impressions,
      spend: p.spend,
      leads: p.leads,
      clicks: p.clicks,
    }));

  // --- Device data ---
  const totalDeviceImpressions = devices.reduce((s, d) => s + d.impressions, 0);
  const deviceData = devices
    .filter((d) => d.impressions > 0)
    .sort((a, b) => b.impressions - a.impressions)
    .map((d) => ({
      ...d,
      pct: totalDeviceImpressions > 0 ? (d.impressions / totalDeviceImpressions) * 100 : 0,
    }));

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Age + Gender */}
      <div className="bg-white rounded-xl card-shadow p-3 sm:p-6">
        <h2 className="text-base sm:text-lg font-bold text-brand-blue-900 mb-1">Idade & Genero</h2>
        <p className="text-[10px] sm:text-xs text-gray-400 mb-3 sm:mb-4">Distribuicao de impressoes por faixa etaria</p>

        {/* Gender summary pills */}
        <div className="flex gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="flex-1 bg-pink-50 rounded-lg p-2 sm:p-3 text-center">
            <p className="text-[10px] sm:text-xs text-gray-500">Feminino</p>
            <p className="text-sm sm:text-lg font-bold text-pink-600">
              {totalImpressions > 0 ? fmtPct((genderTotals.femImpressions / totalImpressions) * 100) : "0%"}
            </p>
            <p className="text-[9px] sm:text-[10px] text-gray-400">{fmtNum(genderTotals.femLeads)} leads</p>
          </div>
          <div className="flex-1 bg-blue-50 rounded-lg p-2 sm:p-3 text-center">
            <p className="text-[10px] sm:text-xs text-gray-500">Masculino</p>
            <p className="text-sm sm:text-lg font-bold text-blue-600">
              {totalImpressions > 0 ? fmtPct((genderTotals.mascImpressions / totalImpressions) * 100) : "0%"}
            </p>
            <p className="text-[9px] sm:text-[10px] text-gray-400">{fmtNum(genderTotals.mascLeads)} leads</p>
          </div>
        </div>

        <div className="h-[220px] sm:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ageBarData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="age" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12 }}
                formatter={(value: number, name: string) => [fmtNum(value), name]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Feminino" fill={COLORS.Feminino} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Masculino" fill={COLORS.Masculino} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Placement + Device side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Placement */}
        <div className="bg-white rounded-xl card-shadow p-3 sm:p-6">
          <h2 className="text-base sm:text-lg font-bold text-brand-blue-900 mb-1">Posicionamento</h2>
          <p className="text-[10px] sm:text-xs text-gray-400 mb-3 sm:mb-4">Distribuicao por canal</p>

          <div className="h-[220px] sm:h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={placementPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius="80%"
                  innerRadius="45%"
                  paddingAngle={2}
                  label={({ name, percent }) =>
                    percent > 0.05 ? `${name.split(" ").slice(1).join(" ")} ${(percent * 100).toFixed(0)}%` : ""
                  }
                  labelLine={false}
                  style={{ fontSize: 9 }}
                >
                  {placementPieData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 11 }}
                  formatter={(value: number) => [fmtNum(value), "Impressoes"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Placement table */}
          <div className="mt-2 space-y-1.5">
            {placementPieData.slice(0, 5).map((p, i) => {
              const totalPlacementImpressions = placementPieData.reduce((s, pp) => s + pp.value, 0);
              const pct = totalPlacementImpressions > 0 ? (p.value / totalPlacementImpressions) * 100 : 0;
              return (
                <div key={p.name} className="flex items-center gap-2 text-[10px] sm:text-xs">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className="flex-1 truncate text-gray-700">{p.name}</span>
                  <span className="text-gray-500 shrink-0">{fmtPct(pct)}</span>
                  <span className="text-gray-400 shrink-0">{fmtBRL(p.spend)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Device */}
        <div className="bg-white rounded-xl card-shadow p-3 sm:p-6">
          <h2 className="text-base sm:text-lg font-bold text-brand-blue-900 mb-1">Dispositivo</h2>
          <p className="text-[10px] sm:text-xs text-gray-400 mb-3 sm:mb-4">Onde seu publico acessa</p>

          <div className="space-y-3 sm:space-y-4 mt-4">
            {deviceData.map((d, i) => (
              <div key={d.device}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base sm:text-lg">
                      {d.device === "Smartphone" ? "📱" : d.device === "Tablet" ? "📱" : d.device === "Desktop" ? "💻" : "🌐"}
                    </span>
                    <span className="text-xs sm:text-sm font-medium text-gray-700">{d.device}</span>
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-brand-blue-900">{fmtPct(d.pct)}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 sm:h-3">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${d.pct}%`,
                      backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                    }}
                  />
                </div>
                <div className="flex gap-3 mt-1 text-[9px] sm:text-[10px] text-gray-400">
                  <span>{fmtNum(d.impressions)} imp.</span>
                  <span>{fmtNum(d.clicks)} cliques</span>
                  <span>{fmtNum(d.leads)} leads</span>
                  <span>{fmtBRL(d.spend)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

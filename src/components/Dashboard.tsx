"use client";

import { useState, useMemo } from "react";
import {
  getCampaignData,
  aggregateMetrics,
  applyFilters,
  aggregateByDay,
  aggregateByAd,
  getUniqueCampaigns,
  getUniqueAdSets,
  getUniqueAdNames,
  adPreviews,
  type Filters,
} from "@/lib/data";
import MetricCard from "./MetricCard";
import DailyChart from "./DailyChart";
import AdPerformanceCards from "./AdPerformanceCards";
import AdPreviewSection from "./AdPreviewSection";
import FilterBar from "./FilterBar";

const DATE_FILTERS = [
  { label: "Ontem", days: 1 },
  { label: "7 dias", days: 7 },
  { label: "14 dias", days: 14 },
  { label: "30 dias", days: 30 },
  { label: "Total", days: null as number | null },
];

export default function Dashboard() {
  const [filters, setFilters] = useState<Filters>({
    daysBack: null,
    campaign: null,
    adSet: null,
    adName: null,
  });

  const allData = getCampaignData();
  const campaigns = getUniqueCampaigns(allData);
  const adSets = getUniqueAdSets(allData);
  const adNames = getUniqueAdNames(allData);

  const filtered = useMemo(() => applyFilters(allData, filters), [allData, filters]);
  const metrics = useMemo(() => aggregateMetrics(filtered), [filtered]);
  const dailyData = useMemo(() => aggregateByDay(filtered), [filtered]);
  const adData = useMemo(() => aggregateByAd(filtered), [filtered]);

  const formatBRL = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const formatNum = (n: number) => n.toLocaleString("pt-BR");
  const formatDec = (n: number) =>
    n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatPct = (n: number) => `${formatDec(n)}%`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="gradient-header text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img
                src="https://www.friasneto.com.br/imo_arq/empresa_logo/logo-site-imobiliaria.png"
                alt="Frias Neto"
                className="h-8 object-contain brightness-0 invert"
              />
              <div className="w-px h-8 bg-white/30" />
              <img
                src="https://atletico.com.br/wp-content/uploads/2019/10/Logo-Gradiente.png"
                alt="MRV"
                className="h-8 object-contain brightness-0 invert"
              />
            </div>
            <div className="text-right">
              <h1 className="text-lg font-bold tracking-tight">Dashboard Meta Ads</h1>
              <p className="text-xs text-white/70">Campanha Piazza di Viena</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Date Filters */}
        <div className="flex flex-wrap gap-2">
          {DATE_FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => setFilters((prev) => ({ ...prev, daysBack: f.days }))}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filters.daysBack === f.days
                  ? "bg-brand-blue-700 text-white shadow-md"
                  : "bg-white text-brand-blue-700 border border-brand-blue-200 hover:bg-brand-blue-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Campaign / AdSet / Ad Filters */}
        <FilterBar
          campaigns={campaigns}
          adSets={adSets}
          adNames={adNames}
          filters={filters}
          onChange={setFilters}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <MetricCard title="Investimento" value={formatBRL(metrics.totalSpent)} icon="money" color="orange" />
          <MetricCard title="Alcance" value={formatNum(metrics.totalReach)} icon="users" color="blue" />
          <MetricCard title="Impressoes" value={formatNum(metrics.totalImpressions)} icon="eye" color="blue" />
          <MetricCard title="Cliques" value={formatNum(metrics.totalClicks)} icon="click" color="yellow" />
          <MetricCard title="Leads" value={formatNum(metrics.totalLeads)} icon="target" color="green" />
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <MetricCard title="CPM" value={formatBRL(metrics.avgCPM)} icon="chart" color="light" small />
          <MetricCard title="CPC" value={formatBRL(metrics.avgCPC)} icon="dollar" color="light" small />
          <MetricCard title="CTR" value={formatPct(metrics.avgCTR)} icon="trending" color="light" small />
          <MetricCard title="CPL" value={formatBRL(metrics.avgCostPerLead)} icon="tag" color="light" small />
          <MetricCard title="Frequencia" value={formatDec(metrics.avgFrequency)} icon="refresh" color="light" small />
        </div>

        {/* Chart */}
        <div className="bg-white rounded-xl card-shadow p-6">
          <h2 className="text-lg font-bold text-brand-blue-900 mb-4">Desempenho Diario</h2>
          <DailyChart data={dailyData} />
        </div>

        {/* Ad Performance Cards (replaces old detail table) */}
        <div>
          <h2 className="text-lg font-bold text-brand-blue-900 mb-4">Comparativo por Anuncio</h2>
          <AdPerformanceCards data={adData} />
        </div>

        {/* Ad Previews */}
        <div className="bg-white rounded-xl card-shadow p-6">
          <h2 className="text-lg font-bold text-brand-blue-900 mb-4">Pre-visualizacao dos Anuncios</h2>
          <AdPreviewSection previews={adPreviews} adData={adData} />
        </div>
      </main>

      {/* Footer */}
      <footer className="gradient-header text-white/60 text-center py-4 text-xs mt-8">
        Frias Neto Consultoria de Imoveis &bull; MRV &bull; Campanha Meta Ads 2026
      </footer>
    </div>
  );
}

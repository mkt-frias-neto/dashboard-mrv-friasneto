"use client";

import { useState, useMemo, useEffect } from "react";
import {
  aggregateMetrics,
  applyFilters,
  aggregateByDay,
  aggregateByAd,
  getUniqueCampaigns,
  getUniqueAdSets,
  getUniqueAdNames,
  type CampaignRow,
  type Filters,
} from "@/lib/data";
import MetricCard from "./MetricCard";
import DailyChart from "./DailyChart";
import AdPerformanceCards from "./AdPerformanceCards";
import FilterBar from "./FilterBar";
import LeadsCRM from "./LeadsCRM";
import DemographicsCharts from "./DemographicsCharts";

const DATE_PRESETS = [
  { label: "Ontem", days: -1 },
  { label: "7d", days: 7 },
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
  { label: "Total", days: null as number | null },
];

export default function Dashboard() {
  const [allData, setAllData] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<Filters>({
    daysBack: null,
    customStart: null,
    customEnd: null,
    campaign: null,
    adSet: null,
    adName: null,
  });
  const [showCustomDate, setShowCustomDate] = useState(false);

  useEffect(() => {
    fetch("/api/campaign-data")
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setAllData(json.data);
          setUpdatedAt(json.updatedAt ?? null);
        } else {
          setError(json.error ?? "Erro ao carregar dados");
        }
      })
      .catch(() => setError("Erro de conexao"))
      .finally(() => setLoading(false));
  }, []);

  const campaigns = useMemo(() => getUniqueCampaigns(allData), [allData]);
  const adSets = useMemo(() => getUniqueAdSets(allData), [allData]);
  const adNames = useMemo(() => getUniqueAdNames(allData), [allData]);

  const filtered = useMemo(() => applyFilters(allData, filters), [allData, filters]);
  const metrics = useMemo(() => aggregateMetrics(filtered), [filtered]);
  const dailyData = useMemo(() => aggregateByDay(filtered), [filtered]);
  const adData = useMemo(() => aggregateByAd(filtered), [filtered]);

  const isPresetActive = !showCustomDate && filters.customStart === null && filters.customEnd === null;

  const handlePreset = (days: number | null) => {
    setShowCustomDate(false);
    setFilters((prev) => ({ ...prev, daysBack: days, customStart: null, customEnd: null }));
  };

  const handleCustomToggle = () => {
    setShowCustomDate(true);
    setFilters((prev) => ({ ...prev, daysBack: null, customStart: null, customEnd: null }));
  };

  const formatBRL = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const formatNum = (n: number) => n.toLocaleString("pt-BR");
  const formatDec = (n: number) =>
    n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatPct = (n: number) => `${formatDec(n)}%`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header — mobile compact */}
      <header className="gradient-header text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              <img
                src="https://www.friasneto.com.br/imo_arq/empresa_logo/logo-site-imobiliaria.png"
                alt="Frias Neto"
                className="h-6 sm:h-8 object-contain brightness-0 invert"
              />
              <div className="w-px h-6 sm:h-8 bg-white/30" />
              <img
                src="https://atletico.com.br/wp-content/uploads/2019/10/Logo-Gradiente.png"
                alt="MRV"
                className="h-6 sm:h-8 object-contain brightness-0 invert"
              />
            </div>
            <div className="text-right min-w-0">
              <h1 className="text-sm sm:text-lg font-bold tracking-tight whitespace-nowrap">Meta Ads</h1>
              <p className="text-[10px] sm:text-xs text-white/70 truncate">Piazza di Viena</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Loading / Error */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-brand-blue-700 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 mt-3 text-sm">Carregando dados...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
        )}

        {!loading && !error && (
          <>
            {/* Updated at */}
            {updatedAt && (
              <p className="text-[10px] sm:text-[11px] text-gray-400">
                Atualizado: {new Date(updatedAt).toLocaleString("pt-BR")}
              </p>
            )}

            {/* Date Filters — scrollable on mobile */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                {DATE_PRESETS.map((f) => (
                  <button
                    key={f.label}
                    onClick={() => handlePreset(f.days)}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                      isPresetActive && filters.daysBack === f.days
                        ? "bg-brand-blue-700 text-white shadow-md"
                        : "bg-white text-brand-blue-700 border border-brand-blue-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
                <div className="w-px h-6 bg-gray-300 shrink-0" />
                <button
                  onClick={handleCustomToggle}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                    showCustomDate
                      ? "bg-brand-orange-500 text-white shadow-md"
                      : "bg-white text-brand-blue-700 border border-brand-blue-200"
                  }`}
                >
                  Personalizado
                </button>
              </div>

              {showCustomDate && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-white border border-brand-orange-300 rounded-lg px-3 py-2 shadow-sm">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <label className="text-xs text-gray-500 shrink-0">De:</label>
                    <input
                      type="date"
                      value={filters.customStart ?? ""}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, customStart: e.target.value || null, daysBack: null }))
                      }
                      className="text-sm border-none outline-none bg-transparent text-brand-blue-900 w-full"
                    />
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <label className="text-xs text-gray-500 shrink-0">Ate:</label>
                    <input
                      type="date"
                      value={filters.customEnd ?? ""}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, customEnd: e.target.value || null, daysBack: null }))
                      }
                      className="text-sm border-none outline-none bg-transparent text-brand-blue-900 w-full"
                    />
                  </div>
                  {(filters.customStart || filters.customEnd) && (
                    <button
                      onClick={() => setFilters((prev) => ({ ...prev, customStart: null, customEnd: null }))}
                      className="text-xs text-red-500"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Campaign / AdSet / Ad Filters */}
            <FilterBar campaigns={campaigns} adSets={adSets} adNames={adNames} filters={filters} onChange={setFilters} />

            {/* KPI Cards — 2 cols mobile, 5 cols desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              <MetricCard title="Investimento" value={formatBRL(metrics.totalSpent)} icon="money" color="orange" />
              <MetricCard title="Alcance" value={formatNum(metrics.totalReach)} icon="users" color="blue" subtitle="Soma diaria" />
              <MetricCard title="Impressoes" value={formatNum(metrics.totalImpressions)} icon="eye" color="blue" />
              <MetricCard title="Cliques" value={formatNum(metrics.totalClicks)} icon="click" color="yellow" />
              <MetricCard title="Leads" value={formatNum(metrics.totalLeads)} icon="target" color="green" />
            </div>

            {/* Secondary KPIs */}
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
              <MetricCard title="CPM" value={formatBRL(metrics.avgCPM)} icon="chart" color="light" small />
              <MetricCard title="CPC" value={formatBRL(metrics.avgCPC)} icon="dollar" color="light" small />
              <MetricCard title="CTR" value={formatPct(metrics.avgCTR)} icon="trending" color="light" small />
              <MetricCard title="CPL" value={formatBRL(metrics.avgCostPerLead)} icon="tag" color="light" small />
              <MetricCard title="Freq." value={formatDec(metrics.avgFrequency)} icon="refresh" color="light" small />
              <MetricCard title="Views Video" value={formatNum(metrics.totalVideoViews)} icon="play" color="light" small />
            </div>

            {/* Chart */}
            <div className="bg-white rounded-xl card-shadow p-3 sm:p-6">
              <h2 className="text-base sm:text-lg font-bold text-brand-blue-900 mb-3 sm:mb-4">Desempenho Diario</h2>
              <div className="h-[250px] sm:h-[350px]">
                <DailyChart data={dailyData} />
              </div>
            </div>

            {/* Ad Performance Cards */}
            <div>
              <h2 className="text-base sm:text-lg font-bold text-brand-blue-900 mb-3 sm:mb-4">Comparativo por Anuncio</h2>
              <AdPerformanceCards data={adData} />
            </div>

            {/* Demographics */}
            <DemographicsCharts />

            {/* CRM Integration */}
            <LeadsCRM />
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="gradient-header text-white/60 text-center py-3 sm:py-4 text-[10px] sm:text-xs mt-6 sm:mt-8">
        Frias Neto &bull; MRV &bull; Meta Ads 2026
      </footer>
    </div>
  );
}

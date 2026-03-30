"use client";

import type { Filters } from "@/lib/data";

interface Props {
  campaigns: string[];
  adSets: string[];
  adNames: string[];
  filters: Filters;
  onChange: (f: Filters) => void;
}

export default function FilterBar({ campaigns, adSets, adNames, filters, onChange }: Props) {
  const selectClass =
    "px-3 py-2 rounded-lg text-sm border border-gray-200 bg-white text-brand-blue-900 focus:ring-2 focus:ring-brand-orange-500 focus:border-brand-orange-500 outline-none cursor-pointer";

  return (
    <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl card-shadow px-4 py-3">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filtros:</span>

      <select
        className={selectClass}
        value={filters.campaign ?? ""}
        onChange={(e) => onChange({ ...filters, campaign: e.target.value || null })}
      >
        <option value="">Todas as Campanhas</option>
        {campaigns.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <select
        className={selectClass}
        value={filters.adSet ?? ""}
        onChange={(e) => onChange({ ...filters, adSet: e.target.value || null })}
      >
        <option value="">Todos os Conjuntos</option>
        {adSets.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <select
        className={selectClass}
        value={filters.adName ?? ""}
        onChange={(e) => onChange({ ...filters, adName: e.target.value || null })}
      >
        <option value="">Todos os Anuncios</option>
        {adNames.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>

      {(filters.campaign || filters.adSet || filters.adName) && (
        <button
          onClick={() => onChange({ ...filters, campaign: null, adSet: null, adName: null })}
          className="px-3 py-2 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}

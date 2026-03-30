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
    "px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm border border-gray-200 bg-white text-brand-blue-900 focus:ring-2 focus:ring-brand-orange-500 outline-none w-full sm:w-auto";

  return (
    <div className="bg-white rounded-xl card-shadow px-3 sm:px-4 py-2.5 sm:py-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <span className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0">Filtros:</span>

        <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-3 flex-1">
          <select
            className={selectClass}
            value={filters.campaign ?? ""}
            onChange={(e) => onChange({ ...filters, campaign: e.target.value || null })}
          >
            <option value="">Campanhas</option>
            {campaigns.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            className={selectClass}
            value={filters.adSet ?? ""}
            onChange={(e) => onChange({ ...filters, adSet: e.target.value || null })}
          >
            <option value="">Conjuntos</option>
            {adSets.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            className={selectClass}
            value={filters.adName ?? ""}
            onChange={(e) => onChange({ ...filters, adName: e.target.value || null })}
          >
            <option value="">Anuncios</option>
            {adNames.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          {(filters.campaign || filters.adSet || filters.adName) && (
            <button
              onClick={() => onChange({ ...filters, campaign: null, adSet: null, adName: null })}
              className="px-2 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium bg-red-50 text-red-600 col-span-2 sm:col-span-1"
            >
              Limpar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

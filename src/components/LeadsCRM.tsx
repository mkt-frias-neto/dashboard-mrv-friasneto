"use client";

import { useState, useEffect, useMemo } from "react";

interface CrmData {
  situacao: string;
  nome: string;
  idResponsavel: string;
  idOrdemAtendimento: string;
  operacao: string;
  usuarioStatus: string;
  motivoFechamento: string;
}

interface LeadItem {
  id: string;
  createdTime: string;
  adName: string;
  campaignName: string;
  platform: string;
  firstName: string;
  email: string;
  phoneFormatted: string;
  whatsapp: string;
  crm: CrmData | null;
  motivoNome: string;
  closureType: string;
}

interface Summary {
  total: number;
  aberta: number;
  fechada: number;
}

function getStatusConfig(lead: LeadItem) {
  if (lead.crm?.situacao === "ABERTA") return { label: "Em Atendimento", bg: "bg-blue-100", text: "text-blue-800", key: "aberta" };
  if (lead.crm?.situacao === "FECHADA" || lead.closureType === "fechada") return { label: "Fechada", bg: "bg-gray-200", text: "text-gray-700", key: "fechada" };
  return { label: "Nao encontrado", bg: "bg-yellow-100", text: "text-yellow-800", key: "unknown" };
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getLeadDate(iso: string): string {
  try {
    const match = iso.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : "";
  } catch {
    return "";
  }
}

const DATE_PRESETS = [
  { label: "Ontem", days: -1 },
  { label: "7d", days: 7 },
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
  { label: "Total", days: null as number | null },
];

export default function LeadsCRM() {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  // Filters
  const [daysBack, setDaysBack] = useState<number | null>(null); // null = total
  const [customStart, setCustomStart] = useState<string | null>(null);
  const [customEnd, setCustomEnd] = useState<string | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null); // null = all

  useEffect(() => {
    fetch("/api/leads-crm")
      .then((r) => r.json())
      .then((json) => {
        if (json.leads) {
          setLeads(json.leads);
          setUpdatedAt(json.updatedAt ?? null);
        } else {
          setError(json.error ?? "Erro ao carregar leads");
        }
      })
      .catch(() => setError("Erro de conexao"))
      .finally(() => setLoading(false));
  }, []);

  // Filtered leads
  const filtered = useMemo(() => {
    let result = leads;

    // Date filter
    if (customStart || customEnd) {
      result = result.filter((l) => {
        const d = getLeadDate(l.createdTime);
        if (customStart && d < customStart) return false;
        if (customEnd && d > customEnd) return false;
        return true;
      });
    } else if (daysBack !== null) {
      // Anchor periods to the latest lead date (matches Meta's period windows,
      // which end on the last day with data — not "today"). This keeps the
      // leads funnel in sync with the campaign KPIs.
      const latestDay = leads.reduce((max, l) => {
        const d = getLeadDate(l.createdTime);
        return d > max ? d : max;
      }, "");
      const endStr = latestDay || toDateStr(new Date());

      if (daysBack === -1) {
        // "Ontem" — the latest day with leads
        result = result.filter((l) => getLeadDate(l.createdTime) === endStr);
      } else {
        const endDate = new Date(endStr + "T12:00:00");
        const startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - daysBack + 1);
        const startStr = toDateStr(startDate);
        result = result.filter((l) => {
          const d = getLeadDate(l.createdTime);
          return d >= startStr && d <= endStr;
        });
      }
    }

    // Status filter
    if (statusFilter) {
      result = result.filter((l) => getStatusConfig(l).key === statusFilter);
    }

    return result;
  }, [leads, daysBack, customStart, customEnd, statusFilter]);

  // Dynamic summary based on filtered leads
  const summary = useMemo<Summary>(() => {
    const total = filtered.length;
    const aberta = filtered.filter((l) => l.crm?.situacao === "ABERTA").length;
    const fechada = filtered.filter((l) => getStatusConfig(l).key === "fechada").length;
    return { total, aberta, fechada };
  }, [filtered]);

  const isPresetActive = !showCustom && customStart === null && customEnd === null;

  const handlePreset = (days: number | null) => {
    setShowCustom(false);
    setDaysBack(days);
    setCustomStart(null);
    setCustomEnd(null);
  };

  const handleCustomToggle = () => {
    setShowCustom(true);
    setDaysBack(null);
    setCustomStart(null);
    setCustomEnd(null);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl card-shadow p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-bold text-brand-blue-900 mb-4">Funil de Leads</h2>
        <div className="text-center py-8">
          <div className="inline-block w-8 h-8 border-4 border-brand-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 mt-3 text-xs sm:text-sm">Consultando CRM...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl card-shadow p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-bold text-brand-blue-900 mb-4">Funil de Leads</h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-xs sm:text-sm">{error}</div>
      </div>
    );
  }

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    } catch {
      return iso;
    }
  };

  // Exporta os leads filtrados para CSV (abre direto no Excel/Sheets)
  const exportToCsv = () => {
    if (filtered.length === 0) return;
    const escape = (v: string | number) => {
      const s = String(v ?? "").replace(/"/g, '""');
      return /[",\n;]/.test(s) ? `"${s}"` : s;
    };
    const headers = [
      "Data Criacao",
      "Nome",
      "Email",
      "Telefone",
      "WhatsApp",
      "Anuncio",
      "Campanha",
      "Plataforma",
      "Status",
      "Corretor",
      "ID Atendimento KSI",
    ];
    const rows = filtered.map((lead) => {
      const status = getStatusConfig(lead).label;
      const corretor = lead.crm?.nome ?? "";
      const ordemId = lead.crm?.idOrdemAtendimento ?? "";
      const dataIso = lead.createdTime
        ? new Date(lead.createdTime).toLocaleString("pt-BR")
        : "";
      return [
        dataIso,
        lead.firstName,
        lead.email,
        lead.phoneFormatted,
        lead.whatsapp ?? "",
        lead.adName ?? "",
        lead.campaignName ?? "",
        lead.platform ?? "",
        status,
        corretor,
        ordemId,
      ].map(escape).join(",");
    });
    // BOM UTF-8 pra acentuacao aparecer correta no Excel
    const csv = "﻿" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    a.href = url;
    a.download = `leads-crm-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Date Filters for Leads */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {DATE_PRESETS.map((f) => (
            <button
              key={f.label}
              onClick={() => handlePreset(f.days)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                isPresetActive && daysBack === f.days
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
              showCustom
                ? "bg-brand-orange-500 text-white shadow-md"
                : "bg-white text-brand-blue-700 border border-brand-blue-200"
            }`}
          >
            Personalizado
          </button>
        </div>

        {showCustom && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-white border border-brand-orange-300 rounded-lg px-3 py-2 shadow-sm">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-xs text-gray-500 shrink-0">De:</label>
              <input
                type="date"
                value={customStart ?? ""}
                onChange={(e) => { setCustomStart(e.target.value || null); setDaysBack(null); }}
                className="text-sm border-none outline-none bg-transparent text-brand-blue-900 w-full"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-xs text-gray-500 shrink-0">Ate:</label>
              <input
                type="date"
                value={customEnd ?? ""}
                onChange={(e) => { setCustomEnd(e.target.value || null); setDaysBack(null); }}
                className="text-sm border-none outline-none bg-transparent text-brand-blue-900 w-full"
              />
            </div>
            {(customStart || customEnd) && (
              <button
                onClick={() => { setCustomStart(null); setCustomEnd(null); }}
                className="text-xs text-red-500"
              >
                Limpar
              </button>
            )}
          </div>
        )}
      </div>

      {/* Funnel Cards — clickable as status filter */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <FunnelCard
          label="Total"
          value={summary.total}
          color="bg-brand-blue-700"
          icon="🎯"
          active={statusFilter === null}
          onClick={() => setStatusFilter(null)}
        />
        <FunnelCard
          label="Em Atendimento"
          value={summary.aberta}
          color="bg-blue-500"
          icon="📋"
          pct={summary.total > 0 ? (summary.aberta / summary.total) * 100 : 0}
          active={statusFilter === "aberta"}
          onClick={() => setStatusFilter(statusFilter === "aberta" ? null : "aberta")}
        />
        <FunnelCard
          label="Fechada"
          value={summary.fechada}
          color="bg-gray-500"
          icon="✔️"
          pct={summary.total > 0 ? (summary.fechada / summary.total) * 100 : 0}
          active={statusFilter === "fechada"}
          onClick={() => setStatusFilter(statusFilter === "fechada" ? null : "fechada")}
        />
      </div>

      {/* Leads — Desktop: table, Mobile: cards */}
      <div className="bg-white rounded-xl card-shadow p-3 sm:p-6">
        <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4 flex-wrap">
          <h2 className="text-base sm:text-lg font-bold text-brand-blue-900">
            Leads x CRM
            {statusFilter && (
              <span className="ml-2 text-xs font-normal text-gray-400">
                ({statusFilter === "aberta" ? "Em Atendimento" : "Fechada"})
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={exportToCsv}
              disabled={filtered.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-orange-500 hover:bg-brand-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-medium transition-colors shadow-sm"
              title="Exportar leads filtrados para CSV (abre no Excel/Sheets)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 sm:w-4 sm:h-4">
                <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v8.69l2.22-2.22a.75.75 0 111.06 1.06l-3.5 3.5a.75.75 0 01-1.06 0l-3.5-3.5a.75.75 0 111.06-1.06l2.22 2.22V3.75A.75.75 0 0110 3zM3.75 16a.75.75 0 01.75.75V18h11v-1.25a.75.75 0 011.5 0v1.75a.75.75 0 01-.75.75H4a.75.75 0 01-.75-.75v-1.75a.75.75 0 01.75-.75z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">Exportar CSV</span>
              <span className="sm:hidden">Exportar</span>
              <span className="text-[10px] sm:text-xs opacity-80">({filtered.length})</span>
            </button>
            {updatedAt && (
              <span className="text-[9px] sm:text-[10px] text-gray-400 whitespace-nowrap">
                {fmtDate(updatedAt)}
              </span>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-gray-400 text-center py-8 text-sm">Nenhum lead encontrado para o periodo selecionado.</p>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="sm:hidden space-y-3">
              {filtered.map((lead) => {
                const st = getStatusConfig(lead);
                return (
                  <div key={lead.id} className="border border-gray-100 rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-brand-blue-900 text-sm">{lead.firstName}</p>
                        <p className="text-[10px] text-gray-400">{fmtDate(lead.createdTime)}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${st.bg} ${st.text}`}>
                        {st.label}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-600 space-y-0.5">
                      <p>{lead.email}</p>
                      <p className="text-gray-400">{lead.phoneFormatted}</p>
                    </div>
                    <div className="flex items-center justify-between text-[10px] pt-1 border-t border-gray-50">
                      <span className="text-gray-400">{lead.adName}</span>
                      {lead.crm?.nome && (
                        <span className="text-brand-blue-700 font-medium truncate ml-2">{lead.crm.nome.split(" ").slice(0, 2).join(" ")}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-brand-blue-900 text-white text-xs">
                    <th className="text-left px-3 py-2.5 rounded-tl-lg">Data</th>
                    <th className="text-left px-3 py-2.5">Nome</th>
                    <th className="text-left px-3 py-2.5">Contato</th>
                    <th className="text-left px-3 py-2.5">Anuncio</th>
                    <th className="text-center px-3 py-2.5">Status</th>
                    <th className="text-left px-3 py-2.5 rounded-tr-lg">Responsavel</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lead, i) => {
                    const st = getStatusConfig(lead);
                    return (
                      <tr
                        key={lead.id}
                        className={`border-b border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-brand-orange-100/30 transition-colors`}
                      >
                        <td className="px-3 py-2.5 whitespace-nowrap text-xs">{fmtDate(lead.createdTime)}</td>
                        <td className="px-3 py-2.5 font-medium text-brand-blue-900">{lead.firstName}</td>
                        <td className="px-3 py-2.5">
                          <div className="text-xs">{lead.email}</div>
                          <div className="text-[10px] text-gray-400">{lead.phoneFormatted}</div>
                        </td>
                        <td className="px-3 py-2.5 text-xs">{lead.adName}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${st.bg} ${st.text}`}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-xs">
                          {lead.crm?.nome ?? <span className="text-gray-300">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FunnelCard({ label, value, color, icon, pct, active, onClick }: {
  label: string; value: number; color: string; icon: string; pct?: number; active?: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`${color} rounded-lg sm:rounded-xl p-2.5 sm:p-4 text-white text-left transition-all ${
        active ? "ring-2 ring-offset-2 ring-brand-orange-500 scale-[1.02]" : "opacity-80 hover:opacity-100"
      }`}
    >
      <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
        <span className="text-sm sm:text-lg">{icon}</span>
        <span className="text-[8px] sm:text-xs font-medium uppercase opacity-80 truncate">{label}</span>
      </div>
      <p className="text-xl sm:text-2xl font-bold">{value}</p>
      {pct !== undefined && (
        <p className="text-[8px] sm:text-[10px] opacity-70">{pct.toFixed(0)}%</p>
      )}
    </button>
  );
}

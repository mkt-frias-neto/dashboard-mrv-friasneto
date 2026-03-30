"use client";

import { useState, useEffect } from "react";

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
  lost: number;
  venda: number;
}

function getStatusConfig(lead: LeadItem) {
  if (lead.crm?.situacao === "ABERTA") return { label: "Em Atendimento", bg: "bg-blue-100", text: "text-blue-800" };
  if (lead.closureType === "venda") return { label: "Venda", bg: "bg-green-100", text: "text-green-800" };
  if (lead.closureType === "lost") return { label: "Lost", bg: "bg-red-100", text: "text-red-700" };
  if (lead.crm?.situacao === "FECHADA") return { label: "Lost", bg: "bg-red-100", text: "text-red-700" };
  return { label: "Nao encontrado", bg: "bg-yellow-100", text: "text-yellow-800" };
}

export default function LeadsCRM() {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/leads-crm")
      .then((r) => r.json())
      .then((json) => {
        if (json.leads) {
          setLeads(json.leads);
          setSummary(json.summary);
          setUpdatedAt(json.updatedAt ?? null);
        } else {
          setError(json.error ?? "Erro ao carregar leads");
        }
      })
      .catch(() => setError("Erro de conexao"))
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Funnel Cards */}
      {summary && (
        <div className="grid grid-cols-4 gap-2 sm:gap-4">
          <FunnelCard label="Total" value={summary.total} color="bg-brand-blue-700" icon="🎯" />
          <FunnelCard
            label="Atendimento"
            value={summary.aberta}
            color="bg-blue-500"
            icon="📋"
            pct={summary.total > 0 ? (summary.aberta / summary.total) * 100 : 0}
          />
          <FunnelCard
            label="Lost"
            value={summary.lost}
            color="bg-red-500"
            icon="❌"
            pct={summary.total > 0 ? (summary.lost / summary.total) * 100 : 0}
          />
          <FunnelCard
            label="Venda"
            value={summary.venda}
            color="bg-green-500"
            icon="🏆"
            pct={summary.total > 0 ? (summary.venda / summary.total) * 100 : 0}
          />
        </div>
      )}

      {/* Leads — Desktop: table, Mobile: cards */}
      <div className="bg-white rounded-xl card-shadow p-3 sm:p-6">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-base sm:text-lg font-bold text-brand-blue-900">Leads x CRM</h2>
          {updatedAt && (
            <span className="text-[9px] sm:text-[10px] text-gray-400">
              {fmtDate(updatedAt)}
            </span>
          )}
        </div>

        {/* Mobile Cards */}
        <div className="sm:hidden space-y-3">
          {leads.map((lead) => {
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
                <th className="text-left px-3 py-2.5">Motivo</th>
                <th className="text-left px-3 py-2.5 rounded-tr-lg">Responsavel</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead, i) => {
                const st = getStatusConfig(lead);
                const isClosed = lead.crm?.situacao === "FECHADA";
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
                      {isClosed && lead.motivoNome ? (
                        <span className="text-gray-700">{lead.motivoNome}</span>
                      ) : isClosed ? (
                        <span className="text-gray-400 italic">Nao informado</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
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
      </div>
    </div>
  );
}

function FunnelCard({ label, value, color, icon, pct }: {
  label: string; value: number; color: string; icon: string; pct?: number;
}) {
  return (
    <div className={`${color} rounded-lg sm:rounded-xl p-2.5 sm:p-4 text-white`}>
      <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
        <span className="text-sm sm:text-lg">{icon}</span>
        <span className="text-[8px] sm:text-xs font-medium uppercase opacity-80 truncate">{label}</span>
      </div>
      <p className="text-xl sm:text-2xl font-bold">{value}</p>
      {pct !== undefined && (
        <p className="text-[8px] sm:text-[10px] opacity-70">{pct.toFixed(0)}%</p>
      )}
    </div>
  );
}

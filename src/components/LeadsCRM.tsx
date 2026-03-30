"use client";

import { useState, useEffect } from "react";

interface CrmData {
  situacao: string;
  nome: string;
  idResponsavel: string;
  idOrdemAtendimento: string;
  operacao: string;
  usuarioStatus: string;
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
}

interface Summary {
  total: number;
  withCrm: number;
  aberta: number;
  fechada: number;
  semCrm: number;
}

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  ABERTA: { label: "Em Atendimento", bg: "bg-blue-100", text: "text-blue-800" },
  FECHADA: { label: "Fechado", bg: "bg-green-100", text: "text-green-800" },
  DESCONHECIDO: { label: "Desconhecido", bg: "bg-gray-100", text: "text-gray-600" },
};

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
      <div className="bg-white rounded-xl card-shadow p-6">
        <h2 className="text-lg font-bold text-brand-blue-900 mb-4">Funil de Leads - CRM</h2>
        <div className="text-center py-8">
          <div className="inline-block w-8 h-8 border-4 border-brand-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 mt-3 text-sm">Consultando CRM KSI...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl card-shadow p-6">
        <h2 className="text-lg font-bold text-brand-blue-900 mb-4">Funil de Leads - CRM</h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
      </div>
    );
  }

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6">
      {/* Funnel Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <FunnelCard
            label="Total Leads"
            value={summary.total}
            color="bg-brand-blue-700"
            icon="🎯"
          />
          <FunnelCard
            label="Em Atendimento"
            value={summary.aberta}
            color="bg-blue-500"
            icon="📋"
            pct={summary.total > 0 ? (summary.aberta / summary.total) * 100 : 0}
          />
          <FunnelCard
            label="Fechados"
            value={summary.fechada}
            color="bg-green-500"
            icon="✅"
            pct={summary.total > 0 ? (summary.fechada / summary.total) * 100 : 0}
          />
          <FunnelCard
            label="Sem registro CRM"
            value={summary.semCrm}
            color="bg-gray-400"
            icon="❓"
            pct={summary.total > 0 ? (summary.semCrm / summary.total) * 100 : 0}
          />
        </div>
      )}

      {/* Leads Table */}
      <div className="bg-white rounded-xl card-shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-brand-blue-900">Leads x CRM</h2>
          {updatedAt && (
            <span className="text-[10px] text-gray-400">
              Atualizado: {fmtDate(updatedAt)}
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-blue-900 text-white text-xs">
                <th className="text-left px-3 py-2.5 rounded-tl-lg">Data</th>
                <th className="text-left px-3 py-2.5">Nome</th>
                <th className="text-left px-3 py-2.5">Contato</th>
                <th className="text-left px-3 py-2.5">Anuncio</th>
                <th className="text-center px-3 py-2.5">Plataforma</th>
                <th className="text-center px-3 py-2.5">Status CRM</th>
                <th className="text-left px-3 py-2.5 rounded-tr-lg">Responsavel</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead, i) => {
                const st = statusConfig[lead.crm?.situacao ?? ""] ?? {
                  label: "Nao encontrado",
                  bg: "bg-yellow-100",
                  text: "text-yellow-800",
                };
                return (
                  <tr
                    key={lead.id}
                    className={`border-b border-gray-100 ${
                      i % 2 === 0 ? "bg-white" : "bg-gray-50"
                    } hover:bg-brand-orange-100/30 transition-colors`}
                  >
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs">
                      {fmtDate(lead.createdTime)}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-brand-blue-900">
                      {lead.firstName}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-xs">{lead.email}</div>
                      <div className="text-[10px] text-gray-400">{lead.phoneFormatted}</div>
                    </td>
                    <td className="px-3 py-2.5 text-xs">{lead.adName}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 uppercase font-medium">
                        {lead.platform}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-1 rounded-full ${st.bg} ${st.text}`}
                      >
                        {st.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      {lead.crm?.nome ?? (
                        <span className="text-gray-300">—</span>
                      )}
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

function FunnelCard({
  label,
  value,
  color,
  icon,
  pct,
}: {
  label: string;
  value: number;
  color: string;
  icon: string;
  pct?: number;
}) {
  return (
    <div className={`${color} rounded-xl p-4 text-white`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-xs font-medium uppercase opacity-80">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {pct !== undefined && (
        <p className="text-[10px] opacity-70 mt-0.5">{pct.toFixed(1)}% do total</p>
      )}
    </div>
  );
}

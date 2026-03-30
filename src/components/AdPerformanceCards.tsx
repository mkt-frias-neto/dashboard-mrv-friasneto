"use client";

import type { AdAggregate } from "@/lib/data";

interface Props {
  data: AdAggregate[];
}

const adColors: Record<string, { bg: string; border: string; accent: string }> = {
  "Arte MRV": { bg: "from-brand-blue-100/40 to-white", border: "border-brand-blue-700", accent: "text-brand-blue-700" },
  "Vídeos MRV": { bg: "from-brand-orange-100/40 to-white", border: "border-brand-orange-500", accent: "text-brand-orange-500" },
};

const defaultColor = { bg: "from-gray-100 to-white", border: "border-gray-400", accent: "text-gray-600" };

export default function AdPerformanceCards({ data }: Props) {
  const fmtBRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmt = (n: number) => n.toLocaleString("pt-BR");
  const fmtPct = (n: number) => `${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

  if (data.length === 0) {
    return <p className="text-gray-400 text-center py-8">Sem dados para o periodo selecionado.</p>;
  }

  // Find best performer for each metric
  const bestCTR = data.reduce((a, b) => (a.ctr > b.ctr ? a : b)).adName;
  const bestCPC = data.filter((d) => d.cpc > 0).reduce((a, b) => (a.cpc < b.cpc ? a : b), data[0])?.adName;
  const bestLeads = data.reduce((a, b) => (a.leads > b.leads ? a : b)).adName;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {data.map((ad) => {
        const colors = adColors[ad.adName] ?? defaultColor;
        return (
          <div
            key={ad.adName}
            className={`rounded-xl border-l-4 ${colors.border} bg-gradient-to-br ${colors.bg} card-shadow p-6`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-bold ${colors.accent}`}>{ad.adName}</h3>
              <div className="flex gap-1">
                {bestCTR === ad.adName && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Melhor CTR</span>
                )}
                {bestCPC === ad.adName && ad.cpc > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Melhor CPC</span>
                )}
                {bestLeads === ad.adName && ad.leads > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Mais Leads</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Stat label="Alcance" value={fmt(ad.reach)} />
              <Stat label="Impressoes" value={fmt(ad.impressions)} />
              <Stat label="Cliques" value={fmt(ad.clicks)} />
              <Stat label="CTR" value={fmtPct(ad.ctr)} highlight={bestCTR === ad.adName} />
              <Stat label="CPC" value={ad.cpc > 0 ? fmtBRL(ad.cpc) : "-"} highlight={bestCPC === ad.adName && ad.cpc > 0} />
              <Stat label="Investimento" value={fmtBRL(ad.spent)} />
              <Stat label="Leads" value={String(ad.leads)} highlight={bestLeads === ad.adName && ad.leads > 0} />
              <Stat label="CPL" value={ad.cpl > 0 ? fmtBRL(ad.cpl) : "-"} />
              <Stat
                label="Conv. Rate"
                value={ad.clicks > 0 ? fmtPct((ad.leads / ad.clicks) * 100) : "-"}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-bold ${highlight ? "text-green-600" : "text-brand-blue-900"}`}>
        {value}
      </p>
    </div>
  );
}

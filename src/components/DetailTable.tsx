"use client";

import type { CampaignRow } from "@/lib/data";

interface Props {
  data: CampaignRow[];
}

export default function DetailTable({ data }: Props) {
  const fmt = (n: number) => n.toLocaleString("pt-BR");
  const fmtBRL = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtPct = (n: number) =>
    n > 0
      ? `${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
      : "-";
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR");

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-brand-blue-900 text-white text-xs">
            <th className="text-left px-3 py-2 rounded-tl-lg">Data</th>
            <th className="text-left px-3 py-2">Anuncio</th>
            <th className="text-right px-3 py-2">Alcance</th>
            <th className="text-right px-3 py-2">Impressoes</th>
            <th className="text-right px-3 py-2">Freq.</th>
            <th className="text-right px-3 py-2">Invest.</th>
            <th className="text-right px-3 py-2">CPM</th>
            <th className="text-right px-3 py-2">Cliques</th>
            <th className="text-right px-3 py-2">CPC</th>
            <th className="text-right px-3 py-2">CTR</th>
            <th className="text-right px-3 py-2">CPL</th>
            <th className="text-right px-3 py-2 rounded-tr-lg">Leads</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <tr
              key={`${r.day}-${r.adName}`}
              className={`border-b border-gray-100 ${
                i % 2 === 0 ? "bg-white" : "bg-gray-50"
              } hover:bg-brand-orange-100/30 transition-colors`}
            >
              <td className="px-3 py-2 whitespace-nowrap">{fmtDate(r.day)}</td>
              <td className="px-3 py-2 font-medium text-brand-blue-900">{r.adName}</td>
              <td className="text-right px-3 py-2">{fmt(r.reach)}</td>
              <td className="text-right px-3 py-2">{fmt(r.impressions)}</td>
              <td className="text-right px-3 py-2">{r.frequency.toFixed(2)}</td>
              <td className="text-right px-3 py-2">{fmtBRL(r.amountSpent)}</td>
              <td className="text-right px-3 py-2">{fmtBRL(r.cpm)}</td>
              <td className="text-right px-3 py-2">{r.linkClicks || "-"}</td>
              <td className="text-right px-3 py-2">{r.cpc > 0 ? fmtBRL(r.cpc) : "-"}</td>
              <td className="text-right px-3 py-2">{fmtPct(r.ctr)}</td>
              <td className="text-right px-3 py-2">
                {r.costPerLead > 0 ? fmtBRL(r.costPerLead) : "-"}
              </td>
              <td className="text-right px-3 py-2">
                {r.leads > 0 ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {r.leads}
                  </span>
                ) : (
                  "-"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

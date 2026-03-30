"use client";

import type { AdAggregate } from "@/lib/data";

interface Props {
  data: AdAggregate[];
}

export default function AdTable({ data }: Props) {
  const fmt = (n: number) => n.toLocaleString("pt-BR");
  const fmtBRL = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtPct = (n: number) =>
    `${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-brand-blue-700 text-white">
            <th className="text-left px-4 py-3 rounded-tl-lg">Anuncio</th>
            <th className="text-right px-4 py-3">Alcance</th>
            <th className="text-right px-4 py-3">Impressoes</th>
            <th className="text-right px-4 py-3">Cliques</th>
            <th className="text-right px-4 py-3">CTR</th>
            <th className="text-right px-4 py-3">Investimento</th>
            <th className="text-right px-4 py-3 rounded-tr-lg">Leads</th>
          </tr>
        </thead>
        <tbody>
          {data.map((ad, i) => (
            <tr
              key={ad.adName}
              className={`border-b border-gray-100 ${
                i % 2 === 0 ? "bg-white" : "bg-gray-50"
              } hover:bg-brand-blue-50 transition-colors`}
            >
              <td className="px-4 py-3 font-medium text-brand-blue-900">{ad.adName}</td>
              <td className="text-right px-4 py-3">{fmt(ad.reach)}</td>
              <td className="text-right px-4 py-3">{fmt(ad.impressions)}</td>
              <td className="text-right px-4 py-3">{fmt(ad.clicks)}</td>
              <td className="text-right px-4 py-3">{fmtPct(ad.ctr)}</td>
              <td className="text-right px-4 py-3 font-medium">{fmtBRL(ad.spent)}</td>
              <td className="text-right px-4 py-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {ad.leads}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

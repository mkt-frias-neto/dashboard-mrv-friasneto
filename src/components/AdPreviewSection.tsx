"use client";

import type { AdPreview, AdAggregate } from "@/lib/data";

interface Props {
  previews: AdPreview[];
  adData: AdAggregate[];
}

export default function AdPreviewSection({ previews, adData }: Props) {
  const fmtBRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmt = (n: number) => n.toLocaleString("pt-BR");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {previews.map((preview) => {
        const stats = adData.find((a) => a.adName === preview.adName);
        return (
          <div key={preview.adName} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
            {/* Preview area */}
            <div className="bg-gray-100 aspect-[4/3] flex items-center justify-center relative">
              {preview.thumbnailUrl ? (
                <img
                  src={preview.thumbnailUrl}
                  alt={preview.adName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-8">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-200 flex items-center justify-center">
                    {preview.type === "video" ? (
                      <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    ) : (
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeWidth={2} />
                        <circle cx="8.5" cy="8.5" r="1.5" strokeWidth={2} />
                        <path d="M21 15l-5-5L5 21" strokeWidth={2} />
                      </svg>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-500">Adicione a URL do criativo</p>
                  <p className="text-xs text-gray-400 mt-1">em src/lib/data.ts &rarr; adPreviews</p>
                </div>
              )}
              {/* Type badge */}
              <span className={`absolute top-3 left-3 px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                preview.type === "video"
                  ? "bg-red-500 text-white"
                  : "bg-brand-blue-700 text-white"
              }`}>
                {preview.type === "video" ? "Video" : "Imagem"}
              </span>
            </div>

            {/* Info */}
            <div className="p-4">
              <h3 className="font-bold text-brand-blue-900 mb-1">{preview.adName}</h3>
              <p className="text-xs text-gray-500 mb-3">{preview.description}</p>

              {stats && (
                <div className="grid grid-cols-4 gap-2 pt-3 border-t border-gray-100">
                  <MiniStat label="Cliques" value={fmt(stats.clicks)} />
                  <MiniStat label="Leads" value={String(stats.leads)} />
                  <MiniStat label="CTR" value={`${stats.ctr.toFixed(2)}%`} />
                  <MiniStat label="Invest." value={fmtBRL(stats.spent)} />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[9px] font-medium text-gray-400 uppercase">{label}</p>
      <p className="text-xs font-bold text-brand-blue-900">{value}</p>
    </div>
  );
}

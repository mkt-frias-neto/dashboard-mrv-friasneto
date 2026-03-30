"use client";

import { useEffect } from "react";
import type { AdPreview, AdAggregate } from "@/lib/data";

interface Props {
  previews: AdPreview[];
  adData: AdAggregate[];
}

export default function AdPreviewSection({ previews, adData }: Props) {
  const fmtBRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmt = (n: number) => n.toLocaleString("pt-BR");

  // Load Facebook SDK for embeds
  useEffect(() => {
    if (typeof window !== "undefined" && !(window as any).FB) {
      const script = document.createElement("script");
      script.src = "https://connect.facebook.net/pt_BR/sdk.js#xfbml=1&version=v21.0";
      script.async = true;
      script.defer = true;
      script.crossOrigin = "anonymous";
      document.body.appendChild(script);

      script.onload = () => {
        if ((window as any).FB) {
          (window as any).FB.XFBML.parse();
        }
      };
    } else if ((window as any).FB) {
      (window as any).FB.XFBML.parse();
    }
  }, []);

  return (
    <>
      <div id="fb-root"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {previews.map((preview) => {
          const stats = adData.find((a) => a.adName === preview.adName);
          const embedUrl = `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(preview.facebookPostUrl)}&show_text=true&width=500`;

          return (
            <div key={preview.adName} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow bg-white">
              {/* Header */}
              <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-brand-blue-900">{preview.adName}</h3>
                  <p className="text-xs text-gray-500">{preview.description}</p>
                </div>
                <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                  preview.type === "video"
                    ? "bg-red-500 text-white"
                    : "bg-brand-blue-700 text-white"
                }`}>
                  {preview.type === "video" ? "Video" : "Imagem"}
                </span>
              </div>

              {/* Facebook Embed */}
              <div className="px-4 py-2 flex justify-center">
                <iframe
                  src={embedUrl}
                  width="500"
                  height="600"
                  style={{ border: "none", overflow: "hidden", maxWidth: "100%" }}
                  scrolling="no"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                  allowFullScreen
                ></iframe>
              </div>

              {/* Stats footer */}
              {stats && (
                <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                  <div className="grid grid-cols-4 gap-2">
                    <MiniStat label="Cliques" value={fmt(stats.clicks)} />
                    <MiniStat label="Leads" value={String(stats.leads)} />
                    <MiniStat label="CTR" value={`${stats.ctr.toFixed(2)}%`} />
                    <MiniStat label="Invest." value={fmtBRL(stats.spent)} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
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

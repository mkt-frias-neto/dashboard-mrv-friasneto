import { NextResponse } from "next/server";
// Server-only: this file holds the lead sheet IDs. Never import it from a
// client component, or the IDs end up in the public JS bundle.
import leadSources from "@/data/lead-sources.json";

export const revalidate = 14400;

const SHEET_ID = "1HrzuyyCeJhN4NH3aQAiv1vJDhaBa4sL2Gnh3TNw0Rh4";
const ANUNCIOS_GID = "2048619975";
const ANUNCIOS_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${ANUNCIOS_GID}`;

// Resumo — period totals (7d/14d/30d) summed across every campaign in the account
const RESUMO_GID = "1969949138";
const RESUMO_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${RESUMO_GID}`;

function leadsCsvUrl(sheetId: string, gid: string | null): string {
  const base = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
  return gid ? `${base}&gid=${gid}` : base;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

// Parse Brazilian number: "3.890" → 3890, "R$ 46,96" → 46.96, "0,41%" → 0.41
function parseNum(val: string): number {
  if (!val || val.trim() === "" || val === "-") return 0;
  const cleaned = val.replace(/^R\$\s*/, "").replace(/%$/, "").trim();
  // Brazilian: dots are thousands, comma is decimal
  const normalized = cleaned.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(normalized);
  return isNaN(n) ? 0 : n;
}

interface LeadCounts {
  // "day|adId" -> leads. Keyed by ad ID, not ad name: the same ad name runs
  // in more than one ad set, and a name key counted those leads twice.
  counts: Record<string, number>;
  // Campaigns whose lead sheet loaded. Others fall back to Meta's own count.
  loadedCampaigns: Set<string>;
}

async function fetchLeadCounts(): Promise<LeadCounts> {
  const counts: Record<string, number> = {};
  const loadedCampaigns = new Set<string>();

  await Promise.all(
    leadSources.map(async (source) => {
      try {
        const res = await fetch(leadsCsvUrl(source.sheetId, source.gid), {
          cache: "no-store",
          headers: { "User-Agent": "Mozilla/5.0" },
        });
        if (!res.ok) return;

        const lines = (await res.text()).split("\n").filter((l) => l.trim() !== "");
        if (lines.length < 2) return;

        const headers = parseCsvLine(lines[0]);
        const adIdIdx = headers.indexOf("ad_id");
        const createdIdx = headers.indexOf("created_time");
        if (adIdIdx === -1 || createdIdx === -1) return;

        for (let i = 1; i < lines.length; i++) {
          if (lines[i].includes("<test lead:")) continue; // Meta's form test tool
          const cols = parseCsvLine(lines[i]);
          const adId = (cols[adIdIdx] ?? "").replace(/^ag:/, "");
          const dateMatch = (cols[createdIdx] ?? "").match(/^(\d{4}-\d{2}-\d{2})/);
          if (!dateMatch || !adId) continue;
          const key = `${dateMatch[1]}|${adId}`;
          counts[key] = (counts[key] ?? 0) + 1;
        }
        loadedCampaigns.add(source.campaign);
      } catch {
        // leave this campaign out of loadedCampaigns
      }
    })
  );

  return { counts, loadedCampaigns };
}

// Fetch ALL metrics from Resumo sheet (matrix: rows=metrics, cols=7d/14d/30d)
interface PeriodMetrics {
  spent: number;
  impressions: number;
  reach: number;
  frequency: number;
  clicks: number;
  ctr: number;
  cpm: number;
  cpc: number;
  leads: number;
  costPerLead: number;
  videoViews: number;
  messages: number;
}

type ResumoData = Record<string, PeriodMetrics>;
type PeriodWindow = { start: string; end: string };
type PeriodWindows = Record<string, PeriodWindow | null>;

interface Resumo {
  // Every campaign together. null when the sheet could not be read, so the
  // dashboard sums the daily rows instead.
  metrics: ResumoData | null;
  // The same totals for each campaign on its own, keyed by campaign name
  byCampaign: Record<string, ResumoData>;
  // The exact dates each period covers, as Meta reported them
  periods: PeriodWindows;
}

// "01/10/2026 → 07/10/2026" -> { start: "2026-10-01", end: "2026-10-07" }
function parsePeriod(cell: string): PeriodWindow | null {
  const m = cell.match(/(\d{2})\/(\d{2})\/(\d{4})\D+(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  return { start: `${m[3]}-${m[2]}-${m[1]}`, end: `${m[6]}-${m[5]}-${m[4]}` };
}

async function fetchResumo(): Promise<Resumo> {
  const emptyMetrics = (): PeriodMetrics => ({
    spent: 0, impressions: 0, reach: 0, frequency: 0,
    clicks: 0, ctr: 0, cpm: 0, cpc: 0,
    leads: 0, costPerLead: 0, videoViews: 0, messages: 0,
  });
  const newBlock = (): ResumoData => ({ "7": emptyMetrics(), "14": emptyMetrics(), "30": emptyMetrics() });
  const periods: PeriodWindows = { "7": null, "14": null, "30": null };
  const unavailable: Resumo = { metrics: null, byCampaign: {}, periods };

  try {
    const res = await fetch(RESUMO_URL, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return unavailable;
    const text = await res.text();
    const lines = text.split("\n").filter((l) => l.trim() !== "");
    if (lines.length < 2) return unavailable;

    // Structure: col 0 = metric label, col 1 = 7d, col 2 = 14d, col 3 = 30d
    // Map label prefixes to our metric keys
    const labelMap: Record<string, keyof PeriodMetrics> = {
      "Investimento": "spent",
      "Impressões": "impressions",
      "Alcance": "reach",
      "Frequência": "frequency",
      "Cliques no Link": "clicks",
      "CTR": "ctr",
      "CPM": "cpm",
      "CPC": "cpc",
      "Resultados": "leads",
      "Custo/Resultado": "costPerLead",
      "Videoviews": "videoViews",
      "Conversas WhatsApp": "messages",
    };

    // The sheet opens with the totals of every campaign, then repeats the
    // same metric rows once per campaign. Each block starts with a header row
    // "<campaign>,Últimos 7 dias,Últimos 14 dias,Últimos 30 dias"; the totals
    // header has an empty first cell. Rows are filed under the block they sit
    // in, otherwise the last campaign would overwrite the totals.
    const total = newBlock();
    const byCampaign: Record<string, ResumoData> = {};
    let block = total;

    for (const line of lines) {
      const cols = parseCsvLine(line);
      const label = (cols[0] ?? "").trim();

      if (label && (cols[1] ?? "").startsWith("Últimos")) {
        const campaign = label.replace(/^[^A-Za-zÀ-ÿ0-9]+/, ""); // drop the leading icon
        block = byCampaign[campaign] = newBlock();
        continue;
      }

      if (label.startsWith("Período")) {
        periods["7"] = parsePeriod(cols[1] ?? "");
        periods["14"] = parsePeriod(cols[2] ?? "");
        periods["30"] = parsePeriod(cols[3] ?? "");
        continue;
      }

      for (const [prefix, key] of Object.entries(labelMap)) {
        if (label.startsWith(prefix)) {
          block["7"][key] = parseNum(cols[1] ?? "");
          block["14"][key] = parseNum(cols[2] ?? "");
          block["30"][key] = parseNum(cols[3] ?? "");
          break;
        }
      }
    }

    return { metrics: total, byCampaign, periods };
  } catch {
    return unavailable;
  }
}

export async function GET() {
  try {
    const [csvRes, leadCounts, resumo] = await Promise.all([
      fetch(ANUNCIOS_URL, {
        cache: "no-store",
        headers: { "User-Agent": "Mozilla/5.0" },
      }),
      fetchLeadCounts(),
      fetchResumo(),
    ]);

    if (!csvRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch spreadsheet", status: csvRes.status },
        { status: 502 }
      );
    }

    const text = await csvRes.text();
    const lines = text.split("\n").filter((l) => l.trim() !== "");

    if (lines.length < 2) {
      return NextResponse.json({ data: [] });
    }

    const headers = parseCsvLine(lines[0]);
    const col = (name: string) => headers.indexOf(name);

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const f = parseCsvLine(lines[i]);

      const campaignName = f[col("Campanha")] ?? "";
      const adSetName = f[col("Conjunto")] ?? "";
      const adName = f[col("Anúncio")] ?? "";
      const day = (f[col("Data Início")] ?? "").replace(/\r/g, "");
      const amountSpent = parseNum(f[col("Investimento (R$)")] ?? "");
      const impressions = parseNum(f[col("Impressões")] ?? "");
      const reach = parseNum(f[col("Alcance")] ?? "");
      const frequency = parseNum(f[col("Frequência")] ?? "");
      const linkClicks = parseNum(f[col("Cliques no Link")] ?? "");
      const ctr = parseNum(f[col("CTR Total (%)")] ?? "");
      const cpc = parseNum(f[col("CPC (R$)")] ?? "");
      const cpm = parseNum(f[col("CPM (R$)")] ?? "");
      const videoViews = parseNum(f[col("Videoviews (3s)")] ?? "");
      const pageViews = parseNum(f[col("Views de Página")] ?? "");
      const messages = parseNum(f[col("Conversas WhatsApp (7d)")] ?? "");

      // Real lead count from the campaign's lead sheet. If that sheet did not
      // load (or the campaign has none), use Meta's form-lead count for the row.
      const adId = f[col("ID Anúncio")] ?? "";
      const leads = leadCounts.loadedCampaigns.has(campaignName)
        ? (leadCounts.counts[`${day}|${adId}`] ?? 0)
        : parseNum(f[col("Leads (Formulário)")] ?? "");
      const costPerLead = leads > 0 ? amountSpent / leads : 0;

      rows.push({
        campaignName,
        adSetName,
        adName,
        day,
        amountSpent,
        impressions,
        reach,
        frequency,
        linkClicks,
        ctr,
        cpc,
        cpm,
        costPerLead,
        leads,
        videoViews,
        pageViews,
        messages,
      });
    }

    return NextResponse.json(
      {
        data: rows,
        resumoMetrics: resumo.metrics,
        resumoByCampaign: resumo.byCampaign,
        periods: resumo.periods,
        updatedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "s-maxage=1800, stale-while-revalidate=3600",
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

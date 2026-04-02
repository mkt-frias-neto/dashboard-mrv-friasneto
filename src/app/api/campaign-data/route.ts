import { NextResponse } from "next/server";

// Cache for 4 hours — refreshed by GitHub Actions deploy at 7h, 11h, 13h, 17h
export const revalidate = 14400;

const SHEET_ID = "1Sxtnbol0IO_RghkhhJyDS831C448PObzbDW7N3VxHlc";
const ANUNCIOS_GID = "387511299";
const ANUNCIOS_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${ANUNCIOS_GID}`;

// Real leads sheet for accurate lead counts
const LEADS_SHEET_ID = "1SbIcGGizozINPj9RLU1t359DbOY0YO5goVJcBO3xk5Q";
const LEADS_CSV_URL = `https://docs.google.com/spreadsheets/d/${LEADS_SHEET_ID}/export?format=csv`;

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

// Count leads per day+ad from the real leads spreadsheet
async function fetchLeadCounts(): Promise<Record<string, number>> {
  try {
    const res = await fetch(LEADS_CSV_URL, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return {};

    const text = await res.text();
    const lines = text.split("\n").filter((l) => l.trim() !== "");
    if (lines.length < 2) return {};

    const headers = parseCsvLine(lines[0]);
    const adNameIdx = headers.findIndex((h) => h === "ad_name");
    const createdIdx = headers.findIndex((h) => h === "created_time");

    if (adNameIdx === -1 || createdIdx === -1) return {};

    const counts: Record<string, number> = {};
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      const adName = cols[adNameIdx] ?? "";
      const createdTime = cols[createdIdx] ?? "";
      const dateMatch = createdTime.match(/^(\d{4}-\d{2}-\d{2})/);
      if (!dateMatch || !adName) continue;
      const day = dateMatch[1];
      const key = `${day}|${adName}`;
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  } catch {
    return {};
  }
}

export async function GET() {
  try {
    const [csvRes, leadCounts] = await Promise.all([
      fetch(ANUNCIOS_URL, {
        cache: "no-store",
        headers: { "User-Agent": "Mozilla/5.0" },
      }),
      fetchLeadCounts(),
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

    const hasLeadData = Object.keys(leadCounts).length > 0;

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
      const linkClicks = parseNum(f[col("Cliques")] ?? "");
      const ctr = parseNum(f[col("CTR (%)")] ?? "");
      const cpc = parseNum(f[col("CPC (R$)")] ?? "");
      const cpm = parseNum(f[col("CPM (R$)")] ?? "");
      const videoViews = parseNum(f[col("Views Vídeo")] ?? "");
      const pageViews = parseNum(f[col("Views Página")] ?? "");
      const messages = parseNum(f[col("Mensagens")] ?? "");

      // Use real lead count from leads spreadsheet
      const leadKey = `${day}|${adName}`;
      const leads = hasLeadData ? (leadCounts[leadKey] ?? 0) : parseNum(f[col("Resultados")] ?? "");
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
      { data: rows, updatedAt: new Date().toISOString() },
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

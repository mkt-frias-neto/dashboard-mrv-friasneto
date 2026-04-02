import { NextResponse } from "next/server";

// Cache for 4 hours — refreshed by GitHub Actions deploy at 7h, 11h, 13h, 17h
export const revalidate = 14400;

const CAMPAIGN_SHEET_ID = "1OxCJuvQ4SXjteAAn3lS8JE4BAn12mg0X-DvX1o7hUi8";
const CAMPAIGN_CSV_URL = `https://docs.google.com/spreadsheets/d/${CAMPAIGN_SHEET_ID}/export?format=csv`;

const LEADS_SHEET_ID = "1SbIcGGizozINPj9RLU1t359DbOY0YO5goVJcBO3xk5Q";
const LEADS_CSV_URL = `https://docs.google.com/spreadsheets/d/${LEADS_SHEET_ID}/export?format=csv`;

function parseNum(val: string): number {
  if (!val || val.trim() === "") return 0;
  return parseFloat(val.replace(/\./g, "").replace(",", "."));
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
      // Extract date (YYYY-MM-DD) from created_time, using local BRT time
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
    // Fetch campaign metrics and real lead counts in parallel
    const [campaignRes, leadCounts] = await Promise.all([
      fetch(CAMPAIGN_CSV_URL, {
        cache: "no-store",
        headers: { "User-Agent": "Mozilla/5.0" },
      }),
      fetchLeadCounts(),
    ]);

    if (!campaignRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch spreadsheet", status: campaignRes.status },
        { status: 502 }
      );
    }

    const text = await campaignRes.text();
    const lines = text.split("\n").filter((l) => l.trim() !== "");

    if (lines.length < 2) {
      return NextResponse.json({ data: [] });
    }

    const hasLeadData = Object.keys(leadCounts).length > 0;

    // Skip header row
    const rows = lines.slice(1).map((line) => {
      const fields = parseCsvLine(line);

      const adName = fields[13] ?? "";
      const day = (fields[14] ?? "").replace(/\r/g, "");

      // Use real lead count from leads spreadsheet instead of campaign data
      const leadKey = `${day}|${adName}`;
      const realLeads = hasLeadData ? (leadCounts[leadKey] ?? 0) : parseNum(fields[9] ?? "");
      const amountSpent = parseNum(fields[3] ?? "");

      return {
        reach: parseNum(fields[0] ?? ""),
        impressions: parseNum(fields[1] ?? ""),
        frequency: parseNum(fields[2] ?? ""),
        amountSpent,
        cpm: parseNum(fields[4] ?? ""),
        linkClicks: parseNum(fields[5] ?? ""),
        cpc: parseNum(fields[6] ?? ""),
        ctr: parseNum(fields[7] ?? ""),
        costPerLead: realLeads > 0 ? amountSpent / realLeads : 0,
        leads: realLeads,
        campaignName: fields[11] ?? "",
        adSetName: fields[12] ?? "",
        adName,
        day,
      };
    });

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

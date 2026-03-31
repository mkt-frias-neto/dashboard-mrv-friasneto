import { NextResponse } from "next/server";

// Cache for 4 hours — refreshed by GitHub Actions deploy at 7h, 11h, 13h, 17h
export const revalidate = 14400;

const SHEET_ID = "1OxCJuvQ4SXjteAAn3lS8JE4BAn12mg0X-DvX1o7hUi8";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

function parseNum(val: string): number {
  if (!val || val.trim() === "") return 0;
  return parseFloat(val.replace(/\./g, "").replace(",", "."));
}

export async function GET() {
  try {
    const res = await fetch(CSV_URL, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch spreadsheet", status: res.status },
        { status: 502 }
      );
    }

    const text = await res.text();
    const lines = text.split("\n").filter((l) => l.trim() !== "");

    if (lines.length < 2) {
      return NextResponse.json({ data: [] });
    }

    // Skip header row
    const rows = lines.slice(1).map((line) => {
      // Parse CSV respecting quoted fields
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

      return {
        reach: parseNum(fields[0] ?? ""),
        impressions: parseNum(fields[1] ?? ""),
        frequency: parseNum(fields[2] ?? ""),
        amountSpent: parseNum(fields[3] ?? ""),
        cpm: parseNum(fields[4] ?? ""),
        linkClicks: parseNum(fields[5] ?? ""),
        cpc: parseNum(fields[6] ?? ""),
        ctr: parseNum(fields[7] ?? ""),
        costPerLead: parseNum(fields[8] ?? ""),
        leads: parseNum(fields[9] ?? ""),
        campaignName: fields[11] ?? "",
        adSetName: fields[12] ?? "",
        adName: fields[13] ?? "",
        day: (fields[14] ?? "").replace(/\r/g, ""),
      };
    });

    // Fix: planilha mostra 4 leads no dia 28 Arte MRV, mas o correto sao 2.
    for (const row of rows) {
      if (row.day === "2026-03-28" && row.adName === "Arte MRV") {
        row.leads = 2;
        if (row.amountSpent > 0) {
          row.costPerLead = row.amountSpent / 2;
        }
      }
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

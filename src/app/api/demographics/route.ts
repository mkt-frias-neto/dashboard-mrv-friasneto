import { NextResponse } from "next/server";

export const revalidate = 14400;

const SHEET_ID = "1HrzuyyCeJhN4NH3aQAiv1vJDhaBa4sL2Gnh3TNw0Rh4";
const AGE_GENDER_GID = "1410057629";
const PLACEMENT_GID = "788755556";
const DEVICE_GID = "1115433612";

function csvUrl(gid: string) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
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

function parseNum(val: string): number {
  if (!val || val.trim() === "" || val === "-") return 0;
  const cleaned = val.replace(/^R\$\s*/, "").replace(/%$/, "").trim();
  const normalized = cleaned.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(normalized);
  return isNaN(n) ? 0 : n;
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split("\n").filter((l) => l.trim() !== "");
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map(parseCsvLine);
  return { headers, rows };
}

export async function GET() {
  try {
    const [ageRes, placementRes, deviceRes] = await Promise.all([
      fetch(csvUrl(AGE_GENDER_GID), { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" } }),
      fetch(csvUrl(PLACEMENT_GID), { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" } }),
      fetch(csvUrl(DEVICE_GID), { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" } }),
    ]);

    // Age + Gender
    const ageGender: Array<{
      age: string;
      gender: string;
      spend: number;
      impressions: number;
      reach: number;
      clicks: number;
      leads: number;
      ctr: number;
    }> = [];
    if (ageRes.ok) {
      const { headers, rows } = parseCsv(await ageRes.text());
      const col = (n: string) => headers.indexOf(n);
      for (const f of rows) {
        const age = f[col("Faixa Etária")] ?? "";
        const genderRaw = (f[col("Gênero")] ?? "").toLowerCase();
        const gender =
          genderRaw === "female" ? "Feminino" :
          genderRaw === "male" ? "Masculino" : "Outros";
        ageGender.push({
          age,
          gender,
          spend: parseNum(f[col("Investimento (R$)")] ?? ""),
          impressions: parseNum(f[col("Impressões")] ?? ""),
          reach: parseNum(f[col("Alcance")] ?? ""),
          clicks: parseNum(f[col("Cliques (Total)")] ?? ""),
          leads: parseNum(f[col("Leads (Total)")] ?? ""),
          ctr: parseNum(f[col("CTR (%)")] ?? ""),
        });
      }
    }

    // Placement
    const placements: Array<{
      platform: string;
      placement: string;
      spend: number;
      impressions: number;
      reach: number;
      clicks: number;
      leads: number;
    }> = [];
    if (placementRes.ok) {
      const { headers, rows } = parseCsv(await placementRes.text());
      const col = (n: string) => headers.indexOf(n);
      for (const f of rows) {
        placements.push({
          platform: f[col("Plataforma")] ?? "",
          placement: (f[col("Posicionamento")] ?? "").replace(/_/g, " "),
          spend: parseNum(f[col("Investimento (R$)")] ?? ""),
          impressions: parseNum(f[col("Impressões")] ?? ""),
          reach: parseNum(f[col("Alcance")] ?? ""),
          clicks: parseNum(f[col("Cliques no Link")] ?? ""),
          leads: parseNum(f[col("Leads (Total)")] ?? ""),
        });
      }
    }

    // Device
    const devices: Array<{
      device: string;
      spend: number;
      impressions: number;
      reach: number;
      clicks: number;
      leads: number;
    }> = [];
    if (deviceRes.ok) {
      const { headers, rows } = parseCsv(await deviceRes.text());
      const col = (n: string) => headers.indexOf(n);

      // Aggregate by device category (rows may have device+platform combos)
      const deviceMap: Record<string, { device: string; spend: number; impressions: number; reach: number; clicks: number; leads: number }> = {};
      for (const f of rows) {
        const deviceRaw = (f[col("Dispositivo")] ?? "").toLowerCase().trim();
        // Group into friendly categories
        let device: string;
        if (deviceRaw.includes("smartphone") || deviceRaw === "iphone") {
          device = "Smartphone";
        } else if (deviceRaw.includes("tablet") || deviceRaw === "ipad") {
          device = "Tablet";
        } else if (deviceRaw === "desktop") {
          device = "Desktop";
        } else {
          device = deviceRaw || "Outros";
        }
        if (!deviceMap[device]) {
          deviceMap[device] = { device, spend: 0, impressions: 0, reach: 0, clicks: 0, leads: 0 };
        }
        deviceMap[device].spend += parseNum(f[col("Investimento (R$)")] ?? "");
        deviceMap[device].impressions += parseNum(f[col("Impressões")] ?? "");
        deviceMap[device].reach += parseNum(f[col("Alcance")] ?? "");
        deviceMap[device].clicks += parseNum(f[col("Cliques no Link")] ?? "");
        deviceMap[device].leads += parseNum(f[col("Leads (Total)")] ?? "");
      }
      devices.push(...Object.values(deviceMap));
    }

    return NextResponse.json({
      ageGender,
      placements,
      devices,
      updatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Unknown error" }, { status: 500 });
  }
}

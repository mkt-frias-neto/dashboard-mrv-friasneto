import { NextResponse } from "next/server";

export const revalidate = 14400;

const SHEET_ID = "1Sxtnbol0IO_RghkhhJyDS831C448PObzbDW7N3VxHlc";
const AGE_GENDER_GID = "870638133";
const PLACEMENT_GID = "2003961843";
const DEVICE_GID = "592989396";

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
        const age = f[col("Idade")] ?? "";
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
          clicks: parseNum(f[col("Cliques")] ?? ""),
          leads: parseNum(f[col("Resultados")] ?? ""),
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
          clicks: parseNum(f[col("Cliques")] ?? ""),
          leads: parseNum(f[col("Resultados")] ?? ""),
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
      for (const f of rows) {
        const deviceRaw = (f[col("Dispositivo")] ?? "").toLowerCase();
        const device =
          deviceRaw === "mobile_app" ? "App Mobile" :
          deviceRaw === "mobile_web" ? "Web Mobile" :
          deviceRaw === "desktop" ? "Desktop" : deviceRaw;
        devices.push({
          device,
          spend: parseNum(f[col("Investimento (R$)")] ?? ""),
          impressions: parseNum(f[col("Impressões")] ?? ""),
          reach: parseNum(f[col("Alcance")] ?? ""),
          clicks: parseNum(f[col("Cliques")] ?? ""),
          leads: parseNum(f[col("Resultados")] ?? ""),
        });
      }
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

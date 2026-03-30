import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const LEADS_SHEET_ID = "1SbIcGGizozINPj9RLU1t359DbOY0YO5goVJcBO3xk5Q";
const LEADS_CSV_URL = `https://docs.google.com/spreadsheets/d/${LEADS_SHEET_ID}/export?format=csv`;

const KSI_BASE = "https://www.friasneto.com.br/kurole_include/api/webservice/escopos/";
const KSI_SCOPE_ID = "68";
const KSI_TOKEN = "252c72ea3daa906ce07f3619c5eca804";

// ---------- Helpers ----------

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

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  const local = digits.startsWith("55") ? digits.slice(2) : digits;
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return raw;
}

function cleanEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

// Title Case: "JOÃO DA SILVA" or "ᴰᵃⁱᵃⁿᵉ" → "Daiane"
function toTitleCase(name: string): string {
  // NFKD decomposes compatibility chars (superscripts → normal letters)
  // then NFC recomposes accented chars
  const normalized = name.normalize("NFKD").normalize("NFC");
  // Keep only basic latin, accented latin, spaces, hyphens, apostrophes
  const cleaned = normalized
    .replace(/[^a-zA-ZÀ-ÿ\s'-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return name.trim();
  const lower = cleaned;

  const smallWords = new Set(["de", "da", "do", "dos", "das", "e"]);
  return lower
    .toLowerCase()
    .split(/\s+/)
    .map((word, i) => {
      if (i > 0 && smallWords.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

// ---------- Interfaces ----------

interface LeadRow {
  id: string;
  createdTime: string;
  adName: string;
  adSetName: string;
  campaignName: string;
  formName: string;
  platform: string;
  whatsapp: string;
  firstName: string;
  email: string;
  phoneRaw: string;
  phoneFormatted: string;
  idKsi: string;
  leadStatus: string;
}

interface CrmStatus {
  situacao: string;
  nome: string;
  idResponsavel: string;
  idOrdemAtendimento: string;
  operacao: string;
  usuarioStatus: string;
  motivoFechamento: string;
}

// ---------- KSI API ----------

async function ksiFetch(params: Record<string, string>): Promise<any> {
  try {
    const url = new URL(KSI_BASE);
    url.searchParams.set("id", KSI_SCOPE_ID);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${KSI_TOKEN}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return Array.isArray(json) ? json[0] : json;
  } catch {
    return null;
  }
}

// Fetch closure reasons list (cached per request)
let closureReasonsCache: Record<string, string> | null = null;

async function getClosureReasons(): Promise<Record<string, string>> {
  if (closureReasonsCache) return closureReasonsCache;

  const operacoes = ["V", "E", "L"];
  const map: Record<string, string> = {};

  for (const op of operacoes) {
    const result = await ksiFetch({
      ws_destino: "ORDEM_ATENDIMENTO_FECHAMENTO_MOTIVOS",
      oa_operacao: op,
    });
    if (result?.sucesso === "1" && result.dados) {
      for (const d of result.dados) {
        map[d.id] = d.nome;
      }
    }
  }

  closureReasonsCache = map;
  return map;
}

// Pick best order from multiple results:
// 1. Prefer ABERTA with highest ID (most recent open order)
// 2. If no ABERTA, pick FECHADA with highest ID (most recent closed)
function pickBestOrder(dados: any[]): any | null {
  if (!dados || dados.length === 0) return null;
  if (dados.length === 1) return dados[0];

  // Sort by id_ordem_atendimento descending (highest = most recent)
  const sorted = [...dados].sort((a, b) => {
    const idA = parseInt(a.id_ordem_atendimento ?? "0", 10);
    const idB = parseInt(b.id_ordem_atendimento ?? "0", 10);
    return idB - idA;
  });

  // Prefer the most recent ABERTA
  const aberta = sorted.find(
    (d) => (d.situcao ?? d.situacao ?? "").toUpperCase() === "ABERTA"
  );
  if (aberta) return aberta;

  // Otherwise most recent FECHADA
  return sorted[0];
}

function toCrmStatus(d: any): CrmStatus {
  return {
    situacao: d.situcao ?? d.situacao ?? "DESCONHECIDO",
    nome: d.nome ?? "",
    idResponsavel: d.id_responsavel ?? "",
    idOrdemAtendimento: d.id_ordem_atendimento ?? "",
    operacao: d.operacao ?? "",
    usuarioStatus: d.usuario_status ?? "",
    motivoFechamento: d.motivo_fechamento ?? d.id_motivo_fechamento ?? "",
  };
}

// Query KSI by a single param, returns all dados found
async function fetchKsiOrders(
  searchParam: string,
  searchValue: string,
  onlyOpen: boolean
): Promise<any[]> {
  const item = await ksiFetch({
    ws_destino: "ORDEM_ATENDIMENTO_RESPONSAVEIS",
    [searchParam]: searchValue,
    oa_flag_aberta: onlyOpen ? "1" : "0",
  });
  if (item?.sucesso === "1" && item.dados?.length > 0) {
    return item.dados;
  }
  return [];
}

// Combined query: search by email AND phone, merge all results, pick the best
async function queryKsiCombined(
  email: string,
  phone: string
): Promise<CrmStatus | null> {
  // Step 1: search ABERTA by email and phone in parallel
  const [openByEmail, openByPhone] = await Promise.all([
    email ? fetchKsiOrders("oa_email", email, true) : Promise.resolve([]),
    phone ? fetchKsiOrders("oa_telefone", phone, true) : Promise.resolve([]),
  ]);

  // Merge and deduplicate by order ID
  const openAll = deduplicateOrders([...openByEmail, ...openByPhone]);

  if (openAll.length > 0) {
    const best = pickBestOrder(openAll);
    if (best) return toCrmStatus(best);
  }

  // Step 2: no open orders found — search ALL by email and phone
  const [allByEmail, allByPhone] = await Promise.all([
    email ? fetchKsiOrders("oa_email", email, false) : Promise.resolve([]),
    phone ? fetchKsiOrders("oa_telefone", phone, false) : Promise.resolve([]),
  ]);

  const allOrders = deduplicateOrders([...allByEmail, ...allByPhone]);

  if (allOrders.length > 0) {
    const best = pickBestOrder(allOrders);
    if (best) return toCrmStatus(best);
  }

  return null;
}

// Remove duplicate orders by id_ordem_atendimento
function deduplicateOrders(orders: any[]): any[] {
  const seen = new Set<string>();
  return orders.filter((o) => {
    const id = o.id_ordem_atendimento ?? "";
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

// ---------- Main Handler ----------

export async function GET() {
  try {
    // Reset cache per request
    closureReasonsCache = null;

    // 1. Fetch leads + closure reasons in parallel
    const [csvRes, closureReasons] = await Promise.all([
      fetch(LEADS_CSV_URL, { headers: { "User-Agent": "Mozilla/5.0" } }),
      getClosureReasons(),
    ]);

    if (!csvRes.ok) {
      return NextResponse.json({ error: "Failed to fetch leads sheet" }, { status: 502 });
    }

    const text = await csvRes.text();
    const lines = text.split("\n").filter((l) => l.trim() !== "");
    if (lines.length < 2) {
      return NextResponse.json({ leads: [], summary: {} });
    }

    const headers = parseCsvLine(lines[0]);
    const colIndex = (name: string) => headers.findIndex((h) => h === name);

    const leads: LeadRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      leads.push({
        id: cols[colIndex("id")] ?? "",
        createdTime: cols[colIndex("created_time")] ?? "",
        adName: cols[colIndex("ad_name")] ?? "",
        adSetName: cols[colIndex("adset_name")] ?? "",
        campaignName: cols[colIndex("campaign_name")] ?? "",
        formName: cols[colIndex("form_name")] ?? "",
        platform: cols[colIndex("platform")] ?? "",
        whatsapp: cols[colIndex("qual_o_seu_whatsapp?")] ?? "",
        firstName: toTitleCase(cols[colIndex("first_name")] ?? ""),
        email: cleanEmail(cols[colIndex("email")] ?? ""),
        phoneRaw: cols[colIndex("phone_number")] ?? "",
        phoneFormatted: formatPhone(cols[colIndex("phone_number")] ?? ""),
        idKsi: cols[colIndex("id_ksi")] ?? "",
        leadStatus: cols[colIndex("lead_status")] ?? "",
      });
    }

    // 2. Query KSI for each lead
    // Closure reasons whose name contains these keywords = VENDA (sale)
    const vendaKeywords = ["comprou", "venda", "vendido", "fechou negócio", "fechou negocio", "pós venda", "pos venda"];

    const enriched: Array<LeadRow & { crm: CrmStatus | null; motivoNome: string; closureType: string }> = [];
    const batchSize = 3;

    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async (lead) => {
          const crm = await queryKsiCombined(lead.email, lead.phoneFormatted);
          let motivoNome = "";
          if (crm?.motivoFechamento) {
            motivoNome = closureReasons[crm.motivoFechamento] ?? crm.motivoFechamento;
          }
          // Determine closure type: "venda", "lost", or ""
          let closureType = "";
          if (crm?.situacao === "FECHADA") {
            const motivoLower = motivoNome.toLowerCase();
            const isVenda = vendaKeywords.some((kw) => motivoLower.includes(kw));
            closureType = isVenda ? "venda" : "lost";
          }
          return { ...lead, crm, motivoNome, closureType };
        })
      );
      enriched.push(...results);
    }

    // 3. Summary
    const total = enriched.length;
    const aberta = enriched.filter((l) => l.crm?.situacao === "ABERTA").length;
    const lost = enriched.filter((l) => l.closureType === "lost").length;
    const venda = enriched.filter((l) => l.closureType === "venda").length;

    return NextResponse.json({
      leads: enriched,
      summary: { total, aberta, lost, venda },
      closureReasons,
      updatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Unknown error" }, { status: 500 });
  }
}

// Pre-computes CRM status for all leads at BUILD time and writes a JSON cache.
// Runs via the "prebuild" npm hook (locally and on Vercel during each deploy).
// This avoids querying KSI live on every request, which times out / gets
// rate-limited with hundreds of leads. The dashboard then loads instantly.

import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, "..", "src", "app", "api", "leads-crm", "crm-cache.json");

const LEADS_SHEET_ID = "1SbIcGGizozINPj9RLU1t359DbOY0YO5goVJcBO3xk5Q";
const LEADS_CSV_URL = `https://docs.google.com/spreadsheets/d/${LEADS_SHEET_ID}/export?format=csv`;

const KSI_BASE = "https://www.friasneto.com.br/kurole_include/api/webservice/escopos/";
const KSI_SCOPE_ID = "68";
const KSI_TOKEN = "252c72ea3daa906ce07f3619c5eca804";

// Lower concurrency = more reliable (KSI rate-limits above ~30 concurrent calls).
// No 60s limit at build time, so we favor reliability over speed.
// Concorrencia alta nao causa 429 porque o ksiThrottle global limita
// quantas calls saem por segundo. Mais concorrencia so enche o pipeline.
const LEAD_CONCURRENCY = 6;

function parseCsvLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else current += ch;
  }
  fields.push(current.trim());
  return fields;
}

function formatPhone(raw) {
  const digits = raw.replace(/\D/g, "");
  const local = digits.startsWith("55") ? digits.slice(2) : digits;
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return raw;
}

function cleanEmail(raw) {
  return raw.trim().toLowerCase();
}

function toTitleCase(name) {
  const normalized = name.normalize("NFKD").normalize("NFC");
  const cleaned = normalized.replace(/[^a-zA-ZÀ-ÿ\s'-]/g, "").replace(/\s+/g, " ").trim();
  if (!cleaned) return name.trim();
  const smallWords = new Set(["de", "da", "do", "dos", "das", "e"]);
  return cleaned
    .toLowerCase()
    .split(/\s+/)
    .map((word, i) => {
      if (i > 0 && smallWords.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

// KSI rate-limita ~3 chamadas em rajada -> HTTP 429.
// Throttle global: minimo MIN_INTERVAL_MS entre QUALQUER duas chamadas.
const MIN_INTERVAL_MS = 400;
let nextCallAt = 0;
async function ksiThrottle() {
  const now = Date.now();
  const slot = Math.max(now, nextCallAt);
  nextCallAt = slot + MIN_INTERVAL_MS;
  const wait = slot - now;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}

// Para 429, retry com backoff longo. Para outros erros, retry curto.
async function ksiFetch(params, maxRetries = 4) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await ksiThrottle();
      const url = new URL(KSI_BASE);
      url.searchParams.set("id", KSI_SCOPE_ID);
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${KSI_TOKEN}`,
          "User-Agent": "Mozilla/5.0 (compatible; FriasNetoDashboard/1.0)",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(15000),
      });
      if (res.status === 429) {
        if (attempt < maxRetries) {
          // backoff exponencial 2s, 4s, 6s, 8s
          await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
        if (process.env.DEBUG_KSI) console.warn(`[ksi] HTTP 429 (rate limit) apos ${maxRetries + 1} tentativas`);
        return null;
      }
      if (!res.ok) {
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 500));
          continue;
        }
        if (process.env.DEBUG_KSI) console.warn(`[ksi] HTTP ${res.status}`);
        return null;
      }
      const json = await res.json();
      return Array.isArray(json) ? json[0] : json;
    } catch {
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
      return null;
    }
  }
  return null;
}

async function getClosureReasons() {
  const operacoes = ["V", "E", "L"];
  const map = {};
  const results = await Promise.all(
    operacoes.map((op) =>
      ksiFetch({ ws_destino: "ORDEM_ATENDIMENTO_FECHAMENTO_MOTIVOS", oa_operacao: op })
    )
  );
  for (const result of results) {
    if (result?.sucesso === "1" && result.dados) {
      for (const d of result.dados) map[d.id] = d.nome;
    }
  }
  return map;
}

function pickBestOrder(dados) {
  if (!dados || dados.length === 0) return null;
  if (dados.length === 1) return dados[0];
  const sorted = [...dados].sort((a, b) => {
    const idA = parseInt(a.id_ordem_atendimento ?? "0", 10);
    const idB = parseInt(b.id_ordem_atendimento ?? "0", 10);
    return idB - idA;
  });
  const aberta = sorted.find((d) => (d.situcao ?? d.situacao ?? "").toUpperCase() === "ABERTA");
  if (aberta) return aberta;
  return sorted[0];
}

function toCrmStatus(d) {
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

function deduplicateOrders(orders) {
  const seen = new Set();
  return orders.filter((o) => {
    const id = o.id_ordem_atendimento ?? "";
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

async function fetchKsiOrders(searchParam, searchValue, onlyOpen) {
  const item = await ksiFetch({
    ws_destino: "ORDEM_ATENDIMENTO_RESPONSAVEIS",
    [searchParam]: searchValue,
    oa_flag_aberta: onlyOpen ? "1" : "0",
  });
  if (item?.sucesso === "1" && item.dados?.length > 0) return item.dados;
  return [];
}

async function queryKsiCombined(email, phone) {
  // Single-pass com flag=0 (retorna ABERTA e FECHADA). pickBestOrder ja
  // prefere ABERTA. Reduzido de 4 para 2 chamadas por lead pra fugir do
  // rate limit do KSI.
  const [allByEmail, allByPhone] = await Promise.all([
    email ? fetchKsiOrders("oa_email", email, false) : Promise.resolve([]),
    phone ? fetchKsiOrders("oa_telefone", phone, false) : Promise.resolve([]),
  ]);
  const openAll = deduplicateOrders(
    [...allByEmail, ...allByPhone].filter(
      (o) => (o.situcao ?? o.situacao ?? "").toUpperCase() === "ABERTA"
    )
  );
  if (openAll.length > 0) {
    const best = pickBestOrder(openAll);
    if (best) return toCrmStatus(best);
  }
  const allOrders = deduplicateOrders([...allByEmail, ...allByPhone]);
  if (allOrders.length > 0) {
    const best = pickBestOrder(allOrders);
    if (best) return toCrmStatus(best);
  }
  return null;
}

async function main() {
  console.log("[fetch-crm] Starting CRM pre-computation...");

  // 1. Fetch leads CSV + closure reasons
  let csvText;
  try {
    const res = await fetch(LEADS_CSV_URL, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) throw new Error(`CSV fetch failed: ${res.status}`);
    csvText = await res.text();
  } catch (err) {
    console.error("[fetch-crm] Could not fetch leads sheet:", err.message);
    console.error("[fetch-crm] Keeping existing cache (if any). Build continues.");
    if (!existsSync(OUT_PATH)) {
      mkdirSync(dirname(OUT_PATH), { recursive: true });
      writeFileSync(OUT_PATH, JSON.stringify({ leads: [], summary: { total: 0, aberta: 0, fechada: 0 }, updatedAt: new Date().toISOString() }));
    }
    return;
  }

  // Carrega o cache anterior pra reaproveitar leads ja com CRM identificado.
  // O corretor responsavel raramente muda apos a 1a atribuicao, entao soh
  // consultamos leads NOVOS ou que ainda nao foram encontrados.
  const cachedByLeadId = new Map();
  if (existsSync(OUT_PATH)) {
    try {
      const prev = JSON.parse(readFileSync(OUT_PATH, "utf8"));
      for (const l of prev.leads || []) {
        if (l.id && l.crm) cachedByLeadId.set(l.id, l);
      }
      console.log(`[fetch-crm] ${cachedByLeadId.size} leads com CRM ja no cache (vao ser reaproveitados).`);
    } catch {
      console.warn("[fetch-crm] Cache anterior invalido, comecando do zero.");
    }
  }

  const lines = csvText.split("\n").filter((l) => l.trim() !== "");
  if (lines.length < 2) {
    writeFileSync(OUT_PATH, JSON.stringify({ leads: [], summary: { total: 0, aberta: 0, fechada: 0 }, updatedAt: new Date().toISOString() }));
    return;
  }

  const headers = parseCsvLine(lines[0]);
  const colIndex = (name) => headers.findIndex((h) => h === name);

  const leads = [];
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

  // Como nao temos como distinguir Lost x Venda pela API do KSI,
  // unificamos tudo como "FECHADA". So separamos ABERTA x FECHADA.
  const enrichLead = async (lead) => {
    const crm = await queryKsiCombined(lead.email, lead.phoneFormatted);
    const closureType = crm?.situacao === "FECHADA" ? "fechada" : "";
    return { ...lead, crm, motivoNome: "", closureType };
  };

  // Determina quais leads precisam ser consultados (so os novos ou sem CRM).
  const leadsToQuery = [];
  for (const lead of leads) {
    if (lead.id && cachedByLeadId.has(lead.id)) {
      // Mantem os dados de CRM do cache, mas atualiza os campos do lead
      // (caso o nome/email/etc. tenha sido normalizado de forma diferente).
      const cached = cachedByLeadId.get(lead.id);
      leadsToQuery.push({ lead, cached });
    } else {
      leadsToQuery.push({ lead, cached: null });
    }
  }

  const toConsult = leadsToQuery.filter((x) => !x.cached).length;
  console.log(`[fetch-crm] ${leads.length} leads total | ${leadsToQuery.length - toConsult} ja no cache | ${toConsult} novos para consultar`);

  const enriched = new Array(leads.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < leads.length) {
      const i = cursor++;
      const { lead, cached } = leadsToQuery[i];
      if (cached) {
        // Reaproveita o CRM ja conhecido, mantendo dados frescos do lead
        enriched[i] = { ...lead, crm: cached.crm, motivoNome: "", closureType: cached.crm?.situacao === "FECHADA" ? "fechada" : "" };
      } else {
        enriched[i] = await enrichLead(lead);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(LEAD_CONCURRENCY, leads.length) }, () => worker()));

  const total = enriched.length;
  const aberta = enriched.filter((l) => l.crm?.situacao === "ABERTA").length;
  const fechada = enriched.filter((l) => l.closureType === "fechada").length;
  const notFound = enriched.filter((l) => !l.crm).length;

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(
    OUT_PATH,
    JSON.stringify({ leads: enriched, summary: { total, aberta, fechada }, updatedAt: new Date().toISOString() })
  );

  console.log(`[fetch-crm] Done. total=${total} aberta=${aberta} fechada=${fechada} naoEncontrado=${notFound}`);
}

main().catch((err) => {
  console.error("[fetch-crm] Fatal error (build continues):", err);
  // Never fail the build over CRM enrichment.
  process.exit(0);
});

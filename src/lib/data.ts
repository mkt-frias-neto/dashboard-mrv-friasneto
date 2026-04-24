export interface CampaignRow {
  reach: number;
  impressions: number;
  frequency: number;
  amountSpent: number;
  cpm: number;
  linkClicks: number;
  cpc: number;
  ctr: number;
  costPerLead: number;
  leads: number;
  campaignName: string;
  adSetName: string;
  adName: string;
  day: string;
  videoViews: number;
  pageViews: number;
  messages: number;
}

// --- Unique filter values ---
export function getUniqueCampaigns(rows: CampaignRow[]): string[] {
  return Array.from(new Set(rows.map((r) => r.campaignName)));
}
export function getUniqueAdSets(rows: CampaignRow[]): string[] {
  return Array.from(new Set(rows.map((r) => r.adSetName)));
}
export function getUniqueAdNames(rows: CampaignRow[]): string[] {
  return Array.from(new Set(rows.map((r) => r.adName)));
}

// --- Filters ---
export interface Filters {
  daysBack: number | null; // null=total, -1=yesterday, N=last N days
  customStart: string | null;
  customEnd: string | null;
  campaign: string | null;
  adSet: string | null;
  adName: string | null;
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function applyFilters(rows: CampaignRow[], filters: Filters): CampaignRow[] {
  let result = rows;

  if (filters.customStart || filters.customEnd) {
    result = result.filter((r) => {
      if (filters.customStart && r.day < filters.customStart) return false;
      if (filters.customEnd && r.day > filters.customEnd) return false;
      return true;
    });
  } else if (filters.daysBack !== null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (filters.daysBack === -1) {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const yStr = toDateStr(yesterday);
      result = result.filter((r) => r.day === yStr);
    } else {
      // Last N days — use latest date with meaningful data as end reference
      // (skip partial/empty days like today with ~0 impressions)
      const latestDay = rows.reduce((max, r) =>
        r.day > max && r.impressions > 10 ? r.day : max, "");
      const endDate = latestDay
        ? new Date(latestDay + "T00:00:00")
        : today;
      const endStr = latestDay || toDateStr(today);
      const startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - filters.daysBack + 1);
      const startStr = toDateStr(startDate);
      result = result.filter((r) => r.day >= startStr && r.day <= endStr);
    }
  }

  if (filters.campaign) result = result.filter((r) => r.campaignName === filters.campaign);
  if (filters.adSet) result = result.filter((r) => r.adSetName === filters.adSet);
  if (filters.adName) result = result.filter((r) => r.adName === filters.adName);

  return result;
}

// --- Aggregation ---
export interface AggregatedMetrics {
  totalReach: number;
  totalImpressions: number;
  avgFrequency: number;
  totalSpent: number;
  avgCPM: number;
  totalClicks: number;
  avgCPC: number;
  avgCTR: number;
  avgCostPerLead: number;
  totalLeads: number;
  totalVideoViews: number;
  totalPageViews: number;
  totalMessages: number;
}

export function aggregateMetrics(rows: CampaignRow[]): AggregatedMetrics {
  if (rows.length === 0) {
    return {
      totalReach: 0, totalImpressions: 0, avgFrequency: 0, totalSpent: 0,
      avgCPM: 0, totalClicks: 0, avgCPC: 0, avgCTR: 0,
      avgCostPerLead: 0, totalLeads: 0, totalVideoViews: 0,
      totalPageViews: 0, totalMessages: 0,
    };
  }
  const totalReach = rows.reduce((s, r) => s + r.reach, 0);
  const totalImpressions = rows.reduce((s, r) => s + r.impressions, 0);
  const totalSpent = rows.reduce((s, r) => s + r.amountSpent, 0);
  const totalClicks = rows.reduce((s, r) => s + r.linkClicks, 0);
  const totalLeads = rows.reduce((s, r) => s + r.leads, 0);
  const totalVideoViews = rows.reduce((s, r) => s + (r.videoViews ?? 0), 0);
  const totalPageViews = rows.reduce((s, r) => s + (r.pageViews ?? 0), 0);
  const totalMessages = rows.reduce((s, r) => s + (r.messages ?? 0), 0);
  return {
    totalReach, totalImpressions,
    avgFrequency: totalImpressions / (totalReach || 1),
    totalSpent,
    avgCPM: totalImpressions > 0 ? (totalSpent / totalImpressions) * 1000 : 0,
    totalClicks,
    avgCPC: totalClicks > 0 ? totalSpent / totalClicks : 0,
    avgCTR: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
    avgCostPerLead: totalLeads > 0 ? totalSpent / totalLeads : 0,
    totalLeads,
    totalVideoViews,
    totalPageViews,
    totalMessages,
  };
}

export interface DailyAggregate {
  day: string;
  reach: number;
  impressions: number;
  spent: number;
  clicks: number;
  leads: number;
}

export function aggregateByDay(rows: CampaignRow[]): DailyAggregate[] {
  const map: Record<string, DailyAggregate> = {};
  for (const r of rows) {
    if (!map[r.day]) {
      map[r.day] = { day: r.day, reach: 0, impressions: 0, spent: 0, clicks: 0, leads: 0 };
    }
    map[r.day].reach += r.reach;
    map[r.day].impressions += r.impressions;
    map[r.day].spent += r.amountSpent;
    map[r.day].clicks += r.linkClicks;
    map[r.day].leads += r.leads;
  }
  return Object.values(map).sort((a, b) => a.day.localeCompare(b.day));
}

export interface AdAggregate {
  adName: string;
  reach: number;
  impressions: number;
  spent: number;
  clicks: number;
  leads: number;
  ctr: number;
  cpc: number;
  cpl: number;
}

export function aggregateByAd(rows: CampaignRow[]): AdAggregate[] {
  const map: Record<string, AdAggregate> = {};
  for (const r of rows) {
    if (!map[r.adName]) {
      map[r.adName] = { adName: r.adName, reach: 0, impressions: 0, spent: 0, clicks: 0, leads: 0, ctr: 0, cpc: 0, cpl: 0 };
    }
    map[r.adName].reach += r.reach;
    map[r.adName].impressions += r.impressions;
    map[r.adName].spent += r.amountSpent;
    map[r.adName].clicks += r.linkClicks;
    map[r.adName].leads += r.leads;
  }
  for (const ad of Object.values(map)) {
    ad.ctr = ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0;
    ad.cpc = ad.clicks > 0 ? ad.spent / ad.clicks : 0;
    ad.cpl = ad.leads > 0 ? ad.spent / ad.leads : 0;
  }
  return Object.values(map);
}

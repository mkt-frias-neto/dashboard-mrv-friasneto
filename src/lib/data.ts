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
}

function parseNum(val: string): number {
  if (!val || val.trim() === "") return 0;
  return parseFloat(val.replace(/\./g, "").replace(",", "."));
}

const rawData: CampaignRow[] = [
  {
    reach: 3000, impressions: 3890, frequency: 1.3, amountSpent: 44.72,
    cpm: 11.5, linkClicks: 10, cpc: 4.47, ctr: 0.26,
    costPerLead: 0, leads: 0, campaignName: "Piazza di Viena",
    adSetName: "Adv + e Geo Localização", adName: "Vídeos MRV", day: "2026-03-27",
  },
  {
    reach: 234, impressions: 255, frequency: 1.09, amountSpent: 2.24,
    cpm: 8.78, linkClicks: 0, cpc: 0, ctr: 0,
    costPerLead: 0, leads: 0, campaignName: "Piazza di Viena",
    adSetName: "Adv + e Geo Localização", adName: "Arte MRV", day: "2026-03-27",
  },
  {
    reach: 500, impressions: 582, frequency: 1.16, amountSpent: 12.2,
    cpm: 20.96, linkClicks: 1, cpc: 12.2, ctr: 0.17,
    costPerLead: 0, leads: 0, campaignName: "Piazza di Viena",
    adSetName: "Adv + e Geo Localização", adName: "Vídeos MRV", day: "2026-03-28",
  },
  {
    reach: 3890, impressions: 6861, frequency: 1.76, amountSpent: 70.76,
    cpm: 10.31, linkClicks: 34, cpc: 2.08, ctr: 0.5,
    costPerLead: 17.69, leads: 4, campaignName: "Piazza di Viena",
    adSetName: "Adv + e Geo Localização", adName: "Arte MRV", day: "2026-03-28",
  },
  {
    reach: 355, impressions: 421, frequency: 1.19, amountSpent: 8.58,
    cpm: 20.38, linkClicks: 0, cpc: 0, ctr: 0,
    costPerLead: 0, leads: 0, campaignName: "Piazza di Viena",
    adSetName: "Adv + e Geo Localização", adName: "Vídeos MRV", day: "2026-03-29",
  },
  {
    reach: 5437, impressions: 9080, frequency: 1.67, amountSpent: 98.67,
    cpm: 10.87, linkClicks: 42, cpc: 2.35, ctr: 0.46,
    costPerLead: 24.67, leads: 4, campaignName: "Piazza di Viena",
    adSetName: "Adv + e Geo Localização", adName: "Arte MRV", day: "2026-03-29",
  },
  {
    reach: 156, impressions: 181, frequency: 1.16, amountSpent: 2.4,
    cpm: 13.26, linkClicks: 0, cpc: 0, ctr: 0,
    costPerLead: 0, leads: 0, campaignName: "Piazza di Viena",
    adSetName: "Adv + e Geo Localização", adName: "Vídeos MRV", day: "2026-03-30",
  },
  {
    reach: 1345, impressions: 1820, frequency: 1.35, amountSpent: 17.59,
    cpm: 9.66, linkClicks: 7, cpc: 2.51, ctr: 0.38,
    costPerLead: 17.59, leads: 1, campaignName: "Piazza di Viena",
    adSetName: "Adv + e Geo Localização", adName: "Arte MRV", day: "2026-03-30",
  },
];

export function getCampaignData(): CampaignRow[] {
  return rawData;
}

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
}

export function aggregateMetrics(rows: CampaignRow[]): AggregatedMetrics {
  if (rows.length === 0) {
    return {
      totalReach: 0, totalImpressions: 0, avgFrequency: 0, totalSpent: 0,
      avgCPM: 0, totalClicks: 0, avgCPC: 0, avgCTR: 0,
      avgCostPerLead: 0, totalLeads: 0,
    };
  }

  const totalReach = rows.reduce((s, r) => s + r.reach, 0);
  const totalImpressions = rows.reduce((s, r) => s + r.impressions, 0);
  const totalSpent = rows.reduce((s, r) => s + r.amountSpent, 0);
  const totalClicks = rows.reduce((s, r) => s + r.linkClicks, 0);
  const totalLeads = rows.reduce((s, r) => s + r.leads, 0);
  const avgFrequency = totalImpressions / (totalReach || 1);
  const avgCPM = totalImpressions > 0 ? (totalSpent / totalImpressions) * 1000 : 0;
  const avgCPC = totalClicks > 0 ? totalSpent / totalClicks : 0;
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCostPerLead = totalLeads > 0 ? totalSpent / totalLeads : 0;

  return {
    totalReach, totalImpressions, avgFrequency, totalSpent,
    avgCPM, totalClicks, avgCPC, avgCTR, avgCostPerLead, totalLeads,
  };
}

export function filterByDateRange(rows: CampaignRow[], daysBack: number | null): CampaignRow[] {
  if (daysBack === null) return rows;
  const today = new Date("2026-03-30");
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - daysBack + 1);
  return rows.filter((r) => {
    const d = new Date(r.day);
    return d >= startDate && d <= today;
  });
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
}

export function aggregateByAd(rows: CampaignRow[]): AdAggregate[] {
  const map: Record<string, AdAggregate> = {};
  for (const r of rows) {
    if (!map[r.adName]) {
      map[r.adName] = { adName: r.adName, reach: 0, impressions: 0, spent: 0, clicks: 0, leads: 0, ctr: 0 };
    }
    map[r.adName].reach += r.reach;
    map[r.adName].impressions += r.impressions;
    map[r.adName].spent += r.amountSpent;
    map[r.adName].clicks += r.linkClicks;
    map[r.adName].leads += r.leads;
  }
  for (const ad of Object.values(map)) {
    ad.ctr = ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0;
  }
  return Object.values(map);
}

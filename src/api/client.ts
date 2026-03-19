import type {
  ETF,
  ETFListResponse,
  PriceListResponse,
  ETFReturnsResponse,
  HoldingListResponse,
  CompareResponse,
  RankingResponse,
  DividendRankingResponse,
  ThemesResponse,
} from "./types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  getETFs: (params?: {
    page?: number;
    size?: number;
    search?: string;
    company?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.size) q.set("size", String(params.size));
    if (params?.search) q.set("search", params.search);
    if (params?.company) q.set("company", params.company);
    return fetchJSON<ETFListResponse>(`/api/etfs?${q}`);
  },

  getETF: (ticker: string) => fetchJSON<ETF>(`/api/etfs/${ticker}`),

  getETFPrices: (ticker: string, limit = 365) =>
    fetchJSON<PriceListResponse>(`/api/etfs/${ticker}/prices?limit=${limit}`),

  getETFReturns: (ticker: string) =>
    fetchJSON<ETFReturnsResponse>(`/api/etfs/${ticker}/returns`),

  getETFHoldings: (ticker: string) =>
    fetchJSON<HoldingListResponse>(`/api/etfs/${ticker}/holdings`),

  compare: (tickers: string[], metric = "returns") =>
    fetchJSON<CompareResponse>(
      `/api/etfs/compare?tickers=${tickers.join(",")}&metric=${metric}`
    ),

  ranking: (sortBy = "returns_1m", order = "desc", page = 1, size = 20, category?: string, theme?: string) => {
    const q = new URLSearchParams({
      sort_by: sortBy,
      order,
      page: String(page),
      size: String(size),
    });
    if (category) q.set("category", category);
    if (theme) q.set("theme", theme);
    return fetchJSON<RankingResponse>(`/api/etfs/ranking?${q}`);
  },

  getThemes: (category?: string) => {
    const q = category ? `?category=${encodeURIComponent(category)}` : "";
    return fetchJSON<ThemesResponse>(`/api/etfs/themes${q}`);
  },

  holdingsOverlap: (tickerA: string, tickerB: string) =>
    fetchJSON<any>(
      `/api/etfs/holdings-overlap?ticker_a=${tickerA}&ticker_b=${tickerB}`
    ),

  dividendRanking: (page = 1, size = 20, frequency?: string) => {
    const q = new URLSearchParams({ page: String(page), size: String(size) });
    if (frequency) q.set("frequency", frequency);
    return fetchJSON<DividendRankingResponse>(`/api/etfs/dividend-ranking?${q}`);
  },

  getPortfolioBreakdown: (ticker: string) =>
    fetchJSON<{
      ticker: string;
      sector: Array<{code: string; name: string; weight: number}>;
      country: Array<{code: string; name: string; weight: number}>;
      asset: Array<{code: string; name: string; weight: number}>;
    }>(`/api/etfs/portfolio/${ticker}`),

  getNaverReturns: (ticker: string) =>
    fetchJSON<{
      ticker: string;
      price_returns: Record<string, number | null>;
      total_returns: Record<string, number | null>;
    }>(`/api/etfs/naver-returns/${ticker}`),

  getMarketIndicators: () =>
    fetchJSON<{
      indices: Array<{
        symbol: string;
        name: string;
        price: number;
        change: number | null;
        change_pct: number | null;
      }>;
      exchange: Array<{
        symbol: string;
        name: string;
        price: number;
        change: number | null;
        change_pct: number | null;
      }>;
      commodities: Array<{
        symbol: string;
        name: string;
        price: number;
        change: number | null;
        change_pct: number | null;
        unit?: string;
      }>;
      bonds: Array<{
        symbol: string;
        name: string;
        price: number;
        change: number | null;
        change_pct: number | null;
        unit?: string;
      }>;
      sentiment: Array<{
        symbol: string;
        name: string;
        price: number;
        change: number | null;
        change_pct: number | null;
      }>;
    }>("/api/market"),
};

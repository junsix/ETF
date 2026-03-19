export interface ETF {
  ticker: string;
  name: string;
  management_company: string | null;
  category: string | null;
  theme: string | null;
  expense_ratio: number | null;
  dividend_yield: number | null;
  dividend_per_share: number | null;
  dividend_frequency: string | null;
  total_fee: number | null;
  is_active: boolean;
  id: number;
  created_at: string;
  updated_at: string;
}

export interface ETFListResponse {
  total: number;
  page: number;
  size: number;
  items: ETF[];
}

export interface DailyPrice {
  ticker: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PriceListResponse {
  ticker: string;
  total: number;
  items: DailyPrice[];
}

export interface ReturnsData {
  "1w": number | null;
  "1m": number | null;
  "3m": number | null;
  "6m": number | null;
  "1y": number | null;
}

export interface ETFReturnsResponse {
  ticker: string;
  name: string;
  returns: ReturnsData;
  base_price: number;
  date: string;
}

export interface CompareItem {
  ticker: string;
  name: string;
  returns: ReturnsData;
  close: number | null;
  volume: number | null;
}

export interface CompareResponse {
  metric: string;
  date: string;
  items: CompareItem[];
}

export interface RankingItem {
  ticker: string;
  name: string;
  management_company: string | null;
  category: string | null;
  theme: string | null;
  listed_date: string | null;
  close: number;
  volume: number;
  returns: ReturnsData;
}

export interface ThemeItem {
  name: string;
  count: number;
}

export interface ThemesResponse {
  themes: ThemeItem[];
}

export interface RankingResponse {
  sort_by: string;
  order: string;
  total: number;
  page: number;
  size: number;
  items: RankingItem[];
}

export interface Holding {
  etf_ticker: string;
  date: string;
  stock_ticker: string;
  stock_name: string;
  shares: number;
  amount: number;
  weight: number;
}

export interface HoldingListResponse {
  etf_ticker: string;
  date: string | null;
  total: number;
  items: Holding[];
}

export interface DividendRankingItem {
  ticker: string;
  name: string;
  management_company: string | null;
  dividend_yield: number | null;
  dividend_per_share: number | null;
  dividend_frequency: string | null;
  total_fee: number | null;
}

export interface DividendRankingResponse {
  total: number;
  page: number;
  size: number;
  items: DividendRankingItem[];
}

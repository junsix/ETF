import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { createChart, CandlestickSeries, HistogramSeries } from "lightweight-charts";
import type { Time } from "lightweight-charts";
import { api } from "@/shared/api/client";
import type {
  ETF,
  ETFReturnsResponse,
  DailyPrice,
  Holding,
} from "@/shared/api/types";
import HelpTip from "@/shared/components/HelpTip";
import { formatReturn, returnColor } from "@/shared/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/shared/ui/table";

// 운용사 브랜드별 ETF 목록 페이지 (상품 ID가 티커와 다르므로 목록 페이지로 링크)
const PROVIDER_SITES: Record<string, { name: string; url: string }> = {
  KODEX: { name: "삼성 KODEX", url: "https://www.samsungfund.com/etf/product/list.do" },
  TIGER: { name: "미래에셋 TIGER", url: "https://www.tigeretf.com/ko/product/search/list.do" },
  KBSTAR: { name: "KB STAR", url: "https://www.kbam.co.kr/etf" },
  "KB스타": { name: "KB STAR", url: "https://www.kbam.co.kr/etf" },
  SOL: { name: "신한 SOL", url: "https://www.soletf.com/ko/etf" },
  ACE: { name: "한투 ACE", url: "https://www.aceetf.co.kr" },
  ARIRANG: { name: "한화 ARIRANG", url: "https://www.arirangetf.com" },
  HANARO: { name: "NH HANARO", url: "https://www.nhfund.co.kr/web/etf/etf_01_01.do" },
  KOSEF: { name: "키움 KOSEF", url: "https://www.kiwoomam.com" },
  PLUS: { name: "PLUS", url: "https://www.k-etf.com" },
};

function getProviderSite(etfName: string): { name: string; url: string } | null {
  for (const [brand, info] of Object.entries(PROVIDER_SITES)) {
    if (etfName.startsWith(brand)) {
      return info;
    }
  }
  return null;
}

const SECTOR_COLORS = [
  "#2563eb", "#dc2626", "#16a34a", "#ca8a04", "#9333ea", "#0891b2",
  "#e11d48", "#65a30d", "#c026d3", "#0d9488", "#f97316", "#6b7280",
];
const COUNTRY_COLORS = ["#dc2626", "#2563eb", "#e11d48", "#16a34a", "#ca8a04", "#6b7280"];
const ASSET_COLORS = ["#2563eb", "#16a34a", "#ca8a04", "#9333ea", "#6b7280"];

interface PortfolioBreakdown {
  ticker: string;
  sector: Array<{code: string; name: string; weight: number}>;
  country: Array<{code: string; name: string; weight: number}>;
  asset: Array<{code: string; name: string; weight: number}>;
}

function DonutChart({ title, items, colors }: {
  title: string;
  items: Array<{name: string; weight: number}>;
  colors: string[];
}) {
  if (items.length === 0) return null;

  const gradientParts: string[] = [];
  let cumulative = 0;
  items.forEach((item, i) => {
    const color = colors[i % colors.length];
    gradientParts.push(`${color} ${cumulative}% ${cumulative + item.weight}%`);
    cumulative += item.weight;
  });
  if (cumulative < 100) {
    gradientParts.push(`#e5e7eb ${cumulative}% 100%`);
  }

  return (
    <Card>
      <CardHeader className="p-4 pb-0">
        <CardTitle className="text-sm text-gray-700">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-36 h-36 rounded-full"
            style={{ background: `conic-gradient(${gradientParts.join(", ")})` }}
          />
          <div className="text-xs space-y-1 w-full">
            {items.map((item, i) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                <span className="truncate">{item.name}</span>
                <span className="text-gray-400 ml-auto">{item.weight.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const PIE_COLORS = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#ca8a04",
  "#9333ea",
  "#0891b2",
  "#e11d48",
  "#65a30d",
  "#c026d3",
  "#0d9488",
];

const PieChart = ({ holdings }: { holdings: Holding[] }) => {
  const top = holdings.slice(0, 10);
  const otherWeight = Math.max(
    0,
    100 - top.reduce((sum, h) => sum + h.weight, 0)
  );

  const gradientParts: string[] = [];
  let cumulative = 0;
  top.forEach((h, i) => {
    gradientParts.push(
      `${PIE_COLORS[i]} ${cumulative}% ${cumulative + h.weight}%`
    );
    cumulative += h.weight;
  });
  if (otherWeight > 0) {
    gradientParts.push(`#d1d5db ${cumulative}% 100%`);
  }

  return (
    <div className="flex flex-col sm:flex-row gap-6 items-center">
      <div
        className="w-48 h-48 rounded-full shrink-0"
        style={{ background: `conic-gradient(${gradientParts.join(", ")})` }}
      />
      <div className="text-sm space-y-1">
        {top.map((h, i) => (
          <div key={h.stock_name} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-sm shrink-0"
              style={{ backgroundColor: PIE_COLORS[i] }}
            />
            <span className="truncate max-w-[200px]">{h.stock_name}</span>
            <span className="text-gray-500 ml-auto">{h.weight.toFixed(1)}%</span>
          </div>
        ))}
        {otherWeight > 0 && (
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm shrink-0 bg-gray-300" />
            <span>기타</span>
            <span className="text-gray-500 ml-auto">
              {otherWeight.toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const WeightBars = ({ holdings }: { holdings: Holding[] }) => {
  const top = holdings.slice(0, 10);
  const maxWeight = Math.max(...top.map((h) => h.weight));

  return (
    <div className="space-y-2">
      {top.map((h) => (
        <div key={h.stock_name} className="flex items-center gap-2 text-sm">
          <span className="w-24 truncate shrink-0">{h.stock_name}</span>
          <div className="flex-1 bg-gray-100 rounded h-5 overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded"
              style={{ width: `${(h.weight / maxWeight) * 100}%` }}
            />
          </div>
          <span className="w-14 text-right text-gray-500">
            {h.weight.toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
};

function returnBg(val: number | null): string {
  if (val === null || val === undefined) return "bg-gray-50";
  if (val > 0) return "bg-red-50";
  if (val < 0) return "bg-blue-50";
  return "bg-gray-50";
}

const RETURN_LABELS: { key: keyof ETFReturnsResponse["returns"]; label: string }[] = [
  { key: "1w", label: "1주" },
  { key: "1m", label: "1개월" },
  { key: "3m", label: "3개월" },
  { key: "6m", label: "6개월" },
  { key: "1y", label: "1년" },
];

function CandlestickChart({ prices }: { prices: DailyPrice[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || prices.length === 0) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { color: "#ffffff" },
        textColor: "#333",
      },
      grid: {
        vertLines: { color: "#f0f0f0" },
        horzLines: { color: "#f0f0f0" },
      },
      timeScale: {
        borderColor: "#d1d5db",
      },
      rightPriceScale: {
        borderColor: "#d1d5db",
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#ef4444",
      downColor: "#3b82f6",
      borderUpColor: "#ef4444",
      borderDownColor: "#3b82f6",
      wickUpColor: "#ef4444",
      wickDownColor: "#3b82f6",
    });

    const sorted = [...prices].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    series.setData(
      sorted.map((p) => ({
        time: p.date as string,
        open: p.open,
        high: p.high,
        low: p.low,
        close: p.close,
      }))
    );

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    volumeSeries.setData(
      sorted.map((p) => ({
        time: p.date as Time,
        value: p.volume,
        color: p.close >= p.open ? "rgba(239,68,68,0.3)" : "rgba(59,130,246,0.3)",
      }))
    );

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [prices]);

  return <div ref={containerRef} className="w-full" />;
}

export default function ETFDetail() {
  const { ticker } = useParams<{ ticker: string }>();
  const [etf, setEtf] = useState<ETF | null>(null);
  const [returns, setReturns] = useState<ETFReturnsResponse | null>(null);
  const [prices, setPrices] = useState<DailyPrice[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [naverReturns, setNaverReturns] = useState<{
    ticker: string;
    price_returns: Record<string, number | null>;
    total_returns: Record<string, number | null>;
  } | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticker) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      api.getETF(ticker),
      api.getETFReturns(ticker).catch(() => null),
      api.getETFPrices(ticker, 365).catch(() => ({ ticker, total: 0, items: [] })),
      api.getETFHoldings(ticker).catch(() => ({
        etf_ticker: ticker,
        date: null,
        total: 0,
        items: [],
      })),
      api.getNaverReturns(ticker).catch(() => null),
      api.getPortfolioBreakdown(ticker).catch(() => null),
    ])
      .then(([etfData, returnsData, pricesData, holdingsData, naverData, portfolioData]) => {
        if (cancelled) return;
        setEtf(etfData);
        setReturns(returnsData);
        setPrices(pricesData.items);
        setHoldings(holdingsData.items.slice(0, 10));
        setNaverReturns(naverData);
        setPortfolio(portfolioData);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ticker]);

  if (loading) {
    return (
      <div className="p-4 max-w-5xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-32" />
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-[400px] bg-gray-200 rounded" />
          <div className="flex gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded flex-1" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !etf) {
    return (
      <div className="p-4 max-w-5xl mx-auto">
        <Link to="/" className="text-blue-600 hover:underline text-sm">
          &larr; 목록으로
        </Link>
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
          {error || "ETF를 찾을 수 없습니다"}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-5xl mx-auto">
      {/* Back link */}
      <Link to="/" className="text-blue-600 hover:underline text-sm">
        &larr; 목록으로
      </Link>

      {/* Header */}
      <div className="mt-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{etf.name}</h1>
        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
          <span className="font-mono">{etf.ticker}</span>
          {etf.management_company && (
            <>
              <span>|</span>
              <Link
                to={`/company/${encodeURIComponent(etf.management_company)}`}
                className="hover:text-blue-600 hover:underline"
              >
                {etf.management_company}
              </Link>
            </>
          )}
          {etf.category && (
            <>
              <span>|</span>
              <Badge variant="secondary" className="text-xs">
                {etf.category}
              </Badge>
            </>
          )}
          {etf.theme && (
            <>
              <span>|</span>
              <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
                {etf.theme}
              </Badge>
            </>
          )}
          {(etf.total_fee !== null || etf.expense_ratio !== null) && (
            <>
              <span>|</span>
              <span>총보수 {(etf.total_fee ?? etf.expense_ratio)!.toFixed(2)}%</span>
            </>
          )}
        </div>
        {/* 배당 정보 */}
        {(etf.dividend_yield !== null || etf.dividend_per_share !== null || etf.dividend_frequency !== null) && (
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
            {etf.dividend_yield !== null && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-medium">
                배당수익률 {etf.dividend_yield.toFixed(2)}%
              </Badge>
            )}
            {etf.dividend_per_share !== null && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-medium">
                주당배당금 {etf.dividend_per_share.toLocaleString("ko-KR")}원
              </Badge>
            )}
            {etf.dividend_frequency !== null && (
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 font-medium">
                {etf.dividend_frequency === "monthly"
                  ? "월배당"
                  : etf.dividend_frequency === "quarterly"
                  ? "분기배당"
                  : etf.dividend_frequency === "semi-annual"
                  ? "반기배당"
                  : etf.dividend_frequency === "annual"
                  ? "연배당"
                  : etf.dividend_frequency}
              </Badge>
            )}
          </div>
        )}
        {/* 외부 링크 */}
        <div className="flex gap-2 mt-3">
          <Button variant="outline" size="sm" asChild>
            <a
              href={`https://finance.naver.com/item/main.naver?code=${etf.ticker}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
            >
              네이버 금융 ↗
            </a>
          </Button>
          {(() => {
            const provider = getProviderSite(etf.name);
            return provider ? (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={provider.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                >
                  {provider.name} ↗
                </a>
              </Button>
            ) : null;
          })()}
        </div>
      </div>

      {/* Chart */}
      {prices.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">가격 차트</CardTitle>
          </CardHeader>
          <CardContent>
            <CandlestickChart prices={prices} />
          </CardContent>
        </Card>
      )}

      {/* Returns cards */}
      {returns && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-800">수익률</h2>
          <div className="grid grid-cols-5 gap-3">
            {RETURN_LABELS.map(({ key, label }) => {
              const val = returns.returns[key];
              return (
                <Card
                  key={key}
                  className={`${returnBg(val)} border-gray-200`}
                >
                  <CardContent className="p-4">
                    <div className="text-xs text-gray-500 mb-1">{label}</div>
                    <div className={`text-lg font-bold font-mono ${returnColor(val)}`}>
                      {formatReturn(val)}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Naver returns comparison table */}
      {naverReturns && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-800">
            수익률 비교 <span className="text-sm font-normal text-gray-500">(가격 vs 총수익률)</span>
            <HelpTip text="가격 수익률은 종가 기준이며, 총 수익률(NAV)은 배당 재투자를 반영합니다. 배당수익률이 높은 ETF일수록 차이가 큽니다." />
          </h2>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>기간</TableHead>
                  <TableHead className="text-right">가격 수익률</TableHead>
                  <TableHead className="text-right">총 수익률(배당 재투자)</TableHead>
                  <TableHead className="text-right">차이</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {([
                  { key: "1w", label: "1주" },
                  { key: "1m", label: "1개월" },
                  { key: "3m", label: "3개월" },
                  { key: "6m", label: "6개월" },
                  { key: "ytd", label: "YTD" },
                  { key: "1y", label: "1년" },
                  { key: "3y", label: "3년" },
                  { key: "5y", label: "5년" },
                ] as { key: string; label: string }[]).map(({ key, label }) => {
                  const priceVal = naverReturns.price_returns[key] ?? null;
                  const totalVal = naverReturns.total_returns[key] ?? null;
                  const diff = priceVal !== null && totalVal !== null ? totalVal - priceVal : null;
                  return (
                    <TableRow key={key}>
                      <TableCell className="font-medium text-gray-700">{label}</TableCell>
                      <TableCell className={`text-right font-mono ${returnColor(priceVal)}`}>
                        {formatReturn(priceVal)}
                      </TableCell>
                      <TableCell className={`text-right font-mono ${returnColor(totalVal)}`}>
                        {formatReturn(totalVal)}
                      </TableCell>
                      <TableCell className={`text-right font-mono ${
                        diff === null ? "text-gray-400" : diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-gray-600"
                      }`}>
                        {diff === null ? "-" : `${diff >= 0 ? "+" : ""}${diff.toFixed(2)}%p`}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            * 총 수익률은 NAV 기준 배당 재투자 수익률입니다. 차이는 배당 기여분을 나타냅니다. (출처: 네이버 금융)
          </p>
        </div>
      )}

      {/* Portfolio breakdown donut charts */}
      {portfolio && (portfolio.sector.length > 0 || portfolio.country.length > 0 || portfolio.asset.length > 0) && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-800">포트폴리오 분석<HelpTip text="GICS 산업분류 기준 섹터 배분입니다. 합성 ETF는 실제 주식을 보유하지 않아 섹터가 '기타'로 표시될 수 있습니다." /></h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DonutChart title="섹터 배분" items={portfolio.sector} colors={SECTOR_COLORS} />
            <DonutChart title="국가 배분" items={portfolio.country} colors={COUNTRY_COLORS} />
            <DonutChart title="자산 유형" items={portfolio.asset} colors={ASSET_COLORS} />
          </div>
          {/* 구조 안내 문구 */}
          {(() => {
            const cash = portfolio.asset.find(a => a.name === "현금");
            const deriv = portfolio.asset.find(a => a.name === "파생상품");
            const bond = portfolio.asset.find(a => a.name === "채권");
            const equity = portfolio.asset.find(a => a.name === "주식");
            const cashW = cash?.weight ?? 0;
            const derivW = deriv?.weight ?? 0;
            const bondW = bond?.weight ?? 0;
            const equityW = equity?.weight ?? 0;

            const notes: Array<{bg: string; text: string}> = [];

            if (cashW > 80 && derivW > 0) {
              notes.push({
                bg: "bg-amber-50 border-amber-200 text-amber-800",
                text: `이 ETF는 합성(Synthetic) 구조입니다. 실제 주식을 보유하지 않고, 현금 담보(${cashW.toFixed(1)}%) + 스왑/파생 계약(${derivW.toFixed(1)}%)으로 기초지수 수익률을 복제합니다. 거래상대방(증권사) 부도 시 원금 손실 위험, 담보 부족 위험, 물리적 복제 대비 높은 추적 오차, 계약 롤오버 비용이 발생할 수 있습니다.`,
              });
            }
            if (bondW > 50) {
              notes.push({
                bg: "bg-blue-50 border-blue-200 text-blue-800",
                text: `채권형 ETF입니다. 자산의 ${bondW.toFixed(1)}%가 채권으로 구성되어 있습니다.`,
              });
            }
            if (derivW > 30 && cashW < 80) {
              notes.push({
                bg: "bg-orange-50 border-orange-200 text-orange-800",
                text: `파생상품 비중이 ${derivW.toFixed(1)}%로 높습니다. 레버리지/인버스 상품일 수 있으며, 일별 수익률 배수를 추종하므로 복리 효과로 장기 보유 시 기초지수와 큰 괴리가 발생할 수 있습니다. 변동성이 클수록 손실이 확대됩니다.`,
              });
            }
            if (equityW > 0 && equityW < 50 && bondW > 0) {
              notes.push({
                bg: "bg-purple-50 border-purple-200 text-purple-800",
                text: `주식(${equityW.toFixed(1)}%)과 채권(${bondW.toFixed(1)}%)을 혼합한 자산배분형 ETF입니다.`,
              });
            }

            return notes.length > 0 ? (
              <div className="space-y-2 mt-3">
                {notes.map((note, i) => (
                  <div key={i} className={`px-3 py-2 rounded-lg border text-xs ${note.bg}`}>
                    <span>{note.text}</span>
                  </div>
                ))}
              </div>
            ) : null;
          })()}
          <p className="text-xs text-gray-400 mt-2">
            * 출처: 네이버 금융 ETF 분석
          </p>
        </div>
      )}

      {/* Holdings visualization */}
      {holdings.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-800">
            구성 종목 TOP 10
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-0">
                <CardTitle className="text-sm text-gray-600">비중 분포</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <PieChart holdings={holdings} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-0">
                <CardTitle className="text-sm text-gray-600">비중 막대</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <WeightBars holdings={holdings} />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState, useCallback } from "react";
import { createChart, LineSeries } from "lightweight-charts";
import { api } from "@/shared/api/client";
import type {
  ETF,
  ETFListResponse,
  DailyPrice,
  CompareItem,
  ReturnsData,
} from "@/shared/api/types";
import { formatReturn, returnColor } from "@/shared/lib/utils";
import { Input } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/shared/ui/table";

const LINE_COLORS = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b"];

interface PortfolioBreakdown {
  ticker: string;
  sector: Array<{code: string; name: string; weight: number}>;
  country: Array<{code: string; name: string; weight: number}>;
  asset: Array<{code: string; name: string; weight: number}>;
}

const RETURN_LABELS: { key: keyof ReturnsData; label: string }[] = [
  { key: "1w", label: "1주" },
  { key: "1m", label: "1개월" },
  { key: "3m", label: "3개월" },
  { key: "6m", label: "6개월" },
  { key: "1y", label: "1년" },
];

interface PriceDataMap {
  [ticker: string]: DailyPrice[];
}

function OverlayChart({
  priceData,
  tickers,
  tickerNames,
}: {
  priceData: PriceDataMap;
  tickers: string[];
  tickerNames: Record<string, string>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || tickers.length === 0) return;

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

    tickers.forEach((ticker, idx) => {
      const prices = priceData[ticker];
      if (!prices || prices.length === 0) return;

      const sorted = [...prices].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // Normalize to percentage change from first price
      const basePrice = sorted[0].close;
      const normalizedData = sorted.map((p) => ({
        time: p.date as string,
        value: ((p.close - basePrice) / basePrice) * 100,
      }));

      const series = chart.addSeries(LineSeries, {
        color: LINE_COLORS[idx % LINE_COLORS.length],
        lineWidth: 2,
        title: tickerNames[ticker] || ticker,
      });

      series.setData(normalizedData);
    });

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
  }, [priceData, tickers, tickerNames]);

  return <div ref={containerRef} className="w-full" />;
}

interface OverlapItem {
  stock_name: string;
  weight_a: number;
  weight_b: number;
}

interface OverlapData {
  ticker_a: string;
  ticker_b: string;
  common_count: number;
  only_a_count: number;
  only_b_count: number;
  total_overlap_weight_a: number;
  total_overlap_weight_b: number;
  overlap: OverlapItem[];
}

export default function ETFCompare() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ETF[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedTickers, setSelectedTickers] = useState<string[]>([]);
  const [tickerNames, setTickerNames] = useState<Record<string, string>>({});
  const [compareData, setCompareData] = useState<CompareItem[]>([]);
  const [priceData, setPriceData] = useState<PriceDataMap>({});
  const [overlapData, setOverlapData] = useState<OverlapData | null>(null);
  const [portfolioData, setPortfolioData] = useState<Record<string, PortfolioBreakdown>>({});
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Search ETFs
  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query);
      if (query.length < 2) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      try {
        const res: ETFListResponse = await api.getETFs({
          search: query,
          size: 10,
        });
        if (mountedRef.current) {
          setSearchResults(
            res.items.filter((e) => !selectedTickers.includes(e.ticker))
          );
        }
      } catch {
        // ignore search errors
      } finally {
        if (mountedRef.current) setSearching(false);
      }
    },
    [selectedTickers]
  );

  // Add ticker
  const addTicker = useCallback(
    (etf: ETF) => {
      if (selectedTickers.length >= 4) return;
      if (selectedTickers.includes(etf.ticker)) return;
      setSelectedTickers((prev) => [...prev, etf.ticker]);
      setTickerNames((prev) => ({ ...prev, [etf.ticker]: etf.name }));
      setSearchQuery("");
      setSearchResults([]);
    },
    [selectedTickers]
  );

  // Remove ticker
  const removeTicker = useCallback((ticker: string) => {
    setSelectedTickers((prev) => prev.filter((t) => t !== ticker));
    setPriceData((prev) => {
      const next = { ...prev };
      delete next[ticker];
      return next;
    });
  }, []);

  // Fetch comparison data when tickers change
  useEffect(() => {
    if (selectedTickers.length < 2) {
      setCompareData([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    // Fetch compare data + price data for all tickers
    const fetchAll = async () => {
      try {
        const [compareRes, ...priceResults] = await Promise.all([
          api.compare(selectedTickers),
          ...selectedTickers.map((t) =>
            api.getETFPrices(t, 365).catch(() => ({
              ticker: t,
              total: 0,
              items: [] as DailyPrice[],
            }))
          ),
        ]);

        if (cancelled || !mountedRef.current) return;

        setCompareData(compareRes.items);
        const newPriceData: PriceDataMap = {};
        priceResults.forEach((res, i) => {
          newPriceData[selectedTickers[i]] = res.items;
        });
        setPriceData(newPriceData);
      } catch {
        // ignore errors
      } finally {
        if (!cancelled && mountedRef.current) setLoading(false);
      }
    };

    fetchAll();

    return () => {
      cancelled = true;
    };
  }, [selectedTickers]);

  // Also fetch price data when there's only one ticker
  useEffect(() => {
    if (selectedTickers.length !== 1) return;
    let cancelled = false;
    const ticker = selectedTickers[0];

    api
      .getETFPrices(ticker, 365)
      .then((res) => {
        if (!cancelled && mountedRef.current) {
          setPriceData({ [ticker]: res.items });
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [selectedTickers]);

  // Fetch holdings overlap when exactly 2 tickers selected
  useEffect(() => {
    if (selectedTickers.length !== 2) {
      setOverlapData(null);
      return;
    }
    let cancelled = false;
    api
      .holdingsOverlap(selectedTickers[0], selectedTickers[1])
      .then((data: OverlapData) => {
        if (!cancelled && mountedRef.current) setOverlapData(data);
      })
      .catch(() => {
        if (!cancelled && mountedRef.current) setOverlapData(null);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedTickers]);

  // Fetch portfolio breakdown for sector comparison when 2+ tickers
  useEffect(() => {
    if (selectedTickers.length < 2) {
      setPortfolioData({});
      return;
    }
    let cancelled = false;
    Promise.all(
      selectedTickers.map((t) =>
        api.getPortfolioBreakdown(t).catch(() => null)
      )
    ).then((results) => {
      if (cancelled || !mountedRef.current) return;
      const map: Record<string, PortfolioBreakdown> = {};
      results.forEach((res, i) => {
        if (res) map[selectedTickers[i]] = res;
      });
      setPortfolioData(map);
    });
    return () => { cancelled = true; };
  }, [selectedTickers]);

  // Build sector comparison data
  const sectorCompareRows = (() => {
    if (selectedTickers.length < 2 || Object.keys(portfolioData).length < 2) return [];
    const sectorMap: Record<string, Record<string, number>> = {};
    const sectorNames: Record<string, string> = {};
    selectedTickers.forEach((t) => {
      const pf = portfolioData[t];
      if (!pf) return;
      pf.sector.forEach((s) => {
        if (!sectorMap[s.code]) sectorMap[s.code] = {};
        sectorMap[s.code][t] = s.weight;
        sectorNames[s.code] = s.name;
      });
    });
    return Object.entries(sectorMap)
      .map(([code, weights]) => ({
        code,
        name: sectorNames[code],
        weights,
        maxWeight: Math.max(...Object.values(weights)),
      }))
      .sort((a, b) => b.maxWeight - a.maxWeight);
  })();

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">ETF 비교</h1>

      {/* Search */}
      <div className="relative mb-4">
        <Input
          type="text"
          placeholder="ETF 이름 또는 티커 검색 (최대 4개)..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          disabled={selectedTickers.length >= 4}
          className="max-w-md"
        />
        {searchResults.length > 0 && (
          <div className="absolute z-10 mt-1 w-full max-w-md bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {searchResults.map((etf) => (
              <button
                key={etf.ticker}
                onClick={() => addTicker(etf)}
                className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm flex justify-between items-center"
              >
                <span className="font-medium">{etf.name}</span>
                <span className="text-gray-400 font-mono text-xs">
                  {etf.ticker}
                </span>
              </button>
            ))}
          </div>
        )}
        {searching && (
          <div className="absolute z-10 mt-1 w-full max-w-md bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm text-gray-400">
            검색 중...
          </div>
        )}
      </div>

      {/* Selected tickers */}
      {selectedTickers.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedTickers.map((ticker, idx) => (
            <Badge
              key={ticker}
              className="text-sm font-medium text-white cursor-pointer"
              style={{
                backgroundColor: LINE_COLORS[idx % LINE_COLORS.length],
              }}
              onClick={() => removeTicker(ticker)}
            >
              {tickerNames[ticker] || ticker}
              <span className="ml-1 font-bold">x</span>
            </Badge>
          ))}
        </div>
      )}

      {/* Chart */}
      {selectedTickers.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">수익률 비교 차트 (%)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[400px] bg-gray-100 rounded animate-pulse flex items-center justify-center text-gray-400">
                차트 로딩 중...
              </div>
            ) : (
              <OverlayChart
                priceData={priceData}
                tickers={selectedTickers}
                tickerNames={tickerNames}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Comparison table */}
      {compareData.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-800">
            수익률 비교
          </h2>
          <div className="border border-gray-200 rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ETF</TableHead>
                  {RETURN_LABELS.map(({ key, label }) => (
                    <TableHead key={key} className="text-right">
                      {label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {compareData.map((item, idx) => (
                  <TableRow key={item.ticker}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor:
                              LINE_COLORS[idx % LINE_COLORS.length],
                          }}
                        />
                        <span className="font-medium text-gray-900">
                          {item.name}
                        </span>
                        <span className="text-gray-400 font-mono text-xs">
                          {item.ticker}
                        </span>
                      </div>
                    </TableCell>
                    {RETURN_LABELS.map(({ key }) => (
                      <TableCell
                        key={key}
                        className={`text-right font-mono ${returnColor(
                          item.returns[key]
                        )}`}
                      >
                        {formatReturn(item.returns[key])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Holdings overlap */}
      {overlapData && selectedTickers.length === 2 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-800">
            보유 종목 겹침 분석
          </h2>
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="bg-blue-50 rounded-lg px-4 py-2">
                  <span className="text-gray-600">공통 종목</span>
                  <span className="ml-2 font-bold text-blue-700">
                    {overlapData.common_count}개
                  </span>
                </div>
                <div className="bg-gray-50 rounded-lg px-4 py-2">
                  <span className="text-gray-600">
                    {tickerNames[selectedTickers[0]] || selectedTickers[0]} 전용
                  </span>
                  <span className="ml-2 font-bold text-gray-700">
                    {overlapData.only_a_count}개
                  </span>
                </div>
                <div className="bg-gray-50 rounded-lg px-4 py-2">
                  <span className="text-gray-600">
                    {tickerNames[selectedTickers[1]] || selectedTickers[1]} 전용
                  </span>
                  <span className="ml-2 font-bold text-gray-700">
                    {overlapData.only_b_count}개
                  </span>
                </div>
                <div className="bg-green-50 rounded-lg px-4 py-2">
                  <span className="text-gray-600">겹침 비중</span>
                  <span className="ml-2 font-bold text-green-700">
                    A: {overlapData.total_overlap_weight_a.toFixed(1)}%, B:{" "}
                    {overlapData.total_overlap_weight_b.toFixed(1)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          {overlapData.overlap.length > 0 && (
            <div className="border border-gray-200 rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>종목명</TableHead>
                    <TableHead className="text-right">
                      {tickerNames[selectedTickers[0]] || selectedTickers[0]} 비중
                    </TableHead>
                    <TableHead className="w-40" />
                    <TableHead className="text-right">
                      {tickerNames[selectedTickers[1]] || selectedTickers[1]} 비중
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overlapData.overlap.slice(0, 20).map((item) => {
                    const maxW = Math.max(item.weight_a, item.weight_b);
                    return (
                      <TableRow key={item.stock_name}>
                        <TableCell className="text-gray-900">
                          {item.stock_name}
                        </TableCell>
                        <TableCell className="text-right font-mono text-gray-700">
                          {item.weight_a.toFixed(2)}%
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 h-4">
                            <div className="flex-1 flex justify-end">
                              <div
                                className="bg-red-400 h-full rounded-l"
                                style={{
                                  width: `${maxW > 0 ? (item.weight_a / maxW) * 100 : 0}%`,
                                }}
                              />
                            </div>
                            <div className="flex-1">
                              <div
                                className="bg-blue-400 h-full rounded-r"
                                style={{
                                  width: `${maxW > 0 ? (item.weight_b / maxW) * 100 : 0}%`,
                                }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-gray-700">
                          {item.weight_b.toFixed(2)}%
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* Sector comparison table */}
      {sectorCompareRows.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-800">섹터 비교</h2>
          <div className="border border-gray-200 rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>섹터</TableHead>
                  {selectedTickers.map((t, idx) => (
                    <TableHead key={t} className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: LINE_COLORS[idx % LINE_COLORS.length] }}
                        />
                        <span className="truncate max-w-[120px]">{tickerNames[t] || t}</span>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sectorCompareRows.map((row) => (
                  <TableRow key={row.code}>
                    <TableCell className="font-medium text-gray-700">{row.name}</TableCell>
                    {selectedTickers.map((t) => {
                      const w = row.weights[t] ?? 0;
                      const maxInRow = row.maxWeight;
                      const intensity = maxInRow > 0 ? Math.round((w / maxInRow) * 100) : 0;
                      return (
                        <TableCell
                          key={t}
                          className="text-right font-mono"
                          style={{
                            backgroundColor: w > 0
                              ? `rgba(37, 99, 235, ${intensity / 400 + 0.03})`
                              : undefined,
                          }}
                        >
                          {w > 0 ? `${w.toFixed(1)}%` : "-"}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            * 출처: 네이버 금융 ETF 분석. 셀 색상이 진할수록 해당 행에서 비중이 높습니다.
          </p>
        </div>
      )}

      {selectedTickers.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">비교할 ETF를 검색하여 추가하세요</p>
          <p className="text-sm">최대 4개까지 비교할 수 있습니다</p>
        </div>
      )}

      {selectedTickers.length === 1 && !loading && (
        <div className="text-center py-8 text-gray-400 text-sm">
          비교를 위해 ETF를 하나 더 추가하세요
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState, useCallback } from "react";
import { createChart, LineSeries } from "lightweight-charts";
import { api } from "../api/client";
import type { ETF, ETFListResponse, CorrelationResponse } from "../api/types";
import HelpTip from "../components/HelpTip";
import CorrelationHeatmap from "../components/CorrelationHeatmap";

interface PortfolioETF {
  ticker: string;
  name: string;
  weight: number; // 0-100
}

interface IndividualStat {
  ticker: string;
  weight: number;
  annual_return: number;
  annual_volatility: number;
  sharpe_ratio: number;
  total_annual_return?: number;
  total_sharpe_ratio?: number;
}

interface AnalysisResult {
  annual_return: number;
  annual_volatility: number;
  sharpe_ratio: number;
  max_drawdown: number;
  risk_free_rate: number;
  total_annual_return: number;
  total_sharpe_ratio: number;
  cumulative_returns: Array<{ date: string; price: number; total: number }>;
  individual: IndividualStat[];
}

function sharpeColor(val: number): string {
  if (val >= 2.0) return "text-green-600";
  if (val >= 1.0) return "text-blue-600";
  if (val >= 0.5) return "text-gray-600";
  return "text-red-600";
}

function sharpeBg(val: number): string {
  if (val >= 2.0) return "bg-green-50 border-green-200";
  if (val >= 1.0) return "bg-blue-50 border-blue-200";
  if (val >= 0.5) return "bg-gray-50 border-gray-200";
  return "bg-red-50 border-red-200";
}

function sharpeLabel(val: number): string {
  if (val >= 2.0) return "우수";
  if (val >= 1.0) return "양호";
  if (val >= 0.5) return "보통";
  return "부진";
}

function CumulativeChart({
  data,
}: {
  data: Array<{ date: string; price: number; total: number }>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 350,
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

    const priceSeries = chart.addSeries(LineSeries, {
      color: "#3b82f6",
      lineWidth: 2,
      title: "가격 수익률 (%)",
    });
    priceSeries.setData(
      data.map((d) => ({ time: d.date as string, value: d.price }))
    );

    const totalSeries = chart.addSeries(LineSeries, {
      color: "#16a34a",
      lineWidth: 2,
      lineStyle: 0,
      title: "배당 포함 (%)",
    });
    totalSeries.setData(
      data.map((d) => ({ time: d.date as string, value: d.total }))
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
  }, [data]);

  return <div ref={containerRef} className="w-full" />;
}

export default function Portfolio() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ETF[]>([]);
  const [searching, setSearching] = useState(false);
  const [portfolio, setPortfolio] = useState<PortfolioETF[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [correlation, setCorrelation] = useState<CorrelationResponse | null>(null);
  const [years, setYears] = useState(1);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const totalWeight = portfolio.reduce((sum, p) => sum + p.weight, 0);
  const isWeightValid = Math.abs(totalWeight - 100) < 0.1;

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
          const existingTickers = portfolio.map((p) => p.ticker);
          setSearchResults(
            res.items.filter((e) => !existingTickers.includes(e.ticker))
          );
        }
      } catch {
        // ignore search errors
      } finally {
        if (mountedRef.current) setSearching(false);
      }
    },
    [portfolio]
  );

  // Add ETF to portfolio
  const addETF = useCallback(
    (etf: ETF) => {
      if (portfolio.length >= 10) return;
      if (portfolio.some((p) => p.ticker === etf.ticker)) return;

      // Default weight: split remaining equally or 0
      const remaining = Math.max(0, 100 - totalWeight);
      const defaultWeight =
        portfolio.length === 0
          ? 100
          : Math.min(remaining, Math.round(100 / (portfolio.length + 1)));

      setPortfolio((prev) => [
        ...prev,
        { ticker: etf.ticker, name: etf.name, weight: defaultWeight },
      ]);
      setSearchQuery("");
      setSearchResults([]);
    },
    [portfolio, totalWeight]
  );

  // Remove ETF from portfolio
  const removeETF = useCallback((ticker: string) => {
    setPortfolio((prev) => prev.filter((p) => p.ticker !== ticker));
  }, []);

  // Update weight
  const updateWeight = useCallback((ticker: string, weight: number) => {
    setPortfolio((prev) =>
      prev.map((p) =>
        p.ticker === ticker ? { ...p, weight: Math.max(0, Math.min(100, weight)) } : p
      )
    );
  }, []);

  // Equal weight distribution
  const equalizeWeights = useCallback(() => {
    if (portfolio.length === 0) return;
    const equalWeight = Math.round((100 / portfolio.length) * 100) / 100;
    setPortfolio((prev) => {
      const updated = prev.map((p, i) => ({
        ...p,
        weight: i < prev.length - 1 ? equalWeight : +(100 - equalWeight * (prev.length - 1)).toFixed(2),
      }));
      return updated;
    });
  }, [portfolio.length]);

  // Analyze portfolio
  const analyze = useCallback(async () => {
    if (!isWeightValid || portfolio.length === 0) return;
    setAnalyzing(true);
    setError(null);
    setCorrelation(null);
    try {
      const items = portfolio.map((p) => ({
        ticker: p.ticker,
        weight: p.weight,
      }));
      const tickers = portfolio.map((p) => p.ticker);

      // 포트폴리오 분석 + 상관관계 동시 요청
      const [analysisRes, corrRes] = await Promise.allSettled([
        api.analyzePortfolio(items, years),
        tickers.length >= 2 ? api.getPortfolioCorrelation(tickers, years) : Promise.resolve(null),
      ]);

      if (mountedRef.current) {
        if (analysisRes.status === "fulfilled") {
          setResult(analysisRes.value);
        } else {
          throw new Error(analysisRes.reason?.message || "분석에 실패했습니다");
        }
        if (corrRes.status === "fulfilled" && corrRes.value) {
          setCorrelation(corrRes.value);
        }
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setError(err.message || "분석에 실패했습니다");
      }
    } finally {
      if (mountedRef.current) setAnalyzing(false);
    }
  }, [portfolio, isWeightValid]);

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        포트폴리오 시뮬레이터
        <HelpTip text="ETF를 조합하여 가상 포트폴리오를 구성하고, 과거 1년 데이터를 기반으로 수익률, 변동성, 샤프 비율, 최대 낙폭(MDD)을 분석합니다." />
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left panel: ETF selection */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3 text-gray-800">
              ETF 선택
            </h2>

            {/* Search input */}
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="ETF 이름 또는 티커 검색..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                disabled={portfolio.length >= 10}
                className="border border-gray-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100"
              />
              {searchResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map((etf) => (
                    <button
                      key={etf.ticker}
                      onClick={() => addETF(etf)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm flex justify-between items-center"
                    >
                      <span className="font-medium truncate mr-2">
                        {etf.name}
                      </span>
                      <span className="text-gray-400 font-mono text-xs flex-shrink-0">
                        {etf.ticker}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {searching && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm text-gray-400">
                  검색 중...
                </div>
              )}
            </div>

            {/* Portfolio items */}
            {portfolio.length > 0 && (
              <div className="space-y-3 mb-4">
                {portfolio.map((item) => (
                  <div
                    key={item.ticker}
                    className="border border-gray-100 rounded-lg p-3 bg-gray-50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 truncate">
                          {item.name}
                        </div>
                        <div className="text-xs text-gray-400 font-mono">
                          {item.ticker}
                        </div>
                      </div>
                      <button
                        onClick={() => removeETF(item.ticker)}
                        className="ml-2 text-gray-400 hover:text-red-500 text-sm font-bold flex-shrink-0"
                      >
                        x
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={0.5}
                        value={item.weight}
                        onChange={(e) =>
                          updateWeight(item.ticker, parseFloat(e.target.value))
                        }
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          value={item.weight}
                          onChange={(e) =>
                            updateWeight(
                              item.ticker,
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-16 text-right border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                        <span className="text-sm text-gray-500">%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Weight summary */}
            {portfolio.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">비중 합계</span>
                  <span
                    className={`text-sm font-bold ${
                      isWeightValid
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {totalWeight.toFixed(1)}% / 100%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      isWeightValid
                        ? "bg-green-500"
                        : totalWeight > 100
                        ? "bg-red-500"
                        : "bg-yellow-500"
                    }`}
                    style={{ width: `${Math.min(totalWeight, 100)}%` }}
                  />
                </div>
                {!isWeightValid && (
                  <p className="text-xs text-red-500 mt-1">
                    비중 합이 100%가 되어야 합니다
                  </p>
                )}
              </div>
            )}

            {/* Action buttons */}
            {portfolio.length > 0 && (
              <>
                <div className="flex gap-2">
                  <button
                    onClick={equalizeWeights}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-100 transition"
                  >
                    균등 배분
                  </button>
                  <button
                    onClick={analyze}
                    disabled={!isWeightValid || analyzing}
                    className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium"
                  >
                    {analyzing ? "분석 중..." : "분석"}
                  </button>
                </div>
                <div className="flex gap-1 mt-2">
                  {[1, 3, 5].map((y) => (
                    <button
                      key={y}
                      onClick={() => setYears(y)}
                      className={`flex-1 px-2 py-1.5 text-xs rounded transition ${
                        years === y
                          ? "bg-gray-800 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {y}년
                    </button>
                  ))}
                </div>
              </>
            )}

            {portfolio.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">
                ETF를 검색하여 추가하세요
                <br />
                <span className="text-xs">(최대 10개)</span>
              </div>
            )}
          </div>
        </div>

        {/* Right panel: Results */}
        <div className="lg:col-span-2">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
              {error}
            </div>
          )}

          {analyzing && (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
              <div className="animate-pulse text-gray-400">
                포트폴리오 분석 중...
              </div>
            </div>
          )}

          {!analyzing && result && (
            <>
              {/* Key metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-3">
                <div className={`border rounded-lg p-4 ${result.annual_return >= 0 ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200"}`}>
                  <div className="text-xs text-gray-500 mb-1">연 수익률 (가격)</div>
                  <div className={`text-xl font-bold ${result.annual_return >= 0 ? "text-red-600" : "text-blue-600"}`}>
                    {result.annual_return >= 0 ? "+" : ""}
                    {result.annual_return.toFixed(2)}%
                  </div>
                </div>
                <div className={`border rounded-lg p-4 ${result.total_annual_return >= 0 ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200"}`}>
                  <div className="text-xs text-gray-500 mb-1">연 수익률 (배당 포함) <HelpTip text="TTM 배당수익률을 일할 계산하여 일별 수익률에 가산한 추정치입니다." /></div>
                  <div className={`text-xl font-bold ${result.total_annual_return >= 0 ? "text-red-600" : "text-blue-600"}`}>
                    {result.total_annual_return >= 0 ? "+" : ""}
                    {result.total_annual_return.toFixed(2)}%
                  </div>
                </div>
                <div className={`border rounded-lg p-4 ${sharpeBg(result.sharpe_ratio)}`}>
                  <div className="text-xs text-gray-500 mb-1">
                    샤프 비율 (가격)
                    <HelpTip text="위험 대비 초과 수익률. (연 수익률 - 무위험 수익률) / 연 변동성." />
                  </div>
                  <div className={`text-xl font-bold ${sharpeColor(result.sharpe_ratio)}`}>
                    {result.sharpe_ratio.toFixed(2)}
                  </div>
                  <div className={`text-xs ${sharpeColor(result.sharpe_ratio)}`}>
                    {sharpeLabel(result.sharpe_ratio)}
                  </div>
                </div>
                <div className={`border rounded-lg p-4 ${sharpeBg(result.total_sharpe_ratio)}`}>
                  <div className="text-xs text-gray-500 mb-1">
                    샤프 비율 (배당 포함)
                  </div>
                  <div className={`text-xl font-bold ${sharpeColor(result.total_sharpe_ratio)}`}>
                    {result.total_sharpe_ratio.toFixed(2)}
                  </div>
                  <div className={`text-xs ${sharpeColor(result.total_sharpe_ratio)}`}>
                    {sharpeLabel(result.total_sharpe_ratio)}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="text-xs text-gray-500 mb-1">
                    연 변동성
                    <HelpTip text="연환산 변동성 (표본 표준편차 × √252). 낮을수록 안정적입니다." />
                  </div>
                  <div className="text-xl font-bold text-gray-800">
                    {result.annual_volatility.toFixed(2)}%
                  </div>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="text-xs text-gray-500 mb-1">
                    최대 낙폭
                    <HelpTip text="MDD (Maximum Drawdown). 고점 대비 최대 하락폭입니다." />
                  </div>
                  <div className="text-xl font-bold text-orange-600">
                    -{result.max_drawdown.toFixed(2)}%
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="text-xs text-gray-500 mb-1">
                    무위험 수익률
                    <HelpTip text="한국 국채 3년물 금리. 샤프 비율 계산의 기준입니다." />
                  </div>
                  <div className="text-xl font-bold text-gray-600">
                    {result.risk_free_rate.toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Cumulative return chart */}
              {result.cumulative_returns.length > 0 && (
                <div className="mb-6 border border-gray-200 rounded-lg p-4 bg-white">
                  <h2 className="text-lg font-semibold mb-3 text-gray-800">
                    누적 수익률 (%)
                  </h2>
                  <CumulativeChart data={result.cumulative_returns} />
                </div>
              )}

              {/* Correlation heatmap */}
              {correlation && portfolio.length >= 2 && (
                <div className="mb-6">
                  <CorrelationHeatmap
                    tickers={correlation.tickers}
                    names={correlation.tickers.map(
                      (t) => portfolio.find((p) => p.ticker === t)?.name || t
                    )}
                    matrix={correlation.matrix}
                    tailMatrix={correlation.tail_matrix}
                  />
                </div>
              )}

              {/* Individual ETF comparison table */}
              {result.individual.length > 0 && (
                <div className="border border-gray-200 rounded-lg bg-white">
                  <h2 className="text-lg font-semibold px-4 pt-4 pb-2 text-gray-800">
                    개별 ETF 분석
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left px-4 py-2.5 font-semibold text-gray-700">
                            ETF
                          </th>
                          <th className="text-right px-4 py-2.5 font-semibold text-gray-700">
                            비중
                          </th>
                          <th className="text-right px-4 py-2.5 font-semibold text-gray-700">
                            연 수익률
                          </th>
                          <th className="text-right px-4 py-2.5 font-semibold text-gray-700">
                            배당 포함
                          </th>
                          <th className="text-right px-4 py-2.5 font-semibold text-gray-700">
                            연 변동성
                          </th>
                          <th className="text-right px-4 py-2.5 font-semibold text-gray-700">
                            샤프
                          </th>
                          <th className="text-right px-4 py-2.5 font-semibold text-gray-700">
                            샤프 (배당)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {result.individual.map((item) => {
                          const etf = portfolio.find(
                            (p) => p.ticker === item.ticker
                          );
                          const totalReturn = item.total_annual_return ?? item.annual_return;
                          const totalSharpe = item.total_sharpe_ratio ?? item.sharpe_ratio;
                          return (
                            <tr
                              key={item.ticker}
                              className="hover:bg-gray-50"
                            >
                              <td className="px-4 py-2.5">
                                <div className="font-medium text-gray-900">
                                  {etf?.name || item.ticker}
                                </div>
                                <div className="text-xs text-gray-400 font-mono">
                                  {item.ticker}
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono text-gray-700">
                                {item.weight.toFixed(1)}%
                              </td>
                              <td
                                className={`px-4 py-2.5 text-right font-mono ${
                                  item.annual_return >= 0
                                    ? "text-red-600"
                                    : "text-blue-600"
                                }`}
                              >
                                {item.annual_return >= 0 ? "+" : ""}
                                {item.annual_return.toFixed(2)}%
                              </td>
                              <td
                                className={`px-4 py-2.5 text-right font-mono ${
                                  totalReturn >= 0
                                    ? "text-red-600"
                                    : "text-blue-600"
                                }`}
                              >
                                {totalReturn >= 0 ? "+" : ""}
                                {totalReturn.toFixed(2)}%
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono text-gray-700">
                                {item.annual_volatility.toFixed(2)}%
                              </td>
                              <td
                                className={`px-4 py-2.5 text-right font-mono font-medium ${sharpeColor(
                                  item.sharpe_ratio
                                )}`}
                              >
                                {item.sharpe_ratio.toFixed(2)}
                              </td>
                              <td
                                className={`px-4 py-2.5 text-right font-mono font-medium ${sharpeColor(
                                  totalSharpe
                                )}`}
                              >
                                {totalSharpe.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                        {/* Portfolio total row */}
                        <tr className="bg-blue-50 font-semibold">
                          <td className="px-4 py-2.5 text-gray-800">
                            포트폴리오 합계
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-gray-800">
                            100%
                          </td>
                          <td
                            className={`px-4 py-2.5 text-right font-mono ${
                              result.annual_return >= 0
                                ? "text-red-600"
                                : "text-blue-600"
                            }`}
                          >
                            {result.annual_return >= 0 ? "+" : ""}
                            {result.annual_return.toFixed(2)}%
                          </td>
                          <td
                            className={`px-4 py-2.5 text-right font-mono ${
                              result.total_annual_return >= 0
                                ? "text-red-600"
                                : "text-blue-600"
                            }`}
                          >
                            {result.total_annual_return >= 0 ? "+" : ""}
                            {result.total_annual_return.toFixed(2)}%
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-gray-800">
                            {result.annual_volatility.toFixed(2)}%
                          </td>
                          <td
                            className={`px-4 py-2.5 text-right font-mono ${sharpeColor(
                              result.sharpe_ratio
                            )}`}
                          >
                            {result.sharpe_ratio.toFixed(2)}
                          </td>
                          <td
                            className={`px-4 py-2.5 text-right font-mono ${sharpeColor(
                              result.total_sharpe_ratio
                            )}`}
                          >
                            {result.total_sharpe_ratio.toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {!analyzing && !result && (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-400">
              <p className="text-lg mb-2">포트폴리오를 구성하고 분석하세요</p>
              <p className="text-sm">
                ETF를 추가하고 비중을 조절한 후 "분석" 버튼을 누르면
                <br />
                과거 1년 데이터 기반으로 성과를 분석합니다
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

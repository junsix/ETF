import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import HelpTip from "../components/HelpTip";

interface IndicatorItem {
  symbol: string;
  name: string;
  price: number;
  change: number | null;
  change_pct: number | null;
  unit?: string;
}

interface MarketData {
  indices: IndicatorItem[];
  exchange: IndicatorItem[];
  commodities: IndicatorItem[];
  bonds: IndicatorItem[];
  sentiment: IndicatorItem[];
}

function IndicatorCard({
  name,
  price,
  change,
  change_pct,
  unit,
}: {
  name: string;
  price: number;
  change: number | null;
  change_pct: number | null;
  unit?: string;
}) {
  const isUp = (change ?? 0) > 0;
  const isDown = (change ?? 0) < 0;
  const color = isUp ? "text-red-600" : isDown ? "text-blue-600" : "text-gray-600";
  const bg = isUp ? "bg-red-50" : isDown ? "bg-blue-50" : "bg-gray-50";
  const arrow = isUp ? "▲" : isDown ? "▼" : "";

  return (
    <div className={`${bg} border rounded-lg p-4`}>
      <div className="text-sm text-gray-500 mb-1">{name}</div>
      <div className="text-xl font-bold">
        {price.toLocaleString()}
        {unit ? ` ${unit}` : ""}
      </div>
      {change !== null && (
        <div className={`text-sm font-medium ${color}`}>
          {arrow} {change > 0 ? "+" : ""}
          {change.toLocaleString()}{" "}
          {change_pct !== null
            ? `(${change_pct > 0 ? "+" : ""}${change_pct}%)`
            : ""}
        </div>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-gray-50 border rounded-lg p-4 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
      <div className="h-6 bg-gray-200 rounded w-28 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-32" />
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-gray-800 mb-3">{title}</h2>
      {children}
    </section>
  );
}

function formatVolume(vol: number): string {
  if (vol >= 1_000_000_000) return `${(vol / 1_000_000_000).toFixed(1)}B`;
  if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `${(vol / 1_000).toFixed(0)}K`;
  return String(vol);
}

export default function Market() {
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topVolume, setTopVolume] = useState<Array<{ticker: string; volume: number}>>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getMarketIndicators()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const today = new Date().toISOString().slice(0, 10);
    api.getTopVolume(today, 10)
      .then((items) => {
        if (!cancelled) setTopVolume(items.map((d) => ({ ticker: d.ticker, volume: d.volume })));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">글로벌 시장 지표<HelpTip text="글로벌 지수는 Yahoo Finance, 환율/원자재/채권은 네이버 금융에서 제공됩니다. 지연된 시세가 포함될 수 있습니다." /></h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 mb-4 text-sm">
          데이터를 불러오는데 실패했습니다: {error}
        </div>
      )}

      {/* 주요 지수 */}
      <Section title="주요 지수">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
            : data?.indices.map((item) => (
                <IndicatorCard key={item.symbol} {...item} />
              ))}
          {!loading && (!data?.indices || data.indices.length === 0) && (
            <div className="col-span-full text-center text-gray-400 py-4">
              데이터 없음
            </div>
          )}
        </div>
      </Section>

      {/* 환율 */}
      <Section title="환율">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : data?.exchange.map((item) => (
                <IndicatorCard key={item.symbol} {...item} />
              ))}
          {!loading && (!data?.exchange || data.exchange.length === 0) && (
            <div className="col-span-full text-center text-gray-400 py-4">
              데이터 없음
            </div>
          )}
        </div>
      </Section>

      {/* 원자재 */}
      <Section title="원자재">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : data?.commodities.map((item) => (
                <IndicatorCard key={item.symbol} {...item} />
              ))}
          {!loading &&
            (!data?.commodities || data.commodities.length === 0) && (
              <div className="col-span-full text-center text-gray-400 py-4">
                데이터 없음
              </div>
            )}
        </div>
      </Section>

      {/* 채권/금리 */}
      <Section title="채권/금리">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {loading
            ? Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)
            : data?.bonds.map((item) => (
                <IndicatorCard key={item.symbol} {...item} />
              ))}
          {!loading && (!data?.bonds || data.bonds.length === 0) && (
            <div className="col-span-full text-center text-gray-400 py-4">
              데이터 없음
            </div>
          )}
        </div>
      </Section>

      {/* 시장 심리 */}
      <Section title="시장 심리">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {loading
            ? Array.from({ length: 1 }).map((_, i) => <SkeletonCard key={i} />)
            : data?.sentiment.map((item) => (
                <IndicatorCard key={item.symbol} {...item} />
              ))}
          {!loading && (!data?.sentiment || data.sentiment.length === 0) && (
            <div className="col-span-full text-center text-gray-400 py-4">
              데이터 없음
            </div>
          )}
        </div>
      </Section>

      {/* 거래량 TOP 10 */}
      <Section title="거래량 TOP 10">
        {topVolume.length > 0 ? (
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-center px-4 py-2.5 font-semibold text-gray-600 w-12">#</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600">티커</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-gray-600">거래량</th>
                </tr>
              </thead>
              <tbody>
                {topVolume.map((item, idx) => (
                  <tr key={item.ticker} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                    <td className="text-center px-4 py-2.5 font-mono text-gray-400">{idx + 1}</td>
                    <td className="px-4 py-2.5 font-mono">
                      <Link to={`/etf/${item.ticker}`} className="text-blue-600 hover:underline">
                        {item.ticker}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-700">{formatVolume(item.volume)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-gray-400 py-4">데이터 없음</div>
        )}
      </Section>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/shared/api/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/shared/ui/table";

interface Signal {
  type: string;
  text: string;
}

interface Tilt {
  sector: string;
  direction: string;
  conviction: string;
  reason: string;
}

interface Pick {
  asset_class: string;
  name: string;
  ticker: string;
  weight: number;
  reason: string;
}

interface Decision {
  allocation: Record<string, number>;
  allocation_reasons?: string[];
  tilts: Tilt[];
  picks: Pick[];
  risk_params: Record<string, any>;
}

interface DruckenmillerData {
  overall: string;
  overall_text: string;
  stance: string;
  signals: Signal[];
  decision: Decision;
  macro_snapshot: Record<string, number>;
}

const STANCE_COLORS: Record<string, string> = {
  aggressive: "bg-red-600 text-white",
  offensive: "bg-orange-500 text-white",
  neutral: "bg-gray-500 text-white",
  cautious: "bg-yellow-500 text-white",
  defensive: "bg-blue-600 text-white",
};

const SIGNAL_STYLES: Record<string, { border: string; bg: string; badge: string; label: string }> = {
  bullish: {
    border: "border-green-300",
    bg: "bg-green-50",
    badge: "bg-green-600 text-white",
    label: "Bullish",
  },
  opportunity: {
    border: "border-green-300",
    bg: "bg-green-50",
    badge: "bg-green-600 text-white",
    label: "Opportunity",
  },
  bearish: {
    border: "border-red-300",
    bg: "bg-red-50",
    badge: "bg-red-600 text-white",
    label: "Bearish",
  },
  warning: {
    border: "border-red-300",
    bg: "bg-red-50",
    badge: "bg-red-600 text-white",
    label: "Warning",
  },
  cautious: {
    border: "border-yellow-300",
    bg: "bg-yellow-50",
    badge: "bg-yellow-600 text-white",
    label: "Cautious",
  },
  neutral: {
    border: "border-gray-300",
    bg: "bg-gray-50",
    badge: "bg-gray-500 text-white",
    label: "Neutral",
  },
  druckenmiller: {
    border: "border-purple-300",
    bg: "bg-purple-50",
    badge: "bg-purple-600 text-white",
    label: "Druckenmiller",
  },
};

const ALLOCATION_COLORS: Record<string, { bg: string; dot: string }> = {
  "국내주식": { bg: "bg-blue-500", dot: "bg-blue-500" },
  "해외주식": { bg: "bg-indigo-500", dot: "bg-indigo-500" },
  "채권": { bg: "bg-green-500", dot: "bg-green-500" },
  "원자재/금": { bg: "bg-amber-500", dot: "bg-amber-500" },
  "현금": { bg: "bg-gray-400", dot: "bg-gray-400" },
};

const DIRECTION_BADGE: Record<string, { style: string; label: string }> = {
  overweight: { style: "bg-green-600 text-white", label: "비중 확대" },
  underweight: { style: "bg-red-600 text-white", label: "비중 축소" },
  neutral: { style: "bg-gray-500 text-white", label: "중립" },
};

const MACRO_LABELS: Record<string, string> = {
  us10y: "US 10Y",
  us2y: "US 2Y",
  kr3y: "KR 3Y",
  yield_spread: "Yield Spread",
  usdkrw: "USD/KRW",
  dxy: "DXY",
};

const QUOTES = [
  "The way to build long-term returns is through preservation of capital and home runs.",
  "I've learned many things from George Soros, but perhaps the most significant is that it's not whether you're right or wrong, but how much money you make when you're right and how much you lose when you're wrong.",
  "The key to making money in stocks is not to get scared out of them.",
  "It's not about being right or wrong, rather, it's about how much money you make when you're right and how much you lose when you're wrong.",
  "I think the biggest mistake that most people make is that they don't have a big enough bet when they have conviction.",
];

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className ?? ""}`} />;
}

function LoadingSkeleton() {
  return (
    <div className="p-4 max-w-7xl mx-auto space-y-6">
      {/* Header skeleton */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <SkeletonBlock className="h-8 w-48" />
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-3/4" />
          <div className="flex gap-3 pt-2">
            <SkeletonBlock className="h-6 w-24" />
            <SkeletonBlock className="h-6 w-24" />
            <SkeletonBlock className="h-6 w-24" />
          </div>
        </CardContent>
      </Card>
      {/* Signal skeletons */}
      <div>
        <SkeletonBlock className="h-6 w-32 mb-3" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <SkeletonBlock className="h-5 w-20" />
                <SkeletonBlock className="h-4 w-full" />
                <SkeletonBlock className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      {/* Decision skeletons */}
      <div>
        <SkeletonBlock className="h-6 w-40 mb-3" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <SkeletonBlock className="h-5 w-28" />
                <SkeletonBlock className="h-5 w-20" />
                <SkeletonBlock className="h-4 w-full" />
                <SkeletonBlock className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function SignalCard({ signal }: { signal: Signal }) {
  const style = SIGNAL_STYLES[signal.type] ?? SIGNAL_STYLES.neutral;
  return (
    <Card className={`${style.border} ${style.bg}`}>
      <CardContent className="p-4">
        <Badge className={`${style.badge} mb-2`}>{style.label}</Badge>
        <p className="text-sm text-gray-800 leading-relaxed">{signal.text}</p>
      </CardContent>
    </Card>
  );
}

/* ---------- A. Asset Allocation Bar ---------- */
function AllocationBar({ allocation, reasons }: { allocation: Record<string, number>; reasons?: string[] }) {
  const entries = Object.entries(allocation);
  const total = entries.reduce((s, [, v]) => s + v, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">자산 배분</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Stacked horizontal bar */}
        <div className="flex h-7 w-full rounded-md overflow-hidden">
          {entries.map(([key, pct]) => {
            const color = ALLOCATION_COLORS[key]?.bg ?? "bg-gray-300";
            const widthPct = total > 0 ? (pct / total) * 100 : 0;
            return (
              <div
                key={key}
                className={`${color} relative group`}
                style={{ width: `${widthPct}%` }}
                title={`${key}: ${pct}%`}
              >
                {widthPct >= 10 && (
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white">
                    {pct}%
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {entries.map(([key, pct]) => {
            const dotColor = ALLOCATION_COLORS[key]?.dot ?? "bg-gray-400";
            return (
              <span key={key} className="flex items-center gap-1.5 text-sm text-gray-700">
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${dotColor}`} />
                {key} {pct}%
              </span>
            );
          })}
        </div>
        {/* Allocation reasons */}
        {reasons && reasons.length > 0 && (
          <div className="border-t pt-3 space-y-1">
            <p className="text-xs font-semibold text-gray-500">배분 근거</p>
            {reasons.map((r, i) => (
              <p key={i} className="text-xs text-gray-600">{r}</p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------- B. Sector Tilts ---------- */
function ConvictionDots({ conviction }: { conviction: string }) {
  const dots = [0, 1, 2];
  if (conviction === "high") {
    return (
      <span className="inline-flex gap-0.5">
        {dots.map((i) => (
          <span key={i} className="inline-block w-2 h-2 rounded-full bg-gray-800" />
        ))}
      </span>
    );
  }
  if (conviction === "medium") {
    return (
      <span className="inline-flex gap-0.5">
        {dots.map((i) => (
          <span
            key={i}
            className={`inline-block w-2 h-2 rounded-full ${i < 2 ? "bg-gray-800" : "bg-gray-300"}`}
          />
        ))}
      </span>
    );
  }
  // low
  return (
    <span className="inline-flex gap-0.5">
      {dots.map((i) => (
        <span key={i} className="inline-block w-2 h-2 rounded-full border border-gray-400" />
      ))}
    </span>
  );
}

function SectorTilts({ tilts }: { tilts: Tilt[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">섹터 틸트</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {tilts.map((tilt, i) => {
            const dir = DIRECTION_BADGE[tilt.direction] ?? { style: "bg-gray-500 text-white", label: tilt.direction };
            return (
              <div
                key={i}
                className="border rounded-lg p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-gray-900">{tilt.sector}</span>
                  <Badge className={dir.style}>{dir.label}</Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>확신도</span>
                  <ConvictionDots conviction={tilt.conviction} />
                  <span className="capitalize">{tilt.conviction}</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{tilt.reason}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- C. ETF Picks ---------- */
function ETFPicks({ picks }: { picks: Pick[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">ETF 추천 종목</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>종목</TableHead>
              <TableHead>자산군</TableHead>
              <TableHead className="text-right">비중</TableHead>
              <TableHead>사유</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {picks.map((pick, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Link
                    to={`/etf/${pick.ticker}`}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {pick.name}
                  </Link>
                  <span className="block text-xs text-gray-400">{pick.ticker}</span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {pick.asset_class}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-semibold">{pick.weight}%</TableCell>
                <TableCell className="text-sm text-gray-700 max-w-xs">{pick.reason}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ---------- D. Risk Parameters ---------- */
function RiskParams({ params }: { params: Record<string, any> }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">리스크 관리</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="border rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">최대 단일 포지션</p>
            <p className="text-xl font-bold text-gray-900">
              {params.max_single_position != null ? `${params.max_single_position}%` : "-"}
            </p>
          </div>
          <div className="border rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">손절매</p>
            <p className="text-xl font-bold text-red-600">
              {params.stop_loss_pct != null ? `${params.stop_loss_pct}%` : "-"}
            </p>
          </div>
          <div className="border rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">최소 현금 비중</p>
            <p className="text-xl font-bold text-gray-900">
              {params.cash_reserve_min != null ? `${params.cash_reserve_min}%` : "-"}
            </p>
          </div>
        </div>
        {params.rebalance_trigger && (
          <div className="border rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">리밸런싱 기준</p>
            <p className="text-sm text-gray-800">{params.rebalance_trigger}</p>
          </div>
        )}
        {params.special_note && (
          <div className="rounded-lg p-3 bg-amber-50 border border-amber-200">
            <p className="text-sm text-amber-900 font-medium">{params.special_note}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Druckenmiller() {
  const [data, setData] = useState<DruckenmillerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getDruckenmiller()
      .then((res) => {
        if (!cancelled) setData(res as any);
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
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % QUOTES.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="p-4 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-4 text-sm">
          데이터를 불러오는데 실패했습니다: {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const stanceColor = STANCE_COLORS[data.stance] ?? STANCE_COLORS.neutral;

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-6">
      {/* Header: Overall Assessment */}
      <Card className="border-2 border-gray-300">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <CardTitle className="text-2xl">매크로 분석 에이전트</CardTitle>
            <Badge className={`${stanceColor} text-sm px-3 py-1`}>
              {data.overall}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700 leading-relaxed">{data.overall_text}</p>
          {/* Macro Snapshot */}
          <div className="flex flex-wrap gap-3 pt-2">
            {Object.entries(data.macro_snapshot).map(([key, value]) => (
              <Badge
                key={key}
                variant="outline"
                className="text-sm font-mono px-3 py-1"
              >
                {MACRO_LABELS[key] ?? key}: {typeof value === "number" ? value.toLocaleString() : value}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Signals Section */}
      <section>
        <h2 className="text-lg font-bold text-gray-800 mb-3">시그널</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.signals.map((signal, i) => (
            <SignalCard key={i} signal={signal} />
          ))}
        </div>
      </section>

      {/* Decision Layer */}
      {data.decision && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-gray-800">투자 의사결정</h2>

          {/* A. Asset Allocation */}
          {data.decision.allocation && (
            <AllocationBar allocation={data.decision.allocation} reasons={data.decision.allocation_reasons} />
          )}

          {/* B. Sector Tilts */}
          {data.decision.tilts && data.decision.tilts.length > 0 && (
            <SectorTilts tilts={data.decision.tilts} />
          )}

          {/* C. ETF Picks */}
          {data.decision.picks && data.decision.picks.length > 0 && (
            <ETFPicks picks={data.decision.picks} />
          )}

          {/* D. Risk Parameters */}
          {data.decision.risk_params && (
            <RiskParams params={data.decision.risk_params} />
          )}
        </section>
      )}

      {/* Druckenmiller Quotes Footer */}
      <Card className="border-purple-200 bg-purple-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <span className="text-3xl text-purple-400 leading-none select-none">"</span>
            <div className="min-h-[3rem]">
              <p className="text-sm text-purple-900 italic leading-relaxed">
                {QUOTES[quoteIndex]}
              </p>
              <p className="text-xs text-purple-500 mt-2 font-semibold">
                -- Stanley Druckenmiller
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

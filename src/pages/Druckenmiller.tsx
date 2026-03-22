import { useEffect, useState } from "react";
import { api } from "@/shared/api/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";

interface Signal {
  type: string;
  text: string;
}

interface Recommendation {
  category: string;
  direction: string;
  reason: string;
  examples: string;
}

interface DruckenmillerData {
  overall: string;
  overall_text: string;
  stance: string;
  signals: Signal[];
  recommendations: Recommendation[];
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

const DIRECTION_STYLES: Record<string, string> = {
  overweight: "bg-green-600 text-white",
  underweight: "bg-red-600 text-white",
};

const MACRO_LABELS: Record<string, string> = {
  us10y: "US 10Y",
  kr3y: "KR 3Y",
  usdkrw: "USD/KRW",
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
      {/* Recommendation skeletons */}
      <div>
        <SkeletonBlock className="h-6 w-40 mb-3" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
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

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const dirStyle = DIRECTION_STYLES[rec.direction] ?? "bg-gray-500 text-white";
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{rec.category}</CardTitle>
          <Badge className={dirStyle}>{rec.direction}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-700 mb-3 leading-relaxed">{rec.reason}</p>
        {rec.examples && (
          <p className="text-xs text-gray-500">
            <span className="font-semibold">ETF: </span>
            {rec.examples}
          </p>
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
        if (!cancelled) setData(res);
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

      {/* Recommendations Section */}
      <section>
        <h2 className="text-lg font-bold text-gray-800 mb-3">투자 추천</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.recommendations.map((rec, i) => (
            <RecommendationCard key={i} rec={rec} />
          ))}
        </div>
      </section>

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

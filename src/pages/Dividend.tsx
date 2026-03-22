import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/shared/api/client";
import type { DividendRankingItem, DividendRankingResponse } from "@/shared/api/types";
import HelpTip from "@/shared/components/HelpTip";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/shared/ui/table";

const FREQUENCY_TABS: { label: string; value: string | undefined }[] = [
  { label: "전체", value: undefined },
  { label: "월배당", value: "monthly" },
  { label: "분기배당", value: "quarterly" },
  { label: "반기배당", value: "semi-annual" },
  { label: "연배당", value: "annual" },
];

const FREQUENCY_LABELS: Record<string, string> = {
  monthly: "월배당",
  quarterly: "분기배당",
  "semi-annual": "반기배당",
  annual: "연배당",
};

function formatFrequency(val: string | null): string {
  if (!val) return "-";
  return FREQUENCY_LABELS[val] || val;
}

function yieldColor(val: number | null): string {
  if (val === null || val === undefined) return "text-gray-400";
  if (val >= 5) return "text-green-700";
  if (val >= 3) return "text-green-600";
  if (val >= 1) return "text-green-500";
  if (val > 0) return "text-gray-600";
  return "text-gray-400";
}

function yieldBg(val: number | null): string {
  if (val === null || val === undefined) return "";
  if (val >= 5) return "bg-green-50";
  if (val >= 3) return "bg-green-50/50";
  return "";
}

function formatPercent(val: number | null): string {
  if (val === null || val === undefined) return "-";
  return `${val.toFixed(2)}%`;
}

function formatWon(val: number | null): string {
  if (val === null || val === undefined) return "-";
  return `${val.toLocaleString("ko-KR")}원`;
}

function SkeletonRow() {
  return (
    <TableRow className="animate-pulse">
      {Array.from({ length: 7 }).map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 bg-gray-200 rounded w-full" />
        </TableCell>
      ))}
    </TableRow>
  );
}

export default function Dividend() {
  const [data, setData] = useState<DividendRankingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [frequency, setFrequency] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const size = 20;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .dividendRanking(page, size, frequency)
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
  }, [page, frequency]);

  const totalPages = data ? Math.ceil(data.total / size) : 0;

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">배당 ETF 랭킹</h1>

      {/* Frequency filter tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {FREQUENCY_TABS.map((tab) => (
          <Button
            key={tab.label}
            variant={frequency === tab.value ? "default" : "outline"}
            onClick={() => {
              setFrequency(tab.value);
              setPage(1);
            }}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 mb-4 text-sm">
          데이터를 불러오는데 실패했습니다: {error}
        </div>
      )}

      {/* Table */}
      <div className="border border-gray-200 rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>티커</TableHead>
              <TableHead>이름</TableHead>
              <TableHead>운용사</TableHead>
              <TableHead className="text-right">배당수익률(%)<HelpTip text="TTM(최근 12개월) 기준 연환산 배당수익률입니다. 과거 배당 실적 기반이며 미래 배당을 보장하지 않습니다." /></TableHead>
              <TableHead className="text-right">주당배당금(원)</TableHead>
              <TableHead className="text-center">배당주기</TableHead>
              <TableHead className="text-right">총보수(%)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)
              : data?.items.map((item: DividendRankingItem) => (
                  <TableRow
                    key={item.ticker}
                    className={yieldBg(item.dividend_yield)}
                  >
                    <TableCell className="font-mono text-gray-600">
                      <Link
                        to={`/etf/${item.ticker}`}
                        className="text-blue-600 hover:underline"
                      >
                        {item.ticker}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">
                      <Link
                        to={`/etf/${item.ticker}`}
                        className="hover:text-blue-600"
                      >
                        {item.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {item.management_company ? (
                        <Link
                          to={`/company/${encodeURIComponent(item.management_company)}`}
                          className="hover:text-blue-600 hover:underline"
                        >
                          {item.management_company}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono font-bold ${yieldColor(
                        item.dividend_yield
                      )}`}
                    >
                      {formatPercent(item.dividend_yield)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-gray-700">
                      {formatWon(item.dividend_per_share)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="secondary"
                        className={
                          item.dividend_frequency === "monthly"
                            ? "bg-blue-100 text-blue-700"
                            : item.dividend_frequency === "quarterly"
                            ? "bg-purple-100 text-purple-700"
                            : item.dividend_frequency === "semi-annual"
                            ? "bg-amber-100 text-amber-700"
                            : item.dividend_frequency === "annual"
                            ? "bg-gray-100 text-gray-700"
                            : "text-gray-400"
                        }
                      >
                        {formatFrequency(item.dividend_frequency)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-gray-500">
                      {formatPercent(item.total_fee)}
                    </TableCell>
                  </TableRow>
                ))}
            {!loading && (!data?.items || data.items.length === 0) && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-gray-400 py-8"
                >
                  배당 데이터가 없습니다
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-4">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            이전
          </Button>
          <span className="text-sm text-gray-600">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            다음
          </Button>
        </div>
      )}
    </div>
  );
}

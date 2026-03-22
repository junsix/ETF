import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/shared/api/client";
import type { RankingItem, RankingResponse, ThemeItem } from "@/shared/api/types";
import HelpTip from "@/shared/components/HelpTip";
import { formatReturn, returnColor, formatNumber, formatVolume } from "@/shared/lib/utils";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/shared/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/shared/ui/select";

const SORT_OPTIONS = [
  { value: "returns_1m", label: "1개월 수익률" },
  { value: "returns_1w", label: "1주 수익률" },
  { value: "returns_3m", label: "3개월 수익률" },
  { value: "returns_6m", label: "6개월 수익률" },
  { value: "returns_1y", label: "1년 수익률" },
  { value: "volume", label: "거래량" },
  { value: "listed_date", label: "상장일" },
];

const CATEGORIES = [
  { value: "", label: "전체" },
  { value: "국내 시장지수", label: "국내 시장지수" },
  { value: "국내 업종/테마", label: "업종/테마" },
  { value: "해외 주식", label: "해외 주식" },
  { value: "채권", label: "채권" },
  { value: "원자재", label: "원자재" },
  { value: "레버리지/인버스", label: "레버리지/인버스" },
  { value: "혼합/기타", label: "혼합/기타" },
];

function SkeletonRow() {
  return (
    <TableRow className="animate-pulse">
      {Array.from({ length: 10 }).map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 bg-gray-200 rounded w-full" />
        </TableCell>
      ))}
    </TableRow>
  );
}

export default function ETFList() {
  const [data, setData] = useState<RankingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("returns_1m");
  const [order, setOrder] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [theme, setTheme] = useState("");
  const [themes, setThemes] = useState<ThemeItem[]>([]);
  const size = 20;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch themes when category changes
  useEffect(() => {
    api
      .getThemes(category || undefined)
      .then((res) => setThemes(res.themes))
      .catch(() => setThemes([]));
  }, [category]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .ranking(sortBy, order, page, size, category || undefined, theme || undefined, search || undefined)
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
  }, [sortBy, order, page, category, theme, search]);

  const filtered: RankingItem[] = data ? data.items : [];

  const totalPages = data ? Math.ceil(data.total / size) : 0;

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">ETF 스크리닝</h1>

      {/* Category filter tabs */}
      <div className="flex flex-wrap gap-2 mb-2">
        {CATEGORIES.map((cat) => (
          <Badge
            key={cat.value}
            variant={category === cat.value ? "default" : "outline"}
            className={`cursor-pointer text-sm px-3 py-1.5 ${
              category === cat.value
                ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
            onClick={() => {
              setCategory(cat.value);
              setTheme("");
              setPage(1);
            }}
          >
            {cat.label}
          </Badge>
        ))}
      </div>

      {/* Theme filter pills */}
      {themes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <Badge
            variant={theme === "" ? "default" : "outline"}
            className={`cursor-pointer text-xs ${
              theme === ""
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
            }`}
            onClick={() => {
              setTheme("");
              setPage(1);
            }}
          >
            전체
          </Badge>
          {themes.map((t) => (
            <Badge
              key={t.name}
              variant={theme === t.name ? "default" : "outline"}
              className={`cursor-pointer text-xs ${
                theme === t.name
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
              }`}
              onClick={() => {
                setTheme(t.name);
                setPage(1);
              }}
            >
              {t.name} ({t.count})
            </Badge>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <Input
          type="text"
          placeholder="이름 또는 티커 검색..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-64"
        />
        <Select
          value={sortBy}
          onValueChange={(value) => {
            setSortBy(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={() => {
            setOrder(order === "desc" ? "asc" : "desc");
            setPage(1);
          }}
        >
          {order === "desc" ? "▼ 내림차순" : "▲ 오름차순"}
        </Button>
        <HelpTip text="가격 기준 수익률입니다. 배당 재투자 수익률은 개별 ETF 상세 페이지에서 확인할 수 있습니다." />
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
              <TableHead className="text-right">현재가</TableHead>
              <TableHead className="text-right">1주<HelpTip text="최근 1주간 가격 수익률 (배당 미반영)" /></TableHead>
              <TableHead className="text-right">1개월</TableHead>
              <TableHead className="text-right">3개월</TableHead>
              <TableHead className="text-right">1년</TableHead>
              <TableHead className="text-right">거래량</TableHead>
              <TableHead className="text-right">상장일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)
              : filtered.map((item) => (
                  <TableRow key={item.ticker}>
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
                    <TableCell className="text-right font-mono">
                      {formatNumber(item.close)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono ${returnColor(
                        item.returns["1w"]
                      )}`}
                    >
                      {formatReturn(item.returns["1w"])}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono ${returnColor(
                        item.returns["1m"]
                      )}`}
                    >
                      {formatReturn(item.returns["1m"])}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono ${returnColor(
                        item.returns["3m"]
                      )}`}
                    >
                      {formatReturn(item.returns["3m"])}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono ${returnColor(
                        item.returns["1y"]
                      )}`}
                    >
                      {formatReturn(item.returns["1y"])}
                    </TableCell>
                    <TableCell className="text-right font-mono text-gray-500">
                      {formatVolume(item.volume)}
                    </TableCell>
                    <TableCell className="text-right text-gray-400 text-xs">
                      {item.listed_date || "-"}
                    </TableCell>
                  </TableRow>
                ))}
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="text-center text-gray-400 py-8"
                >
                  검색 결과가 없습니다
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

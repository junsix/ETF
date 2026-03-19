import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { RankingItem, RankingResponse, ThemeItem } from "../api/types";
import HelpTip from "../components/HelpTip";

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

function formatReturn(val: number | null): string {
  if (val === null || val === undefined) return "-";
  return `${val >= 0 ? "+" : ""}${val.toFixed(2)}%`;
}

function returnColor(val: number | null): string {
  if (val === null || val === undefined) return "text-gray-400";
  if (val > 0) return "text-red-600";
  if (val < 0) return "text-blue-600";
  return "text-gray-600";
}

function formatNumber(val: number | null): string {
  if (val === null || val === undefined) return "-";
  return val.toLocaleString("ko-KR");
}

function formatVolume(vol: number): string {
  if (vol >= 1_000_000_000) return `${(vol / 1_000_000_000).toFixed(1)}B`;
  if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `${(vol / 1_000).toFixed(0)}K`;
  return String(vol);
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 10 }).map((_, i) => (
        <td key={i} className="px-3 py-3">
          <div className="h-4 bg-gray-200 rounded w-full" />
        </td>
      ))}
    </tr>
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
          <button
            key={cat.value}
            onClick={() => {
              setCategory(cat.value);
              setTheme("");
              setPage(1);
            }}
            className={`px-3 py-1.5 text-sm rounded-full border transition ${
              category === cat.value
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Theme filter pills */}
      {themes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button
            onClick={() => {
              setTheme("");
              setPage(1);
            }}
            className={`px-2.5 py-1 text-xs rounded-full border transition ${
              theme === ""
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
            }`}
          >
            전체
          </button>
          {themes.map((t) => (
            <button
              key={t.name}
              onClick={() => {
                setTheme(t.name);
                setPage(1);
              }}
              className={`px-2.5 py-1 text-xs rounded-full border transition ${
                theme === t.name
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {t.name} ({t.count})
            </button>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <input
          type="text"
          placeholder="이름 또는 티커 검색..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <select
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value);
            setPage(1);
          }}
          className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            setOrder(order === "desc" ? "asc" : "desc");
            setPage(1);
          }}
          className="border border-gray-300 rounded px-3 py-2 text-sm hover:bg-gray-100 transition"
        >
          {order === "desc" ? "▼ 내림차순" : "▲ 오름차순"}
        </button>
        <HelpTip text="가격 기준 수익률입니다. 배당 재투자 수익률은 개별 ETF 상세 페이지에서 확인할 수 있습니다." />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 mb-4 text-sm">
          데이터를 불러오는데 실패했습니다: {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-3 py-3 font-semibold text-gray-700">티커</th>
              <th className="text-left px-3 py-3 font-semibold text-gray-700">이름</th>
              <th className="text-left px-3 py-3 font-semibold text-gray-700">운용사</th>
              <th className="text-right px-3 py-3 font-semibold text-gray-700">현재가</th>
              <th className="text-right px-3 py-3 font-semibold text-gray-700">1주<HelpTip text="최근 1주간 가격 수익률 (배당 미반영)" /></th>
              <th className="text-right px-3 py-3 font-semibold text-gray-700">1개월</th>
              <th className="text-right px-3 py-3 font-semibold text-gray-700">3개월</th>
              <th className="text-right px-3 py-3 font-semibold text-gray-700">1년</th>
              <th className="text-right px-3 py-3 font-semibold text-gray-700">거래량</th>
              <th className="text-right px-3 py-3 font-semibold text-gray-700">상장일</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading
              ? Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)
              : filtered.map((item) => (
                  <tr
                    key={item.ticker}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-3 py-3 font-mono text-gray-600">
                      <Link
                        to={`/etf/${item.ticker}`}
                        className="text-blue-600 hover:underline"
                      >
                        {item.ticker}
                      </Link>
                    </td>
                    <td className="px-3 py-3 font-medium text-gray-900">
                      <Link
                        to={`/etf/${item.ticker}`}
                        className="hover:text-blue-600"
                      >
                        {item.name}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-gray-500">
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
                    </td>
                    <td className="px-3 py-3 text-right font-mono">
                      {formatNumber(item.close)}
                    </td>
                    <td
                      className={`px-3 py-3 text-right font-mono ${returnColor(
                        item.returns["1w"]
                      )}`}
                    >
                      {formatReturn(item.returns["1w"])}
                    </td>
                    <td
                      className={`px-3 py-3 text-right font-mono ${returnColor(
                        item.returns["1m"]
                      )}`}
                    >
                      {formatReturn(item.returns["1m"])}
                    </td>
                    <td
                      className={`px-3 py-3 text-right font-mono ${returnColor(
                        item.returns["3m"]
                      )}`}
                    >
                      {formatReturn(item.returns["3m"])}
                    </td>
                    <td
                      className={`px-3 py-3 text-right font-mono ${returnColor(
                        item.returns["1y"]
                      )}`}
                    >
                      {formatReturn(item.returns["1y"])}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-gray-500">
                      {formatVolume(item.volume)}
                    </td>
                    <td className="px-3 py-3 text-right text-gray-400 text-xs">
                      {item.listed_date || "-"}
                    </td>
                  </tr>
                ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="px-3 py-8 text-center text-gray-400"
                >
                  검색 결과가 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            이전
          </button>
          <span className="text-sm text-gray-600">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client";
import type { ETFListResponse } from "../api/types";

export default function Company() {
  const { name } = useParams<{ name: string }>();
  const [data, setData] = useState<ETFListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const size = 50;

  useEffect(() => {
    if (!name) return;
    let cancelled = false;
    setLoading(true);
    api
      .getETFs({ company: decodeURIComponent(name), page, size })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [name, page]);

  const decodedName = decodeURIComponent(name || "");
  const totalPages = data ? Math.ceil(data.total / size) : 0;

  if (loading) {
    return (
      <div className="p-4 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-4 bg-gray-200 rounded w-32" />
          <div className="h-[400px] bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 max-w-7xl mx-auto">
        <Link to="/" className="text-blue-600 hover:underline text-sm">
          &larr; 전체 목록
        </Link>
        <div className="mt-4 text-gray-500">데이터가 없습니다</div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <Link to="/" className="text-blue-600 hover:underline text-sm">
        &larr; 전체 목록
      </Link>

      <h1 className="text-2xl font-bold mt-4 mb-1">{decodedName}</h1>
      <p className="text-gray-500 mb-6">총 {data.total}개 ETF</p>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-3 py-3 font-semibold text-gray-700">
                티커
              </th>
              <th className="text-left px-3 py-3 font-semibold text-gray-700">
                이름
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.items.map((etf) => (
              <tr
                key={etf.ticker}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-3 py-3 font-mono text-gray-600">
                  <Link
                    to={`/etf/${etf.ticker}`}
                    className="text-blue-600 hover:underline"
                  >
                    {etf.ticker}
                  </Link>
                </td>
                <td className="px-3 py-3 font-medium text-gray-900">
                  <Link
                    to={`/etf/${etf.ticker}`}
                    className="hover:text-blue-600"
                  >
                    {etf.name}
                  </Link>
                </td>
              </tr>
            ))}
            {data.items.length === 0 && (
              <tr>
                <td
                  colSpan={2}
                  className="px-3 py-8 text-center text-gray-400"
                >
                  해당 운용사의 ETF가 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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

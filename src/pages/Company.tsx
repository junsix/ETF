import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/shared/api/client";
import type { ETFListResponse } from "@/shared/api/types";
import { Button } from "@/shared/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/shared/ui/table";

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

      <div className="border border-gray-200 rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>티커</TableHead>
              <TableHead>이름</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((etf) => (
              <TableRow key={etf.ticker}>
                <TableCell className="font-mono text-gray-600">
                  <Link
                    to={`/etf/${etf.ticker}`}
                    className="text-blue-600 hover:underline"
                  >
                    {etf.ticker}
                  </Link>
                </TableCell>
                <TableCell className="font-medium text-gray-900">
                  <Link
                    to={`/etf/${etf.ticker}`}
                    className="hover:text-blue-600"
                  >
                    {etf.name}
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {data.items.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="text-center text-gray-400 py-8"
                >
                  해당 운용사의 ETF가 없습니다
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

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

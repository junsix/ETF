import { useState } from "react";
import HelpTip from "./HelpTip";

interface Props {
  tickers: string[];
  names: string[];
  matrix: number[][];
  tailMatrix: number[][];
}

/** 상관계수 → 배경색 (파랑 -1 ~ 회색 0 ~ 빨강 +1) */
function corrColor(val: number): string {
  if (val >= 0.8) return "bg-red-500 text-white";
  if (val >= 0.6) return "bg-red-300 text-red-900";
  if (val >= 0.3) return "bg-red-100 text-red-800";
  if (val >= -0.3) return "bg-gray-100 text-gray-700";
  if (val >= -0.6) return "bg-blue-100 text-blue-800";
  if (val >= -0.8) return "bg-blue-300 text-blue-900";
  return "bg-blue-500 text-white";
}

type Mode = "normal" | "tail";

/** 상관 블록 분류 */
interface DiagnosticItem {
  type: "danger" | "warning" | "good";
  message: string;
}

function diagnose(
  tickers: string[],
  names: string[],
  matrix: number[][],
  tailMatrix: number[][]
): DiagnosticItem[] {
  const items: DiagnosticItem[] = [];
  const n = tickers.length;
  if (n < 2) return items;

  // 높은 상관 쌍 찾기
  const highPairs: string[] = [];
  const tailSurgePairs: string[] = [];

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const corr = matrix[i][j];
      const tail = tailMatrix[i][j];
      const nameA = names[i] || tickers[i];
      const nameB = names[j] || tickers[j];

      if (corr >= 0.85) {
        highPairs.push(`${nameA} ↔ ${nameB} (${corr.toFixed(2)})`);
      }

      // 꼬리 상관이 평시보다 0.15 이상 높으면 위기 동조 경고
      if (tail - corr > 0.15 && tail >= 0.7) {
        tailSurgePairs.push(
          `${nameA} ↔ ${nameB} (평시 ${corr.toFixed(2)} → 하락 시 ${tail.toFixed(2)})`
        );
      }
    }
  }

  if (highPairs.length > 0) {
    items.push({
      type: "danger",
      message: `높은 상관 (≥0.85): ${highPairs.join(", ")}. 실질 분산 효과가 낮습니다.`,
    });
  }

  if (tailSurgePairs.length > 0) {
    items.push({
      type: "warning",
      message: `위기 시 동조 위험: ${tailSurgePairs.join(", ")}. 하락장에서 함께 빠질 수 있습니다.`,
    });
  }

  // 음의 상관 존재 여부
  let hasNegative = false;
  for (let i = 0; i < n && !hasNegative; i++) {
    for (let j = i + 1; j < n && !hasNegative; j++) {
      if (matrix[i][j] < -0.1) hasNegative = true;
    }
  }

  // 평균 상관
  let sum = 0;
  let cnt = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      sum += matrix[i][j];
      cnt++;
    }
  }
  const avgCorr = cnt > 0 ? sum / cnt : 0;

  if (avgCorr >= 0.7) {
    items.push({
      type: "danger",
      message: `포트폴리오 평균 상관계수 ${avgCorr.toFixed(2)} — 분산이 매우 부족합니다.`,
    });
  } else if (avgCorr >= 0.5) {
    items.push({
      type: "warning",
      message: `포트폴리오 평균 상관계수 ${avgCorr.toFixed(2)} — 분산 개선 여지가 있습니다.`,
    });
  } else {
    items.push({
      type: "good",
      message: `포트폴리오 평균 상관계수 ${avgCorr.toFixed(2)} — 분산이 양호합니다.`,
    });
  }

  if (hasNegative) {
    items.push({
      type: "good",
      message: "음의 상관관계 자산이 포함되어 있어 하락 방어에 도움이 됩니다.",
    });
  }

  if (highPairs.length === 0 && tailSurgePairs.length === 0 && avgCorr < 0.5) {
    items.push({
      type: "good",
      message: "전반적으로 분산이 잘 되어 있습니다.",
    });
  }

  return items;
}

const diagIcon: Record<string, string> = {
  danger: "!!",
  warning: "!",
  good: "OK",
};

const diagStyle: Record<string, string> = {
  danger: "bg-red-50 border-red-200 text-red-800",
  warning: "bg-orange-50 border-orange-200 text-orange-800",
  good: "bg-green-50 border-green-200 text-green-800",
};

const diagBadge: Record<string, string> = {
  danger: "bg-red-600 text-white",
  warning: "bg-orange-500 text-white",
  good: "bg-green-600 text-white",
};

export default function CorrelationHeatmap({
  tickers,
  names,
  matrix,
  tailMatrix,
}: Props) {
  const [mode, setMode] = useState<Mode>("normal");
  const activeMatrix = mode === "normal" ? matrix : tailMatrix;
  const n = tickers.length;

  const diagnostics = diagnose(tickers, names, matrix, tailMatrix);

  // 짧은 이름 (최대 8자)
  const shortNames = names.map((name) =>
    name.length > 8 ? name.slice(0, 7) + "…" : name
  );

  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-gray-800">
          상관관계 분석
          <HelpTip text="두 자산의 가격이 얼마나 함께 움직이는지를 -1 ~ +1로 측정합니다. +1이면 완전히 같이 움직여 분산 효과가 없고, 0이면 독립적, -1이면 반대로 움직여 분산 효과가 극대화됩니다. 포트폴리오 구성 시 상관이 낮은 자산을 조합하면 동일 수익률에서 변동성을 줄일 수 있습니다." />
        </h2>
        <div className="flex gap-1 text-xs">
          <button
            onClick={() => setMode("normal")}
            className={`px-3 py-1.5 rounded transition ${
              mode === "normal"
                ? "bg-gray-800 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            평시 상관
            <HelpTip text="피어슨 상관계수. 전체 관측 기간의 일별 수익률을 기반으로 두 자산의 선형적 동조 정도를 측정합니다. 시장이 정상적일 때의 자산 간 관계를 나타냅니다." />
          </button>
          <button
            onClick={() => setMode("tail")}
            className={`px-3 py-1.5 rounded transition ${
              mode === "tail"
                ? "bg-gray-800 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            꼬리 상관
            <HelpTip text="하위 5% 수익률 구간(극단적 하락일)에서의 상관계수입니다. 평시에는 상관이 낮아 보여도 위기 시 동반 하락하는 경우가 많습니다. 꼬리 상관이 평시보다 높다면 분산 효과가 위기 시 약화될 수 있음을 의미합니다." />
          </button>
        </div>
      </div>

      {/* Heatmap */}
      <div className="overflow-x-auto px-4 pb-2">
        <table className="text-xs w-full">
          <thead>
            <tr>
              <th className="p-1.5" />
              {shortNames.map((name, i) => (
                <th
                  key={tickers[i]}
                  className="p-1.5 text-center font-medium text-gray-600 max-w-[80px] truncate"
                  title={names[i]}
                >
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shortNames.map((rowName, i) => (
              <tr key={tickers[i]}>
                <td
                  className="p-1.5 font-medium text-gray-600 text-right whitespace-nowrap max-w-[100px] truncate"
                  title={names[i]}
                >
                  {rowName}
                </td>
                {Array.from({ length: n }).map((_, j) => {
                  const val = activeMatrix[i][j];
                  const isDiag = i === j;
                  return (
                    <td
                      key={`${i}-${j}`}
                      className={`p-1.5 text-center font-mono tabular-nums ${
                        isDiag
                          ? "bg-gray-200 text-gray-400"
                          : corrColor(val)
                      }`}
                      style={{ minWidth: "50px" }}
                    >
                      {isDiag ? "—" : val.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mode description */}
      <div className="px-4 pb-2 text-xs text-gray-500">
        {mode === "normal" ? (
          <p>전체 기간 일별 수익률 기반 피어슨 상관계수입니다. 0.7 이상이면 두 자산이 매우 유사하게 움직여 분산 효과가 낮고, 0.3 이하면 독립적 움직임으로 포트폴리오 분산에 효과적입니다.</p>
        ) : (
          <p>일별 수익률 하위 5% 구간에서의 상관계수입니다. 2008 금융위기처럼 극단적 하락장에서는 평소 무관했던 자산도 동반 급락하는 경향이 있습니다. 꼬리 상관이 평시보다 크게 높다면 위기 시 분산 효과가 크게 감소할 수 있습니다.</p>
        )}
      </div>

      {/* Color legend */}
      <div className="px-4 pb-2 flex items-center gap-1 text-[10px] text-gray-500">
        <span className="bg-blue-500 text-white px-1.5 py-0.5 rounded">-1</span>
        <span className="bg-blue-300 px-1.5 py-0.5 rounded">-0.6</span>
        <span className="bg-blue-100 px-1.5 py-0.5 rounded">-0.3</span>
        <span className="bg-gray-100 px-1.5 py-0.5 rounded">0</span>
        <span className="bg-red-100 px-1.5 py-0.5 rounded">+0.3</span>
        <span className="bg-red-300 px-1.5 py-0.5 rounded">+0.6</span>
        <span className="bg-red-500 text-white px-1.5 py-0.5 rounded">+1</span>
      </div>

      {/* Diagnostics */}
      {diagnostics.length > 0 && (
        <div className="px-4 pb-4 space-y-2">
          <h3 className="text-sm font-semibold text-gray-700">분산 진단</h3>
          {diagnostics.map((d, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 text-sm border rounded-lg px-3 py-2 ${diagStyle[d.type]}`}
            >
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${diagBadge[d.type]}`}
              >
                {diagIcon[d.type]}
              </span>
              <span>{d.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

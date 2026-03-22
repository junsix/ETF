import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/shared/ui/table";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-gray-800 mb-3 pb-2 border-b">{title}</h2>
      <div className="text-sm text-gray-600 leading-relaxed space-y-2">
        {children}
      </div>
    </div>
  );
}

export default function About() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">서비스 안내</h1>

      <Section title="데이터 소스">
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>ETF 목록 및 현재가</strong> -- 네이버 금융 API (매일 07:00 갱신)</li>
          <li><strong>일별 가격(OHLCV)</strong> -- 네이버 시세 API (평일 16:30 수집, 1년 이력 보유)</li>
          <li><strong>구성종목</strong> -- 네이버 금융 ETF 상세 페이지 (매주 토요일 수집)</li>
          <li><strong>배당 정보</strong> -- 네이버 모바일 API + wisereport (매주 일요일 수집)</li>
          <li><strong>섹터/국가/자산 배분</strong> -- 네이버 모바일 ETF 분석 API (실시간)</li>
          <li><strong>총 수익률(배당 재투자)</strong> -- 네이버 NAV 기반 수익률 (실시간)</li>
          <li><strong>글로벌 시장 지표</strong> -- 네이버 금융 + Yahoo Finance (실시간)</li>
        </ul>
      </Section>

      <Section title="수익률 계산">
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>가격 수익률</strong> -- (현재 종가 - 과거 종가) / 과거 종가 x 100. 배당 미반영.</li>
          <li><strong>총 수익률</strong> -- NAV(순자산가치) 기반. 배당 재투자 효과 포함. 네이버 금융 제공.</li>
          <li><strong>기간</strong> -- 해당 기간의 가장 가까운 거래일 종가 기준. 한국 공휴일(최대 14일) 고려.</li>
        </ul>
      </Section>

      <Section title="배당 정보">
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>배당수익률</strong> -- TTM(최근 12개월) 기준 연환산 배당수익률.</li>
          <li><strong>배당주기</strong> -- ETF 정관의 분배금 기산일 기준 (월배당/분기/반기/연배당).</li>
          <li><strong>주당배당금</strong> -- 최근 12개월 누적 분배금.</li>
        </ul>
      </Section>

      <Section title="ETF 구조 안내">
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>합성(Synthetic) ETF</strong> -- 실제 주식을 보유하지 않고 현금 담보 + 스왑 계약으로 지수 수익률을 복제합니다. 자산유형에서 현금 비중이 높게 표시됩니다. 거래상대방(증권사) 부도 시 원금 손실 위험, 담보 부족 위험, 물리적 복제 대비 높은 추적 오차, 계약 만기 시 롤오버 비용이 발생할 수 있습니다.</li>
          <li><strong>레버리지/인버스 ETF</strong> -- 파생상품 비중이 높으며, 일별 수익률의 배수/역수를 추종합니다. 일별 복리 효과로 장기 보유 시 기초지수와 큰 괴리가 발생할 수 있으며, 변동성이 클수록 손실이 확대됩니다.</li>
          <li><strong>채권형 ETF</strong> -- 국채, 회사채 등 채권에 투자. 금리 변동에 민감합니다.</li>
          <li><strong>자산배분형 ETF</strong> -- 주식과 채권을 혼합 보유하여 위험을 분산합니다.</li>
        </ul>
      </Section>

      <Section title="데이터 수집 주기">
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>항목</TableHead>
                <TableHead>주기</TableHead>
                <TableHead>시간</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>ETF 목록</TableCell>
                <TableCell>매일</TableCell>
                <TableCell>07:00 KST</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>일별 가격</TableCell>
                <TableCell>평일</TableCell>
                <TableCell>16:30 KST (장 마감 후)</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>구성종목</TableCell>
                <TableCell>매주 토요일</TableCell>
                <TableCell>09:00 KST</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>배당 데이터</TableCell>
                <TableCell>매주 일요일</TableCell>
                <TableCell>10:00 KST</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </Section>

      <Section title="면책조항">
        <p>이 서비스는 투자 참고용 정보를 제공하며, 투자 권유가 아닙니다. 데이터의 정확성을 보장하지 않으며, 투자 판단의 책임은 사용자에게 있습니다. 실시간 데이터가 아닌 지연된 정보가 포함될 수 있습니다.</p>
      </Section>
    </div>
  );
}

import { useState } from 'react';
import { useSelectionStore } from '../store/selectionStore';
import type { Suitability } from '../types';
import drawingsIndex from '../data/drawingsIndex.json';

const dwgIndex = drawingsIndex as Record<string, { pdf: string[]; step: string[] }>;

/* ───── 상수 ───── */
const SUITABILITY_CFG = {
  suitable:   { label: '적합',   icon: '✅', gradFrom: 'from-green-50',  gradTo: 'to-emerald-50',  border: 'border-green-200',  text: 'text-green-700',  badge: 'bg-green-100 text-green-700 border-green-200' },
  caution:    { label: '주의',   icon: '⚠️', gradFrom: 'from-yellow-50', gradTo: 'to-amber-50',    border: 'border-yellow-200', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  unsuitable: { label: '부적합', icon: '❌', gradFrom: 'from-red-50',    gradTo: 'to-rose-50',     border: 'border-red-200',    text: 'text-red-700',    badge: 'bg-red-100 text-red-700 border-red-200' },
};

/* ───── 공통 컴포넌트 ───── */
function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-semibold text-gray-800">{value}</span>
    </div>
  );
}

function SpecCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 bg-gray-50 border-b border-gray-200">
        <span className="text-base">{icon}</span>
        <h3 className="text-sm font-bold text-gray-700">{title}</h3>
      </div>
      <div className="px-5 py-3">{children}</div>
    </div>
  );
}

function DrawingLinks({ series, size, stage, shaftHoleDiameter, mountingTap }: {
  series: string; size: string; stage: string; shaftHoleDiameter: number; mountingTap?: string;
}) {
  // mountingTap이 있으면 정확 매칭, 없으면 해당 조합의 모든 도면 표시
  const basePrefix = `${series}|${size}|${stage}|${shaftHoleDiameter}`;
  const exactKey = mountingTap ? `${basePrefix}|${mountingTap.toUpperCase()}` : null;

  let entry = exactKey ? dwgIndex[exactKey] : null;

  // mountingTap 없을 때만 폴백: 같은 shaft 모든 도면 표시
  // mountingTap 있는데 매칭 없으면 폴백 없음 (잘못된 도면 표시 방지)
  if ((!entry || (entry.pdf.length === 0 && entry.step.length === 0)) && !mountingTap) {
    const merged = { pdf: [] as string[], step: [] as string[] };
    Object.entries(dwgIndex).forEach(([k, v]) => {
      if (k.startsWith(basePrefix + '|')) {
        merged.pdf.push(...v.pdf);
        merged.step.push(...v.step);
      }
    });
    entry = merged;
  }

  if (!entry || (entry.pdf.length === 0 && entry.step.length === 0)) return null;

  const links = [
    ...entry.pdf.map((f, i) => ({ key: `pdf-${i}`, label: `PDF 2D${entry!.pdf.length > 1 ? ` (${i+1})` : ''}`, icon: '📄', path: f })),
    ...entry.step.map((f, i) => ({ key: `step-${i}`, label: `STEP 3D${entry!.step.length > 1 ? ` (${i+1})` : ''}`, icon: '📦', path: f })),
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {links.map(l => (
        <a
          key={l.key}
          href={`https://raw.githubusercontent.com/urchacha/gearbox-configurator/master/public/drawings/${l.path}`}
          download
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-xs text-gray-600 hover:text-blue-700 transition-colors"
        >
          <span>{l.icon}</span>
          <span className="font-medium">{l.label}</span>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </a>
      ))}
    </div>
  );
}

/* ───── 메인 페이지 ───── */
export default function ResultPage() {
  const { selectionResult, operatingConditions, goToStep, resetAll } = useSelectionStore();
  const [copied, setCopied] = useState(false);

  if (!selectionResult) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-gray-400">선정 결과가 없습니다.</p>
        <button
          onClick={() => goToStep(1)}
          className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer"
        >
          처음부터 시작
        </button>
      </div>
    );
  }

  const { motor, reducer, selectedRatio, outputRPM, outputTorque, serviceFactor, suitability, bushing, adapter } = selectionResult;
  const sc = SUITABILITY_CFG[suitability as Suitability];
  const ratioEff = reducer.ratioData[selectedRatio]?.efficiency ?? reducer.efficiency;
  const ratioTorque = reducer.ratioData[selectedRatio]?.torque ?? reducer.maxOutputTorque;
  const stage = reducer.ratioData[selectedRatio]?.stage ?? '-';

  /* ── 액션 핸들러 ── */
  const handlePrint = () => window.print();

  // BUG-3: navigator.clipboard.writeText rejects when the page is not focused
  // or the browser denies the Clipboard permission. Without try/catch the
  // unhandled rejection surfaces as a console error and the button stays in
  // the default state without feedback.
  const handleCopyLink = async () => {
    const params = new URLSearchParams({
      motor: motor.modelName,
      reducer: reducer.modelName,
      ratio: String(selectedRatio),
      rpm: outputRPM.toFixed(1),
      torque: outputTorque.toFixed(2),
      sf: serviceFactor.toFixed(2),
      result: suitability,
    });
    const url = `${window.location.origin}${window.location.pathname}?${params}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. non-HTTPS, permission denied).
      // Fall back to selecting the URL so the user can copy manually.
      window.prompt('아래 링크를 복사하세요:', url);
    }
  };

  const handleMailto = () => {
    const subject = encodeURIComponent(`[감속기 선정] ${motor.modelName} + ${reducer.modelName}`);
    const body = encodeURIComponent(
      `안녕하세요,\n\n아래 감속기 선정 결과에 대한 견적을 요청드립니다.\n\n` +
      `■ 모터\n  브랜드: ${motor.brand}\n  모델: ${motor.modelName}\n  출력: ${motor.ratedPower} kW / ${motor.ratedRPM} rpm\n\n` +
      `■ 감속기\n  시리즈: ${reducer.series}\n  모델: ${reducer.modelName}\n  감속비: ${selectedRatio}\n  홀 직경: ${reducer.shaftHoleDiameter} mm\n` +
      (bushing ? `  부싱: ${bushing.code} (${bushing.shaftMm}→${bushing.holeMm}mm)\n` : '') +
      `\n■ 계산 결과\n  출력 RPM: ${outputRPM.toFixed(1)} rpm\n  출력 토크: ${outputTorque.toFixed(2)} N·m\n  서비스 팩터: ${serviceFactor.toFixed(2)}\n  적합성: ${sc.label}\n\n감사합니다.`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const handleReset = () => {
    resetAll();
  };

  return (
    <div className="print:p-0">
      {/* ── 1. 선정 완료 헤더 ── */}
      <div className={`relative rounded-2xl border bg-gradient-to-br ${sc.gradFrom} ${sc.gradTo} ${sc.border} px-6 py-6 mb-6 overflow-hidden`}>
        {/* 배경 장식 */}
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/20" />
        <div className="absolute -right-2 top-8 w-16 h-16 rounded-full bg-white/15" />

        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{sc.icon}</span>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-0.5">감속기 선정 완료</p>
              <p className={`text-2xl font-black ${sc.text}`}>
                {sc.label}
                <span className="text-base font-semibold ml-2 opacity-70">판정</span>
              </p>
            </div>
          </div>

          <div className="sm:ml-auto flex flex-wrap gap-3">
            <div className="bg-white/60 rounded-xl px-4 py-2 text-center min-w-[90px]">
              <p className="text-xs text-gray-500 mb-0.5">서비스 팩터</p>
              <p className={`text-2xl font-black ${sc.text}`}>{serviceFactor.toFixed(2)}</p>
            </div>
            <div className="bg-white/60 rounded-xl px-4 py-2 text-center min-w-[90px]">
              <p className="text-xs text-gray-500 mb-0.5">출력 RPM</p>
              <p className="text-2xl font-black text-gray-800">{outputRPM.toFixed(1)}</p>
              <p className="text-xs text-gray-400">rpm</p>
            </div>
            <div className="bg-white/60 rounded-xl px-4 py-2 text-center min-w-[90px]">
              <p className="text-xs text-gray-500 mb-0.5">출력 토크</p>
              <p className="text-2xl font-black text-gray-800">{outputTorque.toFixed(1)}</p>
              <p className="text-xs text-gray-400">N·m</p>
            </div>
          </div>
        </div>

        {/* 모델 요약 */}
        <div className="relative mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold text-gray-700">{motor.brand} {motor.modelName}</span>
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
          <span className="font-semibold text-gray-700">{reducer.modelName}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${sc.badge}`}>감속비 {selectedRatio}</span>
          {adapter && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
              어댑터 {adapter.code}
            </span>
          )}
          {bushing && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
              부싱 {bushing.code}
            </span>
          )}
        </div>
      </div>

      {/* ── 2. 좌우 2열 스펙 카드 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* 모터 카드 */}
        <SpecCard title="선택 모터" icon="⚡">
          <SpecRow label="브랜드" value={motor.brand} />
          <SpecRow label="모델명" value={motor.modelName} />
          <SpecRow label="정격 출력" value={`${motor.ratedPower} kW`} />
          <SpecRow label="정격 RPM" value={`${motor.ratedRPM.toLocaleString()} rpm`} />
          <SpecRow label="최대 RPM" value={`${motor.maxRPM.toLocaleString()} rpm`} />
          <SpecRow label="정격 토크" value={`${motor.ratedTorque} N·m`} />
          <SpecRow label="피크 토크" value={`${motor.peakTorque} N·m`} />
          <SpecRow label="축경" value={`${motor.shaftDiameter} mm`} />
          <SpecRow label="관성 모멘트" value={`${motor.inertia} kgm²×10⁻⁴`} />
        </SpecCard>

        {/* 감속기 카드 */}
        <SpecCard title="선택 감속기" icon="⚙️">
          <SpecRow label="시리즈" value={reducer.series} />
          <SpecRow label="모델명" value={reducer.modelName} />
          <SpecRow label="프레임 사이즈" value={String(reducer.size)} />
          <SpecRow label="감속비" value={String(selectedRatio)} />
          <SpecRow label="단수" value={stage} />
          <SpecRow label="해당 감속비 정격 토크" value={`${ratioTorque} N·m`} />
          <SpecRow label="효율" value={`${(ratioEff * 100).toFixed(0)}%`} />
          <SpecRow label="최대 입력 RPM" value={`${reducer.maxInputRPM.toLocaleString()} rpm`} />
          <SpecRow label="입력축 홀 직경" value={`${reducer.shaftHoleDiameter} mm`} />
          <SpecRow label="허용 래디얼 하중" value={`${reducer.allowedRadialLoad.toLocaleString()} N`} />
          <SpecRow label="허용 액시얼 하중" value={`${reducer.allowedAxialLoad.toLocaleString()} N`} />
          <SpecRow label="강성" value={`${reducer.rigidity} Nm/arcmin`} />
          <SpecRow label="소음" value={`${reducer.noise} dB`} />
          <SpecRow label="관성 모멘트" value={`${reducer.inertia} kgcm²`} />
          <SpecRow label="중량" value={`${reducer.weight} kg`} />
        </SpecCard>
      </div>

      {/* ── 3. 조합 결과 요약 테이블 ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
        <div className="flex items-center gap-2 px-5 py-3 bg-gray-50 border-b border-gray-200">
          <span className="text-base">📊</span>
          <h3 className="text-sm font-bold text-gray-700">조합 결과 요약</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 w-1/3">항목</th>
                <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-500">값</th>
                <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-500 w-20">단위</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                { label: '최종 출력 RPM',  value: outputRPM.toFixed(1),            unit: 'rpm' },
                { label: '최종 출력 토크', value: outputTorque.toFixed(2),          unit: 'N·m' },
                { label: '서비스 팩터',    value: serviceFactor.toFixed(2),         unit: '—'   },
                { label: '감속기 효율',    value: `${(ratioEff * 100).toFixed(0)}`, unit: '%'   },
                { label: '운전 시간',      value: String(operatingConditions.hoursPerDay), unit: 'hr/day' },
                { label: '부하 특성',      value: operatingConditions.loadType,     unit: '—'   },
                { label: '설치 방향',      value: operatingConditions.mountingDirection, unit: '—' },
              ].map(row => (
                <tr key={row.label} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-gray-600">{row.label}</td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-900">{row.value}</td>
                  <td className="px-5 py-3 text-right text-gray-400 text-xs">{row.unit}</td>
                </tr>
              ))}
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3 text-gray-600">적합성 판정</td>
                <td className="px-5 py-3 text-right" colSpan={2}>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${sc.badge}`}>
                    {sc.icon} {sc.label} (SF {serviceFactor.toFixed(2)})
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 부싱 정보 ── */}
      {bushing && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 rounded-xl border border-amber-200 bg-amber-50 mb-6">
          <span className="text-2xl">🔧</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-800">부싱 필요</p>
            <p className="text-xs text-amber-700 mt-0.5">
              모터 축경({motor.shaftDiameter}mm)이 감속기 홀경({reducer.shaftHoleDiameter}mm)보다 작아 부싱이 필요합니다.
            </p>
          </div>
          <div className="shrink-0 bg-white/70 rounded-lg px-4 py-2 text-center">
            <p className="text-sm font-black text-amber-900">{bushing.code}</p>
            <p className="text-xs text-amber-600">{bushing.shaftMm} → {bushing.holeMm} mm · 길이 {bushing.lenMm} mm</p>
          </div>
        </div>
      )}

      {/* ── 어댑터 정보 ── */}
      {adapter && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 rounded-xl border border-blue-200 bg-blue-50 mb-6">
          <span className="text-2xl">🔌</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-blue-800">어댑터 형번</p>
            <p className="text-xs text-blue-700 mt-0.5">
              {adapter.type} · 축경 {adapter.shaftDia} mm / 센터링 {adapter.centeringDia} mm / 고정 PCD {adapter.fixingPcd} mm
              {adapter.mountingTap ? ` / 탭 ${adapter.mountingTap}` : ''}
            </p>
          </div>
          <div className="shrink-0 bg-white/70 rounded-lg px-4 py-2 text-center">
            <p className="text-sm font-black text-blue-900">{adapter.code}</p>
            <p className="text-xs text-blue-600">{adapter.reducerModel} · {adapter.shaft}</p>
          </div>
        </div>
      )}

      {/* ── 도면 / CAD + 카탈로그 다운로드 ── */}
      <div className="border border-gray-200 rounded-xl px-5 py-4 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-700 mb-3">도면 / CAD 다운로드</p>
            <DrawingLinks
              series={reducer.series}
              size={String(reducer.size).padStart(3, '0')}
              stage={stage}
              shaftHoleDiameter={motor.shaftDiameter}
              mountingTap={motor.mountingTap}
            />
          </div>
          <div className="shrink-0">
            <p className="text-sm font-semibold text-gray-700 mb-3">카탈로그</p>
            <div className="flex flex-col gap-2">
              {[
                { label: '유성감속기 카탈로그', file: '유성감속기_종합_250117.pdf' },
                { label: '할로우로터리 카탈로그', file: '할로우로터리_카다로그_종합_250117.pdf' },
              ].map((c) => (
                <a
                  key={c.file}
                  href={`/catalogue/${c.file}`}
                  download
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-xs text-gray-600 hover:text-blue-700 transition-colors"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <span className="font-medium">{c.label}</span>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. 액션 버튼 ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 border-t border-gray-100 print:hidden">
        {/* PDF 저장 */}
        <button
          onClick={handlePrint}
          className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-600 hover:text-blue-700 transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659" />
          </svg>
          <span className="text-xs font-medium">PDF로 저장</span>
        </button>

        {/* 링크 복사 */}
        <button
          onClick={handleCopyLink}
          className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border transition-colors cursor-pointer
            ${copied
              ? 'border-green-300 bg-green-50 text-green-700'
              : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-600 hover:text-blue-700'}`}
        >
          {copied ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
          )}
          <span className="text-xs font-medium">{copied ? '복사됨!' : '링크 복사'}</span>
        </button>

        {/* 견적 요청 */}
        <button
          onClick={handleMailto}
          className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-600 hover:text-blue-700 transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
          <span className="text-xs font-medium">견적 요청</span>
        </button>

        {/* 처음부터 다시 */}
        <button
          onClick={handleReset}
          className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border border-gray-200 hover:border-red-300 hover:bg-red-50 text-gray-600 hover:text-red-600 transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          <span className="text-xs font-medium">처음부터 다시</span>
        </button>
      </div>
    </div>
  );
}

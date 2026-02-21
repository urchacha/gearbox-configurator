import { memo, useMemo, useState } from 'react';
import { useSelectionStore } from '../store/selectionStore';
import { calcOutputRPM, calcOutputTorque, calcServiceFactor, getSuitability, getEfficiency, getRatedTorque, findBushing, findAdapter, isShaftCompatible, LOAD_FACTORS } from '../utils/calculations';
import type { Adapter, Bushing, Reducer, Suitability } from '../types';
import reducersData from '../data/reducers.json';
import drawingsIndex from '../data/drawingsIndex.json';

const reducers: Reducer[] = reducersData as unknown as Reducer[];
const dwgIndex = drawingsIndex as Record<string, { pdf: string[]; step: string[] }>;

/** 도면/CAD 다운로드 버튼 그룹
 * PERF-4: Wrapped in React.memo to prevent re-renders when the side panel
 * re-renders due to unrelated state changes (e.g. warningTarget toggle).
 * Object.entries(dwgIndex) is O(n) over the full index — memoising the
 * component avoids this traversal unless the props actually change.
 */
const DrawingLinks = memo(function DrawingLinks({ series, size, stage, shaftHoleDiameter, mountingTap }: {
  series: string; size: string; stage: string; shaftHoleDiameter: number; mountingTap?: string;
}) {
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

  if (!entry || (entry.pdf.length === 0 && entry.step.length === 0)) {
    return <p className="text-xs text-gray-400">등록된 도면 없음</p>;
  }

  const links = [
    ...entry.pdf.map((f, i) => ({ key: `pdf-${i}`, label: `PDF 2D${entry!.pdf.length > 1 ? ` (${i+1})` : ''}`, icon: '📄', path: f })),
    ...entry.step.map((f, i) => ({ key: `step-${i}`, label: `STEP 3D${entry!.step.length > 1 ? ` (${i+1})` : ''}`, icon: '📦', path: f })),
  ];

  return (
    <div className="flex flex-col gap-1.5">
      {links.map(l => (
        <a
          key={l.key}
          href={`https://raw.githubusercontent.com/urchacha/gearbox-configurator/master/public/drawings/${l.path}`}
          download
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-xs text-gray-600 hover:text-blue-700 transition-colors"
        >
          <span>{l.icon}</span>
          <span className="font-medium">{l.label}</span>
          <span className="text-gray-400 truncate flex-1">{l.path.split('/').pop()}</span>
          <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </a>
      ))}
    </div>
  );
});

const SUITABILITY_CONFIG: Record<Suitability, { label: string; icon: string; bg: string; text: string; border: string; cardBorder: string }> = {
  suitable:   { label: 'Suitable',   icon: '\u2705', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', cardBorder: 'border-green-300' },
  caution:    { label: 'Caution',    icon: '\u26A0\uFE0F', bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', cardBorder: 'border-yellow-300' },
  unsuitable: { label: 'Unsuitable', icon: '\u274C', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', cardBorder: 'border-red-300' },
};

interface CalcResult {
  reducer: Reducer;
  ratio: number;
  outputRPM: number;
  outputTorque: number;
  ratedTorque: number;
  efficiency: number;
  stage: string;
  serviceFactor: number;
  suitability: Suitability;
  bushing: Bushing | null;
  adapter: Adapter | null;
}

function WarningModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-xl">{'\u26A0\uFE0F'}</div>
          <h3 className="text-lg font-bold text-gray-900">부적합 모델 선택</h3>
        </div>
        <p className="text-sm text-gray-600 mb-6">이 모델은 입력 조건을 충족하지 않습니다. 그래도 선택하시겠습니까?</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">
            취소
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors cursor-pointer">
            선택
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReducerSelectPage() {
  const {
    selectedMotor, selectedReducer, selectedRatio, selectedSeries,
    operatingConditions,
    setSelectedReducer, setSelectedRatio, setSelectionResult, goToStep,
  } = useSelectionStore();

  const [detailTarget, setDetailTarget] = useState<CalcResult | null>(null);
  const [warningTarget, setWarningTarget] = useState<CalcResult | null>(null);

  // PERF-2: selectedReducer is only used here as a null-guard (the actual model
  // set is derived from selectedSeries / selectedMotor). Using a boolean avoids
  // re-running this expensive loop every time the reducer object identity
  // changes after the user clicks a card in the list.
  const hasReducer = selectedReducer !== null;

  const candidates = useMemo(() => {
    if (!selectedMotor || !hasReducer || !selectedRatio) return [];

    const loadFactor = LOAD_FACTORS[operatingConditions.loadType] ?? 1.0;
    const list: CalcResult[] = [];
    // 모터 축경과 직결 또는 부싱으로 호환되는 모델만 대상
    const shaftMatched = reducers.filter((r) => isShaftCompatible(selectedMotor.shaftDiameter, r.shaftHoleDiameter));
    const targetReducers = selectedSeries
      ? shaftMatched.filter((r) => r.series === selectedSeries)
      : shaftMatched;

    for (const reducer of targetReducers) {
      // 선택한 감속비를 지원하는 모델만 포함
      if (!reducer.supportedRatios.includes(selectedRatio)) continue;
      const ratio = selectedRatio;
      const eff = getEfficiency(reducer, ratio);
      const ratedTorque = getRatedTorque(reducer, ratio);
      const stage = reducer.ratioData[ratio]?.stage ?? '-';
      const outputRPM = calcOutputRPM(selectedMotor.ratedRPM, ratio);
      const outputTorque = calcOutputTorque(selectedMotor.ratedTorque, ratio, eff);
      const serviceFactor = calcServiceFactor(outputTorque, ratedTorque);
      const suitability = getSuitability(serviceFactor, loadFactor);
      const bushing = findBushing(selectedMotor.shaftDiameter, reducer.shaftHoleDiameter);
      const adapter = findAdapter(reducer.modelName, selectedMotor);
      list.push({ reducer, ratio, outputRPM, outputTorque, ratedTorque, efficiency: eff, stage, serviceFactor, suitability, bushing, adapter });
    }

    const order: Record<Suitability, number> = { suitable: 0, caution: 1, unsuitable: 2 };
    list.sort((a, b) => order[a.suitability] - order[b.suitability] || b.serviceFactor - a.serviceFactor);
    return list;
  }, [selectedMotor, hasReducer, selectedRatio, selectedSeries, operatingConditions.loadType]);

  if (!selectedMotor || !selectedReducer || !selectedRatio) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-gray-400 mb-4">감속기 조건을 먼저 설정해주세요.</p>
        <button onClick={() => goToStep(3)} className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer">
          조건 입력하기
        </button>
      </div>
    );
  }

  const handleSelect = (item: CalcResult) => {
    if (item.suitability === 'unsuitable') { setWarningTarget(item); return; }
    confirmSelect(item);
  };

  const confirmSelect = (item: CalcResult) => {
    setSelectedReducer(item.reducer);
    setSelectedRatio(item.ratio);
    setSelectionResult({
      motor: selectedMotor,
      reducer: item.reducer,
      selectedRatio: item.ratio,
      outputRPM: item.outputRPM,
      outputTorque: item.outputTorque,
      serviceFactor: item.serviceFactor,
      suitability: item.suitability,
      bushing: item.bushing ?? undefined,
      adapter: item.adapter ?? undefined,
    });
    setWarningTarget(null);
    goToStep(5);
  };

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-800 mb-1">Step 4. 감속기 선택</h2>
      <p className="text-sm text-gray-500 mb-5">조건에 맞는 감속기를 선택해주세요. ({candidates.length}개 조합)</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card List */}
        <div className="lg:col-span-2 space-y-3">
          {candidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <span className="text-4xl">🔍</span>
              <p className="text-gray-500 font-medium">조건에 맞는 감속기가 없습니다.</p>
              <p className="text-sm text-gray-400">감속비 또는 시리즈를 변경해보세요.</p>
              <button
                onClick={() => goToStep(3)}
                className="mt-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer"
              >
                조건 다시 설정
              </button>
            </div>
          ) : (
            candidates.map((item) => {
              const sc = SUITABILITY_CONFIG[item.suitability];
              const isUnsub = item.suitability === 'unsuitable';
              const isDetail = detailTarget?.reducer.id === item.reducer.id && detailTarget?.ratio === item.ratio;

              return (
                <div
                  // BUG-6: reducer.id + ratio is already unique per combination;
                  // appending idx was masking potential key stability issues.
                  key={`${item.reducer.id}-${item.ratio}`}
                  onClick={() => setDetailTarget(item)}
                  className={`border rounded-lg p-4 cursor-pointer transition-all
                    ${isDetail ? `ring-2 ring-blue-500 ${sc.cardBorder}` : 'border-gray-200 hover:border-gray-300'}
                    ${isUnsub ? 'opacity-55' : ''}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-500">{item.reducer.series}</span>
                        <h4 className="font-semibold text-gray-800">{item.reducer.modelName}</h4>
                        <span className="text-xs text-gray-400">size {item.reducer.size}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-2">
                        <span>감속비 <strong className="text-gray-700">{item.ratio}</strong></span>
                        <span>정격 토크 <strong className="text-gray-700">{item.ratedTorque} N·m</strong></span>
                        <span>효율 <strong className="text-gray-700">{(item.efficiency * 100).toFixed(0)}%</strong></span>
                        <span>중량 <strong className="text-gray-700">{item.reducer.weight} kg</strong></span>
                        <span>SF <strong className="text-gray-700">{item.serviceFactor.toFixed(2)}</strong></span>
                        {item.bushing && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">
                            부싱 {item.bushing.code}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${sc.bg} ${sc.text} ${sc.border}`}>
                        {sc.icon} {sc.label}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSelect(item); }}
                        className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer
                          ${isUnsub ? 'border border-red-300 text-red-600 hover:bg-red-50' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                      >
                        선택
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Detail Side Panel */}
        <div className="lg:col-span-1">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 sticky top-8">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">상세 스펙</h3>
            {!detailTarget ? (
              <p className="text-sm text-gray-400 py-8 text-center">카드를 클릭하면<br />상세 정보가 표시됩니다.</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-blue-500 font-medium">{detailTarget.reducer.series} · size {detailTarget.reducer.size}</p>
                  <p className="text-lg font-bold text-gray-900">{detailTarget.reducer.modelName}</p>
                </div>

                <div className="border-t border-gray-200 pt-3 space-y-1">
                  <DetailRow label="감속비" value={String(detailTarget.ratio)} />
                  <DetailRow label="단수" value={detailTarget.stage} />
                  <DetailRow label="최대 입력 RPM" value={`${detailTarget.reducer.maxInputRPM.toLocaleString()} rpm`} />
                  <DetailRow label="해당 감속비 토크" value={`${detailTarget.ratedTorque} N·m`} />
                  <DetailRow label="효율" value={`${(detailTarget.efficiency * 100).toFixed(0)}%`} />
                  <DetailRow label="허용 래디얼 하중" value={`${detailTarget.reducer.allowedRadialLoad.toLocaleString()} N`} />
                  <DetailRow label="허용 액시얼 하중" value={`${detailTarget.reducer.allowedAxialLoad.toLocaleString()} N`} />
                  <DetailRow label="강성" value={`${detailTarget.reducer.rigidity} Nm/arcmin`} />
                  <DetailRow label="소음" value={`${detailTarget.reducer.noise} dB`} />
                  <DetailRow label="관성 모멘트" value={`${detailTarget.reducer.inertia} kgcm²`} />
                  <DetailRow label="중량" value={`${detailTarget.reducer.weight} kg`} />
                </div>

                <div className="border-t border-gray-200 pt-3">
                  <p className="text-xs font-semibold text-gray-500 mb-2">계산 결과</p>
                  <DetailRow label="출력 RPM" value={`${detailTarget.outputRPM.toFixed(1)} rpm`} highlight />
                  <DetailRow label="출력 토크" value={`${detailTarget.outputTorque.toFixed(2)} N·m`} highlight />
                  <DetailRow label="서비스 팩터" value={detailTarget.serviceFactor.toFixed(2)} highlight />
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-xs text-gray-500">적합성</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${SUITABILITY_CONFIG[detailTarget.suitability].bg} ${SUITABILITY_CONFIG[detailTarget.suitability].text} ${SUITABILITY_CONFIG[detailTarget.suitability].border}`}>
                      {SUITABILITY_CONFIG[detailTarget.suitability].icon} {SUITABILITY_CONFIG[detailTarget.suitability].label}
                    </span>
                  </div>
                </div>

                {detailTarget.adapter && (
                  <div className="border-t border-gray-200 pt-3">
                    <p className="text-xs font-semibold text-blue-600 mb-2">어댑터 형번</p>
                    <DetailRow label="형번" value={detailTarget.adapter.code} />
                    <DetailRow label="타입" value={detailTarget.adapter.type} />
                    <DetailRow label="축경 / 센터링" value={`${detailTarget.adapter.shaftDia} / ${detailTarget.adapter.centeringDia} mm`} />
                    <DetailRow label="고정 PCD" value={`${detailTarget.adapter.fixingPcd} mm`} />
                    {detailTarget.adapter.mountingTap && (
                      <DetailRow label="마운팅 탭" value={detailTarget.adapter.mountingTap} />
                    )}
                  </div>
                )}

                {detailTarget.bushing && (
                  <div className="border-t border-gray-200 pt-3">
                    <p className="text-xs font-semibold text-amber-600 mb-2">부싱 필요</p>
                    <DetailRow label="부싱 코드" value={detailTarget.bushing.code} />
                    <DetailRow label="축경 → 홀경" value={`${detailTarget.bushing.shaftMm} → ${detailTarget.bushing.holeMm} mm`} />
                    <DetailRow label="부싱 길이" value={`${detailTarget.bushing.lenMm} mm`} />
                  </div>
                )}

                {/* 도면 다운로드 */}
                <div className="border-t border-gray-200 pt-3">
                  <p className="text-xs font-semibold text-gray-500 mb-2">도면 / CAD 다운로드</p>
                  <DrawingLinks
                    series={detailTarget.reducer.series}
                    size={String(detailTarget.reducer.size).padStart(3, '0')}
                    stage={detailTarget.stage}
                    shaftHoleDiameter={selectedMotor.shaftDiameter}
                    mountingTap={selectedMotor.mountingTap}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {warningTarget && (
        <WarningModal
          onConfirm={() => confirmSelect(warningTarget)}
          onCancel={() => setWarningTarget(null)}
        />
      )}
    </div>
  );
}

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-xs font-medium ${highlight ? 'text-blue-700' : 'text-gray-800'}`}>{value}</span>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { useSelectionStore } from '../store/selectionStore';
import { calcOutputRPM, calcOutputTorque, calcServiceFactor, getSuitability, getEfficiency, getRatedTorque, findBushing, isShaftCompatible, LOAD_FACTORS } from '../utils/calculations';
import { getSeriesPhotos } from '../data/seriesPhotos';
import type { Reducer } from '../types';
import reducersData from '../data/reducers.json';

const reducers: Reducer[] = reducersData as unknown as Reducer[];

function SuitabilityBadge({ suitability }: { suitability: string }) {
  const config = {
    suitable:   { label: 'Suitable', icon: '\u2705', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
    caution:    { label: 'Caution',  icon: '\u26A0\uFE0F', bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
    unsuitable: { label: 'Unsuitable', icon: '\u274C', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  }[suitability] ?? { label: '-', icon: '', bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200' };

  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold border ${config.bg} ${config.text} ${config.border}`}>
      {config.icon} {config.label}
    </span>
  );
}

/** 시리즈 이미지 모달 */
function SeriesPhotoModal({ series, photos, onClose }: { series: string; photos: string[]; onClose: () => void }) {
  const [activeIdx, setActiveIdx] = useState(0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-800">{series} 시리즈 이미지</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Main image */}
        <div className="bg-gray-50 flex items-center justify-center p-6" style={{ minHeight: 480 }}>
          <img
            src={photos[activeIdx]}
            alt={`${series} ${activeIdx + 1}`}
            className="max-h-[432px] max-w-full object-contain"
            onError={(e) => { (e.target as HTMLImageElement).src = ''; }}
          />
        </div>

        {/* Thumbnail strip (사진이 여러 장일 때만) */}
        {photos.length > 1 && (
          <div className="flex gap-2 px-6 py-4 border-t border-gray-100 overflow-x-auto">
            {photos.map((src, i) => (
              <button
                key={src}
                onClick={() => setActiveIdx(i)}
                className={`shrink-0 w-24 h-24 rounded-lg border-2 overflow-hidden transition-all cursor-pointer
                  ${i === activeIdx ? 'border-blue-500 shadow-md' : 'border-gray-200 hover:border-gray-400'}`}
              >
                <img src={src} alt={`thumb ${i}`} className="w-full h-full object-contain bg-white p-1" />
              </button>
            ))}
          </div>
        )}

        <div className="px-6 py-3 text-xs text-gray-400 text-right border-t border-gray-100">
          {photos.length > 1 ? `${activeIdx + 1} / ${photos.length}` : ''}
        </div>
      </div>
    </div>
  );
}

export default function ReducerConditionPage() {
  const {
    selectedMotor,
    selectedReducer, setSelectedReducer,
    selectedRatio, setSelectedRatio,
    selectedType, setSelectedType,
    selectedSeries, setSelectedSeries,
    operatingConditions, setOperatingConditions,
    goToStep,
  } = useSelectionStore();

  const [photoModalSeries, setPhotoModalSeries] = useState<string | null>(null);

  // 모터 축경과 직결 또는 부싱으로 호환되는 모델 필터링
  const matchingReducers = useMemo(
    () => selectedMotor
      ? reducers.filter((r) => isShaftCompatible(selectedMotor.shaftDiameter, r.shaftHoleDiameter))
      : reducers,
    [selectedMotor],
  );

  // 타입(카테고리) 목록
  const allTypes = useMemo(
    () => [...new Set(matchingReducers.map((r) => r.type))].sort(),
    [matchingReducers],
  );

  // 타입으로 필터링된 감속기
  const typeFilteredReducers = useMemo(
    () => selectedType ? matchingReducers.filter((r) => r.type === selectedType) : matchingReducers,
    [selectedType, matchingReducers],
  );

  const allSeries = useMemo(
    () => [...new Set(typeFilteredReducers.map((r) => r.series))].sort(),
    [typeFilteredReducers],
  );

  // 선택한 시리즈에서 사용 가능한 전체 감속비 목록
  const seriesRatios = useMemo(() => {
    if (!selectedSeries) return [];
    const models = typeFilteredReducers.filter((r) => r.series === selectedSeries);
    const ratioSet = new Set<number>();
    models.forEach((r) => r.supportedRatios.forEach((ratio) => ratioSet.add(ratio)));
    return [...ratioSet].sort((a, b) => a - b);
  }, [selectedSeries, typeFilteredReducers]);

  // 시리즈 + 선택 감속비 모두 지원하는 모델만
  const seriesModels = useMemo(() => {
    if (!selectedSeries) return [];
    const bySeries = typeFilteredReducers.filter((r) => r.series === selectedSeries);
    if (!selectedRatio) return bySeries;
    return bySeries.filter((r) => r.supportedRatios.includes(selectedRatio));
  }, [selectedSeries, selectedRatio, typeFilteredReducers]);

  const calc = useMemo(() => {
    if (!selectedMotor || !selectedReducer || !selectedRatio) return null;
    const eff = getEfficiency(selectedReducer, selectedRatio);
    const ratedTorque = getRatedTorque(selectedReducer, selectedRatio);
    const outputRPM = calcOutputRPM(selectedMotor.ratedRPM, selectedRatio);
    const outputTorque = calcOutputTorque(selectedMotor.ratedTorque, selectedRatio, eff);
    const serviceFactor = calcServiceFactor(outputTorque, ratedTorque);
    const loadFactor = LOAD_FACTORS[operatingConditions.loadType] ?? 1.0;
    const suitability = getSuitability(serviceFactor, loadFactor);
    const stage = selectedReducer.ratioData[selectedRatio]?.stage ?? '-';
    return { outputRPM, outputTorque, serviceFactor, suitability, eff, ratedTorque, stage, loadFactor };
  }, [selectedMotor, selectedReducer, selectedRatio, operatingConditions.loadType]);

  const seriesPhotos = selectedSeries ? getSeriesPhotos(selectedSeries) : [];

  const bushing = useMemo(() => {
    if (!selectedMotor || !selectedReducer) return null;
    return findBushing(selectedMotor.shaftDiameter, selectedReducer.shaftHoleDiameter);
  }, [selectedMotor, selectedReducer]);

  if (!selectedMotor) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-gray-400 mb-4">선택된 모터가 없습니다.</p>
        <button onClick={() => goToStep(1)} className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer">
          모터 선택하기
        </button>
      </div>
    );
  }

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    setSelectedSeries('');
    setSelectedRatio(null);
    setSelectedReducer(null);
  };

  const handleSeriesChange = (series: string) => {
    setSelectedSeries(series);
    setSelectedRatio(null);
    setSelectedReducer(null);
  };

  const handleRatioChange = (ratio: number | null) => {
    setSelectedRatio(ratio);
    setSelectedReducer(null);
  };

  const handleModelChange = (modelId: string) => {
    const reducer = reducers.find((r) => r.id === modelId) ?? null;
    setSelectedReducer(reducer);
  };

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-800 mb-1">Step 3. 감속기 조건 입력</h2>
      <p className="text-sm text-gray-500 mb-5">운전 조건과 감속기를 설정해주세요.</p>

      {/* Motor Summary Banner */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 bg-gray-50 border border-gray-200 rounded-lg px-5 py-3 mb-6">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">선택 모터</span>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="font-semibold text-gray-800">{selectedMotor.brand} {selectedMotor.modelName}</span>
          <span className="text-gray-500">{selectedMotor.ratedPower} kW</span>
          <span className="text-gray-500">{selectedMotor.ratedRPM.toLocaleString()} rpm</span>
          <span className="text-gray-500">{selectedMotor.ratedTorque} N·m</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Form (3 cols) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Reducer Selection */}
          <fieldset className="border border-gray-200 rounded-lg p-5">
            <legend className="text-sm font-semibold text-gray-700 px-2">감속기 선택</legend>
            {/* 축경 매칭 안내 */}
            <p className="text-xs text-blue-600 mb-3">
              모터 축경 <strong>{selectedMotor.shaftDiameter} mm</strong> — 직결 또는 부싱으로 호환되는 감속기만 표시됩니다.
              {allSeries.length === 0 && <span className="text-red-500 ml-2">매칭되는 감속기가 없습니다.</span>}
            </p>

          {/* 드롭다운 행 */}
          <div className="flex flex-wrap items-end gap-3 mt-2">
              {/* Type */}
              <div className="w-36 shrink-0">
                <label className="block text-xs font-medium text-gray-500 mb-1">타입</label>
                <select
                  value={selectedType}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">전체</option>
                  {allTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Series */}
              <div className="w-32 shrink-0">
                <label className="block text-xs font-medium text-gray-500 mb-1">시리즈</label>
                <select
                  value={selectedSeries}
                  onChange={(e) => handleSeriesChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">선택하세요</option>
                  {allSeries.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Ratio */}
              <div className="w-28 shrink-0 ml-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">감속비</label>
                <select
                  value={selectedRatio ?? ''}
                  onChange={(e) => handleRatioChange(e.target.value ? Number(e.target.value) : null)}
                  disabled={seriesRatios.length === 0}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <option value="">선택하세요</option>
                  {seriesRatios.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {/* Model */}
              <div className="flex-1 min-w-[120px]">
                <label className="block text-xs font-medium text-gray-500 mb-1">모델</label>
                <select
                  value={selectedReducer?.id ?? ''}
                  onChange={(e) => handleModelChange(e.target.value)}
                  disabled={!selectedRatio || seriesModels.length === 0}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <option value="">선택하세요</option>
                  {seriesModels.map((r) => <option key={r.id} value={r.id}>{r.modelName}</option>)}
                </select>
              </div>
            </div>

          {/* 시리즈 썸네일 — 이미지 보기 버튼을 오버레이로 표시 */}
          {selectedSeries && seriesPhotos.length > 0 && (
            <div className="relative mt-3 w-40">
              <img
                src={seriesPhotos[0]}
                alt={selectedSeries}
                className="w-full h-36 object-contain p-2 rounded-lg border border-gray-200 bg-gray-50"
              />
              <button
                onClick={() => setPhotoModalSeries(selectedSeries)}
                title="시리즈 이미지 보기"
                className="absolute top-1.5 right-1.5 w-7 h-7 flex items-center justify-center rounded-md bg-white/80 hover:bg-white border border-gray-200 hover:border-blue-400 text-gray-500 hover:text-blue-600 shadow-sm transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </button>
            </div>
          )}
          </fieldset>

          {/* Operating Conditions */}
          <fieldset className="border border-gray-200 rounded-lg p-5">
            <legend className="text-sm font-semibold text-gray-700 px-2">운전 조건</legend>
            <div className="space-y-5 mt-2">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">일일 가동 시간 (hr/day)</label>
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={operatingConditions.hoursPerDay}
                  onChange={(e) => setOperatingConditions({ hoursPerDay: Math.max(1, Math.min(24, Number(e.target.value))) })}
                  className="w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">부하 특성</label>
                <div className="flex gap-4">
                  {['균일 부하', '중충격', '강충격'].map((type) => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="loadType" value={type}
                        checked={operatingConditions.loadType === type}
                        onChange={(e) => setOperatingConditions({ loadType: e.target.value })}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{type}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">설치 방향</label>
                <div className="flex gap-4">
                  {['수평', '수직'].map((dir) => (
                    <label key={dir} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="mountingDirection" value={dir}
                        checked={operatingConditions.mountingDirection === dir}
                        onChange={(e) => setOperatingConditions({ mountingDirection: e.target.value })}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{dir}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </fieldset>
        </div>

        {/* Right: Calculation Result (2 cols) */}
        <div className="lg:col-span-2">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 sticky top-8">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">실시간 계산 결과</h3>
            {!calc ? (
              <p className="text-sm text-gray-400 py-8 text-center">감속기와 감속비를 선택하면<br />계산 결과가 표시됩니다.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-500">예상 출력 RPM</span>
                  <span className="text-lg font-bold text-gray-800">{calc.outputRPM.toFixed(1)} <span className="text-xs font-normal text-gray-400">rpm</span></span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-500">예상 출력 토크</span>
                  <span className="text-lg font-bold text-gray-800">{calc.outputTorque.toFixed(2)} <span className="text-xs font-normal text-gray-400">N·m</span></span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-500">정격 토크 (감속비 {selectedRatio})</span>
                  <span className="text-sm font-medium text-gray-700">{calc.ratedTorque} <span className="text-xs font-normal text-gray-400">N·m</span></span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-500">적용 효율</span>
                  <span className="text-sm font-medium text-gray-700">{(calc.eff * 100).toFixed(0)}% <span className="text-xs text-gray-400">({calc.stage}단)</span></span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-500">서비스 팩터
                    <span className="ml-1 text-xs text-gray-400">(필요 ≥ {(1.2 * calc.loadFactor).toFixed(2)})</span>
                  </span>
                  <span className="text-lg font-bold text-gray-800">{calc.serviceFactor.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm text-gray-500">적합성</span>
                  <SuitabilityBadge suitability={calc.suitability} />
                </div>

                {/* 부싱 정보 */}
                {bushing && (
                  <div className="mt-3 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs font-semibold text-amber-700 mb-1">부싱 필요</p>
                    <p className="text-xs text-amber-600">
                      모터 축경 {selectedMotor?.shaftDiameter}mm → 감속기 홀 {selectedReducer?.shaftHoleDiameter}mm
                    </p>
                    <p className="text-xs font-medium text-amber-800 mt-0.5">
                      {bushing.code} (길이 {bushing.lenMm}mm)
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Photo Modal */}
      {photoModalSeries && (
        <SeriesPhotoModal
          series={photoModalSeries}
          photos={getSeriesPhotos(photoModalSeries)}
          onClose={() => setPhotoModalSeries(null)}
        />
      )}
    </div>
  );
}

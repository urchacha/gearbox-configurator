import { useState, useMemo, useRef, useEffect } from 'react';
import { useSelectionStore } from '../store/selectionStore';
import type { Motor } from '../types';
import motorsData from '../data/motors.json';

const motors: Motor[] = motorsData;
const allBrands = [...new Set(motors.map((m) => m.brand))].sort();

/** 모델명에서 시리즈(카테고리) 접두사 추출 */
function extractSeries(modelName: string): string {
  // "1FK7042-2AC71" → "1FK7"  /  "APMC-FCL08A" → "APMC"  /  "HG-SR26" → "HG"
  // "FMA EK06" → "FMA"  /  "R88M-..." → "R88M"  /  "BSH0703P" → "BSH"
  // 공백으로 나뉘면 첫 토큰, 아니면 '-' 첫 토큰에서 뒤쪽 숫자 제거
  const spaceIdx = modelName.indexOf(' ');
  if (spaceIdx > 0) return modelName.slice(0, spaceIdx);
  const dashIdx = modelName.indexOf('-');
  const base = dashIdx > 0 ? modelName.slice(0, dashIdx) : modelName;
  // 뒤쪽 순수 숫자 부분 제거 (예: "1FK7042" → "1FK", "AM8011" → "AM", "BSH0703P" → "BSH")
  const trimmed = base.replace(/[0-9]+[A-Za-z]*$/, '');
  return trimmed || base;
}

export default function MotorSelectPage() {
  const { selectedMotor, setSelectedMotor } = useSelectionStore();

  const [brand, setBrand] = useState<string>('');
  const [series, setSeries] = useState<string>('');
  const [modelQuery, setModelQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pendingMotor, setPendingMotor] = useState<Motor | null>(selectedMotor);

  // 브랜드에 해당하는 모터
  const brandMotors = useMemo(
    () => (brand ? motors.filter((m) => m.brand === brand) : []),
    [brand],
  );

  // 브랜드 내 시리즈 목록
  const seriesList = useMemo(() => {
    if (!brand) return [];
    const map = new Map<string, number>();
    for (const m of brandMotors) {
      const s = extractSeries(m.modelName);
      map.set(s, (map.get(s) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [brand, brandMotors]);

  // 시리즈에 해당하는 모터
  const seriesMotors = useMemo(() => {
    if (!series) return brandMotors;
    return brandMotors.filter((m) => extractSeries(m.modelName) === series);
  }, [series, brandMotors]);

  // 검색어로 필터링
  const filteredModels = useMemo(() => {
    if (!brand) return [];
    if (!modelQuery) return seriesMotors;
    const q = modelQuery.toLowerCase();
    return seriesMotors.filter((m) => m.modelName.toLowerCase().includes(q));
  }, [brand, modelQuery, seriesMotors]);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleBrandChange = (newBrand: string) => {
    setBrand(newBrand);
    setSeries('');
    setModelQuery('');
    setPendingMotor(null);
    setHighlightIdx(-1);
  };

  const handleSeriesChange = (newSeries: string) => {
    setSeries(newSeries);
    setModelQuery('');
    setPendingMotor(null);
    setHighlightIdx(-1);
  };

  const handleModelSelect = (motor: Motor) => {
    setPendingMotor(motor);
    setModelQuery(motor.modelName);
    setShowDropdown(false);
  };

  const handleConfirm = () => {
    if (pendingMotor) {
      setSelectedMotor(pendingMotor);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || filteredModels.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx((i) => Math.min(i + 1, filteredModels.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && highlightIdx >= 0) {
      e.preventDefault();
      handleModelSelect(filteredModels[highlightIdx]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  useEffect(() => {
    if (highlightIdx >= 0 && dropdownRef.current) {
      const el = dropdownRef.current.children[highlightIdx] as HTMLElement | undefined;
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIdx]);

  const catalogues = [
    { label: '유성감속기 카탈로그', file: '유성감속기_종합_250117.pdf' },
    { label: '할로우로터리 카탈로그', file: '할로우로터리_카다로그_종합_250117.pdf' },
  ];

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <h2 className="text-lg font-bold text-gray-800">Step 1. 모터 선택</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">카탈로그</span>
          {catalogues.map((c) => (
            <a
              key={c.file}
              href={`/catalogue/${c.file}`}
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-xs text-gray-600 hover:text-blue-700 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              {c.label}
            </a>
          ))}
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-8">원하는 모터 브랜드/모델을 검색하거나 선택하세요.</p>

      {/* Selection Row */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-8">
        <div className="flex items-end gap-4">
          {/* Brand Dropdown */}
          <div className="w-48 shrink-0">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">브랜드</label>
            <select
              value={brand}
              onChange={(e) => handleBrandChange(e.target.value)}
              className={`w-full border rounded-lg px-4 py-3 text-sm bg-white
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                ${brand ? 'border-blue-500 text-gray-900' : 'border-gray-300 text-gray-400'}`}
            >
              <option value="">브랜드 선택</option>
              {allBrands.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Series Dropdown */}
          <div className="w-44 shrink-0">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">시리즈</label>
            <select
              value={series}
              onChange={(e) => handleSeriesChange(e.target.value)}
              disabled={!brand}
              className={`w-full border rounded-lg px-4 py-3 text-sm bg-white
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed
                ${series ? 'border-blue-500 text-gray-900' : 'border-gray-300 text-gray-400'}`}
            >
              <option value="">전체 시리즈</option>
              {seriesList.map(([s]) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Model Search Input */}
          <div className="flex-1 min-w-[200px] relative">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">모델 선택</label>
            <input
              ref={inputRef}
              type="text"
              placeholder={brand ? '모델명 검색...' : '브랜드를 먼저 선택하세요'}
              value={modelQuery}
              disabled={!brand}
              onChange={(e) => {
                setModelQuery(e.target.value);
                setPendingMotor(null);
                setShowDropdown(true);
                setHighlightIdx(-1);
              }}
              onFocus={() => { if (brand) setShowDropdown(true); }}
              onKeyDown={handleKeyDown}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm bg-white
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
            />
            {/* Dropdown */}
            {showDropdown && brand && (
              <div
                ref={dropdownRef}
                className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto"
              >
                {filteredModels.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-gray-400 text-center">
                    일치하는 모델이 없습니다.
                  </div>
                ) : (
                  filteredModels.map((motor, idx) => (
                    <div
                      key={motor.id}
                      onClick={() => handleModelSelect(motor)}
                      className={`px-4 py-2.5 cursor-pointer border-b border-gray-50 last:border-b-0 transition-colors
                        ${idx === highlightIdx ? 'bg-blue-50' : 'hover:bg-gray-50'}
                        ${pendingMotor?.id === motor.id ? 'bg-blue-50' : ''}`}
                    >
                      <span className="text-sm text-gray-800">{motor.modelName}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Confirm Button */}
          <div className="shrink-0">
            <button
              onClick={handleConfirm}
              disabled={!pendingMotor}
              className={`px-6 py-3 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap
                ${pendingMotor
                  ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
            >
              모터 선택
            </button>
          </div>
        </div>
      </div>

      {/* Selected Motor Spec Card */}
      {selectedMotor && (
        <div className="mt-6 border border-blue-200 bg-blue-50/50 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-semibold text-blue-700">선택된 모터</span>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-blue-500 font-medium">{selectedMotor.brand}</p>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{selectedMotor.modelName}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-2 text-sm">
                <div>
                  <span className="text-gray-400 text-xs">정격 출력</span>
                  <p className="font-semibold text-gray-800">{selectedMotor.ratedPower} kW</p>
                </div>
                <div>
                  <span className="text-gray-400 text-xs">정격 RPM</span>
                  <p className="font-semibold text-gray-800">{selectedMotor.ratedRPM.toLocaleString()} rpm</p>
                </div>
                <div>
                  <span className="text-gray-400 text-xs">정격 토크</span>
                  <p className="font-semibold text-gray-800">{selectedMotor.ratedTorque} N·m</p>
                </div>
                <div>
                  <span className="text-gray-400 text-xs">샤프트 직경</span>
                  <p className="font-semibold text-gray-800">{selectedMotor.shaftDiameter} mm</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => { setSelectedMotor(null); setPendingMotor(null); setModelQuery(''); }}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors cursor-pointer shrink-0 ml-4"
            >
              선택 해제
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useSelectionStore } from '../store/selectionStore';

function StatCard({ label, value, unit }: { label: string; value: string | number; unit: string }) {
  return (
    <div className="bg-blue-50 rounded-xl p-5 text-center">
      <p className="text-xs font-medium text-blue-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-blue-700">{value}</p>
      <p className="text-xs text-blue-400 mt-1">{unit}</p>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-800">{value}</span>
    </div>
  );
}

export default function MotorSpecPage() {
  const { selectedMotor, goToStep } = useSelectionStore();

  if (!selectedMotor) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
        <p className="text-gray-400 mb-4">선택된 모터가 없습니다.</p>
        <button
          onClick={() => goToStep(1)}
          className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer"
        >
          모터 선택하기
        </button>
      </div>
    );
  }

  const m = selectedMotor;

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-800 mb-1">Step 2. 모터 확인</h2>
      <p className="text-sm text-gray-500 mb-6">선택한 모터의 상세 사양을 확인해주세요.</p>

      {/* Motor Title */}
      <div className="mb-6">
        <p className="text-xs font-medium text-blue-500">{m.brand}</p>
        <h3 className="text-2xl font-bold text-gray-900">{m.modelName}</h3>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="정격 출력" value={m.ratedPower} unit="kW" />
        <StatCard label="정격 RPM" value={m.ratedRPM.toLocaleString()} unit="rpm" />
        <StatCard label="정격 토크" value={m.ratedTorque} unit="N·m" />
        <StatCard label="샤프트 직경" value={m.shaftDiameter} unit="mm" />
      </div>

      {/* Full Spec Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2 pb-2 border-b-2 border-gray-200">
            성능 사양
          </h4>
          <SpecRow label="정격 출력" value={`${m.ratedPower} kW`} />
          <SpecRow label="정격 토크" value={`${m.ratedTorque} N·m`} />
          <SpecRow label="피크 토크" value={`${m.peakTorque} N·m`} />
          <SpecRow label="토크 비 (피크/정격)" value={`${(m.peakTorque / m.ratedTorque).toFixed(1)}x`} />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2 pb-2 border-b-2 border-gray-200">
            기계 사양
          </h4>
          <SpecRow label="정격 RPM" value={`${m.ratedRPM.toLocaleString()} rpm`} />
          <SpecRow label="최대 RPM" value={`${m.maxRPM.toLocaleString()} rpm`} />
          <SpecRow label="샤프트 직경" value={`${m.shaftDiameter} mm`} />
          <SpecRow label="관성 모멘트" value={`${m.inertia} ×10⁻⁴ kgm²`} />
        </div>
      </div>

      {/* Re-select button */}
      <div className="mt-8 pt-6 border-t border-gray-100 flex justify-center">
        <button
          onClick={() => goToStep(1)}
          className="px-5 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors cursor-pointer"
        >
          &larr; 모터 재선택
        </button>
      </div>
    </div>
  );
}

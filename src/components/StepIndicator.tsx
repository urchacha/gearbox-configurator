import { useSelectionStore } from '../store/selectionStore';

const STEPS = [
  { number: 1, label: '모터 선택' },
  { number: 2, label: '모터 확인' },
  { number: 3, label: '감속기 조건' },
  { number: 4, label: '감속기 선택' },
  { number: 5, label: '최종 확인' },
];

function CheckIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function StepIndicator() {
  const currentStep = useSelectionStore((s) => s.currentStep);

  return (
    <div className="w-full max-w-3xl mx-auto py-6 px-4">
      <div className="flex items-center">
        {STEPS.map((step, idx) => {
          const isCompleted = step.number < currentStep;
          const isCurrent = step.number === currentStep;

          return (
            <div key={step.number} className="flex items-center flex-1 last:flex-none">
              {/* Step circle + label */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold
                    transition-all duration-200
                    ${isCompleted
                      ? 'bg-blue-600 text-white'
                      : isCurrent
                        ? 'bg-white text-blue-600 border-2 border-blue-600 shadow-md'
                        : 'bg-gray-200 text-gray-400'
                    }
                  `}
                >
                  {isCompleted ? <CheckIcon /> : step.number}
                </div>
                <span
                  className={`
                    text-xs font-medium whitespace-nowrap
                    ${isCompleted
                      ? 'text-blue-600'
                      : isCurrent
                        ? 'text-blue-700 font-semibold'
                        : 'text-gray-400'
                    }
                  `}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {idx < STEPS.length - 1 && (
                <div
                  className={`
                    flex-1 h-0.5 mx-2 mt-[-1.25rem]
                    ${step.number < currentStep ? 'bg-blue-600' : 'bg-gray-200'}
                  `}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

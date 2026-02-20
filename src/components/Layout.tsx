import type { ReactNode } from 'react';
import { useSelectionStore } from '../store/selectionStore';
import StepIndicator from './StepIndicator';

function GearIcon() {
  return (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

interface LayoutProps {
  children: ReactNode;
  canProceed?: boolean;
  nextTooltip?: string;
}

export default function Layout({ children, canProceed = true, nextTooltip }: LayoutProps) {
  const { currentStep, goNext, goPrev } = useSelectionStore();

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="text-blue-600">
            <GearIcon />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">감속기 선정 시스템</h1>
            <p className="text-xs text-gray-400">Gearbox Configuration Tool</p>
          </div>
        </div>
      </header>

      {/* Step Indicator */}
      <div className="bg-white border-b border-gray-100">
        <StepIndicator />
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 min-h-[400px]">
          {children}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          {currentStep > 1 ? (
            <button
              onClick={goPrev}
              className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-600 font-medium
                         hover:bg-gray-50 hover:border-gray-400 transition-colors cursor-pointer"
            >
              &larr; 이전
            </button>
          ) : (
            <div />
          )}
          {currentStep < 5 ? (
            <div className="relative group">
              <button
                onClick={goNext}
                disabled={!canProceed}
                className={`px-6 py-2.5 rounded-lg font-medium transition-colors
                  ${canProceed
                    ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
              >
                다음 &rarr;
              </button>
              {!canProceed && nextTooltip && (
                <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-gray-800 text-white text-xs
                                rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity
                                pointer-events-none">
                  {nextTooltip}
                  <div className="absolute top-full right-4 border-4 border-transparent border-t-gray-800" />
                </div>
              )}
            </div>
          ) : (
            <div />
          )}
        </div>
      </main>
    </div>
  );
}

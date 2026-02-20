import { useSelectionStore } from './store/selectionStore';
import Layout from './components/Layout';
import MotorSelectPage from './pages/MotorSelectPage';
import MotorSpecPage from './pages/MotorSpecPage';
import ReducerConditionPage from './pages/ReducerConditionPage';
import ReducerSelectPage from './pages/ReducerSelectPage';
import ResultPage from './pages/ResultPage';

function App() {
  const { currentStep, selectedMotor, selectedReducer, selectedRatio } = useSelectionStore();

  const canProceed = (() => {
    switch (currentStep) {
      case 1: return selectedMotor !== null;
      case 2: return selectedMotor !== null;
      case 3: return selectedMotor !== null && selectedReducer !== null && selectedRatio !== null;
      case 4: return false; // Step 4 uses its own "선택" button to go to Step 5
      default: return true;
    }
  })();

  const nextTooltip = (() => {
    switch (currentStep) {
      case 1: return '모터를 선택해주세요';
      case 3:
        if (!selectedReducer) return '감속기를 선택해주세요';
        if (!selectedRatio) return '감속비를 선택해주세요';
        return undefined;
      default: return undefined;
    }
  })();

  const pages: Record<number, React.ReactNode> = {
    1: <MotorSelectPage />,
    2: <MotorSpecPage />,
    3: <ReducerConditionPage />,
    4: <ReducerSelectPage />,
    5: <ResultPage />,
  };

  return (
    <Layout canProceed={canProceed} nextTooltip={nextTooltip}>
      {pages[currentStep]}
    </Layout>
  );
}

export default App;

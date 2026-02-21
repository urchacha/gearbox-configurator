import { create } from 'zustand';
import type { Motor, Reducer, SelectionResult, OperatingConditions } from '../types';

interface SelectionState {
  currentStep: number;
  selectedMotor: Motor | null;
  selectedReducer: Reducer | null;
  selectedRatio: number | null;
  selectedType: string;
  selectedSeries: string;
  operatingConditions: OperatingConditions;
  selectionResult: SelectionResult | null;

  goToStep: (step: number) => void;
  goNext: () => void;
  goPrev: () => void;
  setSelectedMotor: (motor: Motor | null) => void;
  setSelectedReducer: (reducer: Reducer | null) => void;
  setSelectedRatio: (ratio: number | null) => void;
  setSelectedType: (type: string) => void;
  setSelectedSeries: (series: string) => void;
  setOperatingConditions: (conditions: Partial<OperatingConditions>) => void;
  setSelectionResult: (result: SelectionResult | null) => void;
  resetAll: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  currentStep: 1,
  selectedMotor: null,
  selectedReducer: null,
  selectedRatio: null,
  selectedType: '',
  selectedSeries: '',
  operatingConditions: {
    hoursPerDay: 8,
    loadType: '균일 부하',
    mountingDirection: '수평',
  },
  selectionResult: null,

  goToStep: (step) => set({ currentStep: Math.max(1, Math.min(5, step)) }),
  goNext: () => set((state) => ({ currentStep: Math.min(5, state.currentStep + 1) })),
  goPrev: () => set((state) => ({ currentStep: Math.max(1, state.currentStep - 1) })),
  setSelectedMotor: (motor) => set({ selectedMotor: motor }),
  setSelectedReducer: (reducer) => set({ selectedReducer: reducer }),
  setSelectedRatio: (ratio) => set({ selectedRatio: ratio }),
  setSelectedType: (type) => set({ selectedType: type }),
  setSelectedSeries: (series) => set({ selectedSeries: series }),
  setOperatingConditions: (conditions) =>
    set((state) => ({
      operatingConditions: { ...state.operatingConditions, ...conditions },
    })),
  setSelectionResult: (result) => set({ selectionResult: result }),
  resetAll: () => set({
    currentStep: 1,
    selectedMotor: null,
    selectedReducer: null,
    selectedRatio: null,
    selectedType: '',
    selectedSeries: '',
    operatingConditions: { hoursPerDay: 8, loadType: '균일 부하', mountingDirection: '수평' },
    selectionResult: null,
  }),
}));

import { create } from 'zustand';

type UIState = {
  errorMessage: string | null;
  setError: (message: string) => void;
  clearError: () => void;
};

export const useUIStore = create<UIState>()((set) => ({
  errorMessage: null,
  setError: (message) => set({ errorMessage: message }),
  clearError: () => set({ errorMessage: null }),
}));

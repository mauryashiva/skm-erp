import { create } from 'zustand';
import { Division, FinancialYear } from '../types';

interface ContextState {
  activeDivision: Division | null;
  activeFinancialYear: FinancialYear | null;
  availableDivisions: Division[];
  availableFinancialYears: FinancialYear[];
  setActiveDivision: (division: Division) => void;
  setActiveFinancialYear: (fy: FinancialYear) => void;
  setAvailableDivisions: (divisions: Division[]) => void;
  setAvailableFinancialYears: (fys: FinancialYear[]) => void;
  isHoActive: boolean;
}

export const useErpContextStore = create<ContextState>((set, get) => {
  let initialDiv: Division | null = null;
  let initialFY: FinancialYear | null = null;

  if (typeof window !== 'undefined') {
    try {
      const storedDiv = localStorage.getItem('skm_erp_active_division');
      const storedFY = localStorage.getItem('skm_erp_active_fy');
      if (storedDiv) initialDiv = JSON.parse(storedDiv);
      if (storedFY) initialFY = JSON.parse(storedFY);
    } catch {
      // ignore parsing error
    }
  }

  return {
    activeDivision: initialDiv,
    activeFinancialYear: initialFY,
    availableDivisions: [],
    availableFinancialYears: [],
    isHoActive: initialDiv?.is_ho ?? false,

    setActiveDivision: (division: Division) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('skm_erp_active_division', JSON.stringify(division));
      }
      set({ activeDivision: division, isHoActive: division.is_ho });
    },

    setActiveFinancialYear: (fy: FinancialYear) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('skm_erp_active_fy', JSON.stringify(fy));
      }
      set({ activeFinancialYear: fy });
    },

    setAvailableDivisions: (divisions: Division[]) => {
      const current = get().activeDivision;
      // If current active division is not in authorized list, select first authorized
      let active = current;
      if (!current || !divisions.some((d) => d.id === current.id)) {
        active = divisions.find((d) => d.is_ho) || divisions[0] || null;
        if (active && typeof window !== 'undefined') {
          localStorage.setItem('skm_erp_active_division', JSON.stringify(active));
        }
      }
      set({
        availableDivisions: divisions,
        activeDivision: active,
        isHoActive: active?.is_ho ?? false,
      });
    },

    setAvailableFinancialYears: (fys: FinancialYear[]) => {
      const current = get().activeFinancialYear;
      let active = current;
      if (!current || !fys.some((f) => f.id === current.id)) {
        active = fys.find((f) => f.isCurrent) || fys[0] || null;
        if (active && typeof window !== 'undefined') {
          localStorage.setItem('skm_erp_active_fy', JSON.stringify(active));
        }
      }
      set({
        availableFinancialYears: fys,
        activeFinancialYear: active,
      });
    },
  };
});

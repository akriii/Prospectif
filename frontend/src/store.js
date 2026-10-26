import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const INITIAL_VIEW_STATE = {
  longitude: 100.95,
  latitude: 4.65,
  zoom: 8.2,
  pitch: 0,
  bearing: 0,
}

export const useStore = create(
  persist(
    (set) => ({
      theme: 'light',
      toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),

      activeLayer: 'apex',
      // Switching pillars invalidates the selected hex (its score is layer-specific)
      setActiveLayer: (activeLayer) => set({ activeLayer, selectedHexId: null }),

      glow: false,
      toggleGlow: () => set((s) => ({ glow: !s.glow })),

      selectedHexId: null,
      selectHex: (selectedHexId) => set({ selectedHexId }),

      viewState: INITIAL_VIEW_STATE,
      setViewState: (viewState) => set({ viewState }),
    }),
    {
      name: 'prospectif-ui',
      // Only durable preferences survive a reload; map state starts fresh
      partialize: (s) => ({ theme: s.theme, activeLayer: s.activeLayer }),
    }
  )
)

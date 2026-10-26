import { FlyToInterpolator } from '@deck.gl/core'
import { Minus, Plus, RotateCcw } from 'lucide-react'
import { INITIAL_VIEW_STATE, useStore } from '../store'

const btn =
  'flex size-8 items-center justify-center text-ink-2 transition-colors hover:bg-ink/5 hover:text-ink dark:text-ink-2-dark dark:hover:bg-ink-dark/8 dark:hover:text-ink-dark'

export default function MapControls({ drawerOpen }) {
  const { viewState, setViewState } = useStore()

  const go = (next) =>
    setViewState({ ...viewState, ...next, transitionDuration: 500, transitionInterpolator: new FlyToInterpolator() })

  return (
    <div
      className={`absolute bottom-8 z-10 flex flex-col divide-y divide-hairline overflow-hidden rounded-lg border border-hairline bg-surface/92 shadow-md backdrop-blur transition-[right] duration-300 dark:divide-hairline-dark dark:border-hairline-dark dark:bg-surface-dark/90 ${
        drawerOpen ? 'right-[412px]' : 'right-4'
      }`}
    >
      <button type="button" className={btn} onClick={() => go({ zoom: viewState.zoom + 1 })} aria-label="Zoom in">
        <Plus className="size-4" />
      </button>
      <button type="button" className={btn} onClick={() => go({ zoom: viewState.zoom - 1 })} aria-label="Zoom out">
        <Minus className="size-4" />
      </button>
      <button type="button" className={btn} onClick={() => go(INITIAL_VIEW_STATE)} aria-label="Reset view">
        <RotateCcw className="size-4" />
      </button>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { useStore } from './store'
import { useBoundaries, useLayerData } from './hooks/useLayerData'
import MapView from './components/MapView'
import ControlPanel from './components/ControlPanel'
import HoverTooltip from './components/HoverTooltip'
import DetailDrawer from './components/DetailDrawer'
import MapControls from './components/MapControls'

export default function App() {
  const { theme, activeLayer, selectedHexId } = useStore()
  const layerQuery = useLayerData(activeLayer)
  const boundaries = useBoundaries()
  const [hover, setHover] = useState(null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const selectedCell = useMemo(
    () => layerQuery.cells.find((c) => c.id === selectedHexId) ?? null,
    [layerQuery.cells, selectedHexId]
  )

  return (
    <main className="relative h-full w-full overflow-hidden bg-plane text-ink dark:bg-plane-dark dark:text-ink-dark">
      <MapView
        points={layerQuery.data?.data ?? []}
        cells={layerQuery.cells}
        boundaries={boundaries.data}
        districtLabels={boundaries.labels}
        onHover={(info) => setHover(info.object ? info : null)}
      />
      <ControlPanel query={layerQuery} cellCount={layerQuery.cells.length} />
      <HoverTooltip hover={hover} layerData={layerQuery.data} />
      <DetailDrawer cell={selectedCell} layerData={layerQuery.data} />
      <MapControls drawerOpen={Boolean(selectedCell)} />
    </main>
  )
}

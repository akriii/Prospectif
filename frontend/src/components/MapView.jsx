import { useMemo } from 'react'
import DeckGL from '@deck.gl/react'
import { GeoJsonLayer, PolygonLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers'
import { HeatmapLayer } from '@deck.gl/aggregation-layers'
import Map from 'react-map-gl/maplibre'
import { setWorkerUrl } from 'maplibre-gl'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'

import { useStore } from '../store'
import { CATEGORIES, DIVERGING, PIN_ZOOM_FULL, PIN_ZOOM_START, THEME, TIER_ALPHA } from '../config/layers'
import { hexToRgb } from '../lib/colors'

// MapLibre locates its worker relative to its own module URL, which breaks once
// Vite pre-bundles or hashes it; hand it the emitted asset URL instead.
setWorkerUrl(maplibreWorkerUrl)

const clamp01 = (v) => Math.min(1, Math.max(0, v))

export default function MapView({ points, cells, boundaries, districtLabels, onHover }) {
  const { theme, glow, selectedHexId, selectHex, viewState, setViewState } = useStore()
  const palette = THEME[theme]

  const tierColors = useMemo(
    () => DIVERGING[theme].map((hex, i) => hexToRgb(hex, TIER_ALPHA[i])),
    [theme]
  )
  const categoryColors = useMemo(
    () => Object.fromEntries(Object.entries(CATEGORIES).map(([k, c]) => [k, hexToRgb(c[theme])])),
    [theme]
  )
  const selectedCell = useMemo(
    () => cells.find((c) => c.id === selectedHexId) ?? null,
    [cells, selectedHexId]
  )
  // Lets a pin click resolve to the hex it was binned into
  const cellOfPoint = useMemo(() => {
    const index = new globalThis.Map()
    for (const cell of cells) for (const p of cell.points) index.set(p, cell.id)
    return index
  }, [cells])

  // Zoom-driven handover from abstract hexes to concrete anchor pins
  const reveal = clamp01((viewState.zoom - PIN_ZOOM_START) / (PIN_ZOOM_FULL - PIN_ZOOM_START))
  const hexOpacity = 1 - 0.85 * reveal
  const showPins = reveal > 0

  const layers = [
    new GeoJsonLayer({
      id: 'district-boundaries',
      data: boundaries,
      stroked: true,
      filled: false,
      getLineColor: palette.boundary,
      lineWidthUnits: 'pixels',
      getLineWidth: 1.2,
      updateTriggers: { getLineColor: theme },
    }),

    glow &&
      new HeatmapLayer({
        id: 'glow-heatmap',
        data: points,
        getPosition: (d) => [d.lon, d.lat],
        getWeight: (d) => d.weight,
        radiusPixels: 40,
        intensity: 1.6,
        threshold: 0.05,
        opacity: 0.85 * hexOpacity,
        colorRange: DIVERGING[theme].map((hex) => hexToRgb(hex)),
        updateTriggers: { colorRange: theme },
      }),

    new PolygonLayer({
      id: 'opportunity-hexes',
      data: cells,
      getPolygon: (c) => c.polygon,
      // In glow mode the hexes stay as an invisible hit-target for hover/click
      getFillColor: (c) => (glow ? [0, 0, 0, 1] : tierColors[c.tier]),
      stroked: !glow,
      getLineColor: [...palette.surface, 200],
      lineWidthUnits: 'pixels',
      getLineWidth: 1,
      opacity: hexOpacity,
      pickable: true,
      autoHighlight: !glow,
      highlightColor: [...palette.ink, 50],
      onHover,
      onClick: ({ object }) => object && selectHex(object.id),
      transitions: { getFillColor: 400 },
      updateTriggers: { getFillColor: [theme, glow], getLineColor: theme },
    }),

    selectedCell &&
      new PolygonLayer({
        id: 'selected-hex',
        data: [selectedCell],
        getPolygon: (c) => c.polygon,
        filled: false,
        stroked: true,
        getLineColor: palette.ink,
        lineWidthUnits: 'pixels',
        getLineWidth: 2.5,
        updateTriggers: { getLineColor: theme },
      }),

    showPins &&
      new ScatterplotLayer({
        id: 'anchor-pins',
        data: points,
        getPosition: (d) => [d.lon, d.lat],
        getFillColor: (d) => categoryColors[d.category],
        getLineColor: palette.surface,
        stroked: true,
        lineWidthUnits: 'pixels',
        getLineWidth: 2,
        radiusUnits: 'pixels',
        getRadius: 6,
        opacity: reveal,
        pickable: true,
        autoHighlight: true,
        highlightColor: [...palette.ink, 80],
        onHover,
        onClick: ({ object }) => object && cellOfPoint.has(object) && selectHex(cellOfPoint.get(object)),
        updateTriggers: { getFillColor: theme, getLineColor: theme },
      }),

    viewState.zoom < 10.5 &&
      new TextLayer({
        id: 'district-labels',
        data: districtLabels,
        getPosition: (d) => d.position,
        getText: (d) => d.name,
        getSize: 12,
        getColor: [...palette.ink, 170],
        fontFamily: 'Inter, system-ui, sans-serif',
        fontWeight: 600,
        outlineWidth: 3,
        outlineColor: [...palette.surface, 220],
        // Extra atlas padding keeps glyphs with negative bearings (e.g. 'j') from clipping
        fontSettings: { sdf: true, buffer: 10 },
        updateTriggers: { getColor: theme, outlineColor: theme },
      }),
  ].filter(Boolean)

  return (
    <DeckGL
      viewState={viewState}
      onViewStateChange={({ viewState: next }) => setViewState(next)}
      controller={{ doubleClickZoom: true, scrollZoom: { smooth: true } }}
      layers={layers}
      getCursor={({ isDragging, isHovering }) => (isDragging ? 'grabbing' : isHovering ? 'pointer' : 'grab')}
    >
      <Map mapStyle={palette.basemap} attributionControl={{ compact: true }} />
    </DeckGL>
  )
}

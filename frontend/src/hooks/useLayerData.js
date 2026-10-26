import { useMemo } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchBoundaries, fetchLayer } from '../lib/api'
import { binPoints } from '../lib/hexbin'
import { DIVERGING, HEX_RADIUS_M } from '../config/layers'

export function useLayerData(layer) {
  const query = useQuery({
    queryKey: ['predict', layer],
    queryFn: () => fetchLayer(layer),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  })

  const cells = useMemo(
    () => binPoints(query.data?.data ?? [], HEX_RADIUS_M, DIVERGING.light.length),
    [query.data]
  )

  return { ...query, cells }
}

// Label anchor for a district: centre of the bounding box of its largest ring
function labelPosition(geometry) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  let best = null
  for (const polygon of polygons) {
    const ring = polygon[0]
    if (!best || ring.length > best.length) best = ring
  }
  let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity]
  for (const [x, y] of best) {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  return [(minX + maxX) / 2, (minY + maxY) / 2]
}

export function useBoundaries() {
  const query = useQuery({
    queryKey: ['boundaries'],
    queryFn: fetchBoundaries,
    staleTime: Infinity,
  })

  const labels = useMemo(
    () =>
      (query.data?.features ?? []).map((f) => ({
        name: f.properties.district,
        position: labelPosition(f.geometry),
      })),
    [query.data]
  )

  return { ...query, labels }
}

// Client-side hexagonal binning of the scored OSM anchors.
//
// Each cell's opportunity index is the sum of its anchors' weights, i.e.
// (anchor count) x (district score). Cells are then ranked against each other
// so colour encodes a percentile within Perak rather than a raw sum that a
// single dense cafe strip would dominate.

const SQRT3 = Math.sqrt(3)
const M_PER_DEG_LAT = 110574
const M_PER_DEG_LON_EQUATOR = 111320

// Local equirectangular projection. Perak spans ~2 degrees of latitude near the
// equator, so distortion against Web Mercator is well under 1%.
function makeProjection(lat0) {
  const kx = M_PER_DEG_LON_EQUATOR * Math.cos((lat0 * Math.PI) / 180)
  return {
    toXY: (lon, lat) => [lon * kx, lat * M_PER_DEG_LAT],
    toLonLat: (x, y) => [x / kx, y / M_PER_DEG_LAT],
  }
}

// Pointy-top axial coordinates with cube rounding
function axialRound(qf, rf) {
  const sf = -qf - rf
  let q = Math.round(qf)
  let r = Math.round(rf)
  const s = Math.round(sf)
  const dq = Math.abs(q - qf)
  const dr = Math.abs(r - rf)
  const ds = Math.abs(s - sf)
  if (dq > dr && dq > ds) q = -r - s
  else if (dr > ds) r = -q - s
  return [q, r]
}

function percentileRanks(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const lowerBound = (v) => {
    let lo = 0
    let hi = sorted.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (sorted[mid] < v) lo = mid + 1
      else hi = mid
    }
    return lo
  }
  const upperBound = (v) => {
    let lo = 0
    let hi = sorted.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (sorted[mid] <= v) lo = mid + 1
      else hi = mid
    }
    return lo
  }
  // Mid-rank so ties share one percentile
  return values.map((v) => {
    const below = lowerBound(v)
    const equal = upperBound(v) - below
    return (below + equal / 2) / sorted.length
  })
}

export function binPoints(points, radiusM, tierCount) {
  if (!points.length) return []

  const lat0 = points.reduce((sum, p) => sum + p.lat, 0) / points.length
  const proj = makeProjection(lat0)
  const cells = new Map()

  for (const point of points) {
    const [x, y] = proj.toXY(point.lon, point.lat)
    const [q, r] = axialRound((SQRT3 / 3 * x - y / 3) / radiusM, (2 / 3 * y) / radiusM)
    const id = `${q},${r}`

    let cell = cells.get(id)
    if (!cell) {
      const cx = radiusM * SQRT3 * (q + r / 2)
      const cy = radiusM * 1.5 * r
      const polygon = []
      for (let i = 0; i <= 6; i++) {
        const angle = (Math.PI / 180) * (60 * i - 30)
        polygon.push(proj.toLonLat(cx + radiusM * Math.cos(angle), cy + radiusM * Math.sin(angle)))
      }
      cell = {
        id,
        centroid: proj.toLonLat(cx, cy),
        polygon,
        points: [],
        score: 0,
        categories: {},
        districts: {},
      }
      cells.set(id, cell)
    }

    cell.points.push(point)
    cell.score += point.weight
    cell.categories[point.category] = (cell.categories[point.category] || 0) + 1
    cell.districts[point.district] = (cell.districts[point.district] || 0) + 1
  }

  const list = [...cells.values()]
  const ranks = percentileRanks(list.map((c) => c.score))

  list.forEach((cell, i) => {
    cell.count = cell.points.length
    cell.district = Object.entries(cell.districts).sort((a, b) => b[1] - a[1])[0][0]
    cell.percentile = ranks[i]
    cell.tier = Math.min(tierCount - 1, Math.floor(ranks[i] * tierCount))
  })

  return list
}

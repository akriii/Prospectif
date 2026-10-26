import { useStore } from '../store'
import { CATEGORIES, CATEGORY_ORDER } from '../config/layers'
import { fmtRank, fmtScore } from '../lib/format'
import { breakdown, tierFor } from '../lib/verdict'

const OFFSET = 14
const WIDTH = 248

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="tabular font-medium text-ink dark:text-ink-dark">{value}</span>
    </div>
  )
}

function CellBody({ cell, layerData }) {
  const district = layerData.districts[cell.district]
  const terms = breakdown(layerData.meta.formula, district?.metrics)
  return (
    <>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="font-semibold text-ink dark:text-ink-dark">{cell.district}</span>
        <span className="text-[11px] font-medium text-ink-2 dark:text-ink-2-dark">{tierFor(cell.percentile).label}</span>
      </div>
      <div className="space-y-0.5">
        <Row label="Rank in Perak" value={fmtRank(cell.percentile)} />
        <Row label="Cell index (Σ weights)" value={fmtScore(cell.score)} />
        <Row label="District score" value={fmtScore(district?.score)} />
        <Row
          label="Anchors"
          value={CATEGORY_ORDER.filter((c) => cell.categories[c])
            .map((c) => `${cell.categories[c]} ${CATEGORIES[c].label.toLowerCase()}`)
            .join(' · ')}
        />
      </div>
      <div className="mt-2 space-y-0.5 border-t border-hairline pt-2 dark:border-hairline-dark">
        {terms.map((t) => (
          <Row key={t.metric} label={t.display} value={fmtScore(t.value)} />
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted">Click for full breakdown</p>
    </>
  )
}

function PinBody({ point }) {
  const theme = useStore((s) => s.theme)
  const category = CATEGORIES[point.category]
  return (
    <>
      <div className="mb-1 font-semibold text-ink dark:text-ink-dark">{point.name}</div>
      <div className="mb-1.5 flex items-center gap-1.5 text-ink-2 dark:text-ink-2-dark">
        <span className="size-2 rounded-full" style={{ backgroundColor: category[theme] }} />
        {category.label} · {category.detail}
      </div>
      <Row label="District" value={point.district} />
      <Row label="Anchor weight" value={fmtScore(point.weight)} />
    </>
  )
}

export default function HoverTooltip({ hover, layerData }) {
  if (!hover?.object || !layerData) return null
  const isPin = hover.layer?.id === 'anchor-pins'

  // Flip to the left of the cursor near the right edge
  const flip = hover.x + OFFSET + WIDTH > window.innerWidth - 16
  const style = {
    left: flip ? hover.x - OFFSET - WIDTH : hover.x + OFFSET,
    top: Math.min(hover.y + OFFSET, window.innerHeight - 240),
    width: WIDTH,
  }

  return (
    <div
      role="tooltip"
      style={style}
      className="pointer-events-none absolute z-30 rounded-lg border border-hairline bg-surface/97 px-3 py-2.5 text-xs shadow-lg backdrop-blur dark:border-hairline-dark dark:bg-surface-dark/95"
    >
      {isPin ? <PinBody point={hover.object} /> : <CellBody cell={hover.object} layerData={layerData} />}
    </div>
  )
}

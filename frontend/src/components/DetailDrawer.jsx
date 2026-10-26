import { useEffect } from 'react'
import { FlyToInterpolator } from '@deck.gl/core'
import { Crosshair, X } from 'lucide-react'
import { useStore } from '../store'
import { CATEGORIES, CATEGORY_ORDER, DIVERGING, LAYER_UI } from '../config/layers'
import { fmtInt, fmtPct, fmtRank, fmtRm, fmtScore } from '../lib/format'
import { breakdown, buildVerdict } from '../lib/verdict'

function SectionTitle({ children }) {
  return <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted">{children}</h3>
}

function ScoreBreakdown({ terms, total }) {
  return (
    <section>
      <SectionTitle>Score breakdown</SectionTitle>
      <ul className="space-y-3">
        {terms.map((t) => (
          <li key={t.metric}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
              <span className="text-ink dark:text-ink-dark">
                <span className="tabular font-semibold">{fmtPct(t.weight)}</span> × {t.display}
              </span>
              <span className="tabular text-ink-2 dark:text-ink-2-dark">
                {fmtScore(t.value)} → <span className="font-semibold text-ink dark:text-ink-dark">{t.contribution.toFixed(3)}</span>
              </span>
            </div>
            {/* Track = the term's full weight; fill = what this district earns of it */}
            <div className="h-1.5 rounded-full bg-hairline dark:bg-hairline-dark" style={{ width: `${t.weight * 100}%` }}>
              <div
                className="h-full rounded-full bg-accent dark:bg-accent-dark"
                style={{ width: `${Math.max(2, t.value * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-baseline justify-between border-t border-hairline pt-2.5 text-sm dark:border-hairline-dark">
        <span className="text-ink-2 dark:text-ink-2-dark">District score</span>
        <span className="tabular font-bold text-ink dark:text-ink-dark">{fmtScore(total)}</span>
      </div>
      <p className="mt-1.5 text-[11px] leading-snug text-muted">
        Inverted factors score 1 − value, so a lower raw figure helps. Education index is a proxy based on university
        presence.
      </p>
    </section>
  )
}

function Anchors({ cell, theme }) {
  const named = cell.points.filter((p) => p.name && p.name !== 'Unnamed Location')
  return (
    <section>
      <SectionTitle>Anchors in this cell</SectionTitle>
      <div className="mb-3 grid grid-cols-3 gap-2">
        {CATEGORY_ORDER.map((c) => (
          <div key={c} className="rounded-lg border border-hairline px-2.5 py-2 dark:border-hairline-dark">
            <div className="flex items-center gap-1.5 text-[11px] text-ink-2 dark:text-ink-2-dark">
              <span className="size-2 rounded-full" style={{ backgroundColor: CATEGORIES[c][theme] }} />
              {CATEGORIES[c].label}
            </div>
            <div className="tabular mt-0.5 text-lg font-semibold text-ink dark:text-ink-dark">
              {fmtInt(cell.categories[c] ?? 0)}
            </div>
          </div>
        ))}
      </div>
      {named.length > 0 ? (
        <ul className="divide-y divide-hairline text-xs dark:divide-hairline-dark">
          {named.slice(0, 6).map((p, i) => (
            <li key={`${p.name}-${i}`} className="flex items-center gap-2 py-1.5">
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: CATEGORIES[p.category][theme] }} />
              <span className="truncate text-ink dark:text-ink-dark">{p.name}</span>
            </li>
          ))}
          {named.length > 6 && <li className="py-1.5 text-muted">+{named.length - 6} more named anchors</li>}
        </ul>
      ) : (
        <p className="text-xs text-muted">No named anchors in this cell.</p>
      )}
    </section>
  )
}

function DistrictFacts({ raw }) {
  const rows = [
    ['Population', fmtInt(raw.population)],
    ['Employed workforce', fmtInt(raw.jobs)],
    ['Median household income', fmtRm(raw.income)],
    ['Unsold housing units', fmtInt(raw.overhang)],
    ['Cafes & malls per 10k residents', raw.lifestyle_density.toFixed(1)],
  ]
  return (
    <section>
      <SectionTitle>District fundamentals</SectionTitle>
      <dl className="space-y-1 text-xs">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt className="text-ink-2 dark:text-ink-2-dark">{label}</dt>
            <dd className="tabular font-medium text-ink dark:text-ink-dark">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-1.5 text-[11px] text-muted">Sources: OpenDOSM, NAPIC, OpenStreetMap.</p>
    </section>
  )
}

export default function DetailDrawer({ cell, layerData }) {
  const { theme, activeLayer, selectHex, viewState, setViewState } = useStore()

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && selectHex(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectHex])

  const open = Boolean(cell && layerData)
  // The payload's own key, so placeholder data from the previous pillar stays self-consistent
  const layerKey = layerData?.layer ?? activeLayer
  const district = open ? layerData.districts[cell.district] : null
  const terms = open ? breakdown(layerData.meta.formula, district?.metrics) : []
  const verdict = open ? buildVerdict({ layer: layerKey, layerTitle: layerData.meta.title, cell, terms }) : null
  const Icon = LAYER_UI[layerKey].icon
  const otherDistricts = open ? Object.keys(cell.districts).filter((d) => d !== cell.district) : []

  const zoomTo = () =>
    setViewState({
      ...viewState,
      longitude: cell.centroid[0],
      latitude: cell.centroid[1],
      zoom: Math.max(viewState.zoom, 13.5),
      transitionDuration: 1200,
      transitionInterpolator: new FlyToInterpolator(),
    })

  return (
    <aside
      aria-hidden={!open}
      className={`absolute top-4 right-4 bottom-4 z-20 flex w-[380px] flex-col overflow-hidden rounded-xl border border-hairline bg-surface/96 shadow-2xl shadow-black/10 backdrop-blur-md transition-transform duration-300 ease-out dark:border-hairline-dark dark:bg-surface-dark/95 dark:shadow-black/50 ${
        open ? 'translate-x-0' : 'pointer-events-none translate-x-[calc(100%+2rem)]'
      }`}
    >
      {open && (
        <>
          <header className="border-b border-hairline px-5 pt-5 pb-4 dark:border-hairline-dark">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted">
                  <Icon className="size-3.5" /> {layerData.meta.title}
                </p>
                <h2 className="mt-1 truncate text-xl font-bold tracking-tight text-ink dark:text-ink-dark">{cell.district}</h2>
                {otherDistricts.length > 0 && (
                  <p className="text-[11px] text-muted">Cell also touches {otherDistricts.join(', ')}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => selectHex(null)}
                className="rounded-md p-1.5 text-ink-2 hover:bg-ink/5 dark:text-ink-2-dark dark:hover:bg-ink-dark/8"
                aria-label="Close details"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div>
                <div className="text-[11px] text-muted">Rank</div>
                <div className="tabular text-base font-semibold text-ink dark:text-ink-dark">{fmtRank(cell.percentile)}</div>
              </div>
              <div>
                <div className="text-[11px] text-muted">Cell index</div>
                <div className="tabular text-base font-semibold text-ink dark:text-ink-dark">{fmtScore(cell.score)}</div>
              </div>
              <div>
                <div className="text-[11px] text-muted">Anchors</div>
                <div className="tabular text-base font-semibold text-ink dark:text-ink-dark">{fmtInt(cell.count)}</div>
              </div>
            </div>
          </header>

          <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
            <section className="rounded-lg border border-hairline p-3.5 dark:border-hairline-dark">
              <div className="mb-1.5 flex items-center gap-2">
                <span
                  className="size-2.5 rounded-sm"
                  style={{ backgroundColor: DIVERGING[theme][cell.tier] }}
                  aria-hidden="true"
                />
                <span className="text-sm font-semibold text-ink dark:text-ink-dark">{verdict.tier.label}</span>
              </div>
              <p className="text-[13px] leading-relaxed text-ink-2 dark:text-ink-2-dark">{verdict.text}</p>
            </section>

            <ScoreBreakdown terms={terms} total={district?.score} />
            <Anchors cell={cell} theme={theme} />
            {district && <DistrictFacts raw={district.raw} />}

            <p className="text-[11px] leading-snug text-muted">
              Cell index = sum of anchor weights (anchor count × district score), ranked against every other
              1.5 km cell in Perak for this pillar.
            </p>
          </div>

          <footer className="border-t border-hairline px-5 py-3 dark:border-hairline-dark">
            <button
              type="button"
              onClick={zoomTo}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-3 py-2 text-sm font-medium text-surface transition-opacity hover:opacity-90 dark:bg-ink-dark dark:text-surface-dark"
            >
              <Crosshair className="size-4" /> Zoom to anchors
            </button>
          </footer>
        </>
      )}
    </aside>
  )
}

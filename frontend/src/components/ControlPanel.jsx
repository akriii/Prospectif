import { AlertTriangle, Loader2, Moon, Sparkles, Sun } from 'lucide-react'
import { useStore } from '../store'
import { LAYER_ORDER, LAYER_UI } from '../config/layers'
import { fmtInt, fmtPct } from '../lib/format'
import { termLabel } from '../lib/verdict'
import Legend from './Legend'

function PillarButton({ layerKey, meta, active, onSelect }) {
  const ui = LAYER_UI[layerKey]
  const Icon = ui.icon
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(layerKey)}
        aria-pressed={active}
        className={`group flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
          active
            ? 'border-accent bg-accent/8 dark:border-accent-dark dark:bg-accent-dark/12'
            : 'border-hairline hover:border-ink-2/40 hover:bg-ink/3 dark:border-hairline-dark dark:hover:border-ink-2-dark/40 dark:hover:bg-ink-dark/5'
        }`}
      >
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-md ${
            active
              ? 'bg-accent text-white dark:bg-accent-dark dark:text-surface-dark'
              : 'bg-ink/5 text-ink-2 dark:bg-ink-dark/8 dark:text-ink-2-dark'
          }`}
        >
          <Icon className="size-4" strokeWidth={2} />
        </span>
        <span
          className={`text-sm font-semibold ${
            active ? 'text-accent dark:text-accent-dark' : 'text-ink dark:text-ink-dark'
          }`}
        >
          {meta?.title ?? ui.fallbackTitle}
        </span>
      </button>
    </li>
  )
}

function ActiveLogic({ meta }) {
  if (!meta) return null
  return (
    <div className="rounded-lg bg-ink/[0.03] p-3 dark:bg-ink-dark/[0.04]">
      <p className="text-[13px] leading-relaxed text-ink-2 dark:text-ink-2-dark">{meta.description}</p>
      <ul className="mt-2.5 flex flex-wrap gap-1.5">
        {meta.formula.map((term) => (
          <li
            key={term.metric}
            className="rounded-md border border-hairline bg-surface px-2 py-0.5 text-[11px] text-ink-2 dark:border-hairline-dark dark:bg-surface-dark dark:text-ink-2-dark"
          >
            <span className="tabular font-semibold text-ink dark:text-ink-dark">{fmtPct(term.weight)}</span>{' '}
            {termLabel(term)}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Status({ isLoading, isFetching, error, data, cellCount }) {
  if (error) {
    return (
      <p className="flex items-start gap-2 text-xs text-[#d03b3b]">
        <AlertTriangle className="mt-px size-3.5 shrink-0" />
        <span>
          Analytics engine unreachable. <span className="text-muted">{error.message}</span>
        </span>
      </p>
    )
  }
  if (isLoading || !data) {
    return (
      <p className="flex items-center gap-2 text-xs text-muted">
        <Loader2 className="size-3.5 animate-spin" /> Calculating spatial weights…
      </p>
    )
  }
  return (
    <p className="tabular flex items-center justify-between text-xs text-muted">
      <span>
        {fmtInt(data.total_points)} anchors · {fmtInt(cellCount)} cells · {Object.keys(data.districts).length} districts
      </span>
      {isFetching && <Loader2 className="size-3.5 animate-spin" aria-label="Refreshing" />}
    </p>
  )
}

export default function ControlPanel({ query, cellCount }) {
  const { theme, toggleTheme, activeLayer, setActiveLayer, glow, toggleGlow } = useStore()
  const meta = query.data?.layer === activeLayer ? query.data.meta : null

  return (
    <aside className="pointer-events-auto absolute top-4 bottom-4 left-4 z-10 flex w-[340px] flex-col overflow-hidden rounded-xl border border-hairline bg-surface/92 shadow-xl shadow-black/5 backdrop-blur-md dark:border-hairline-dark dark:bg-surface-dark/90 dark:shadow-black/40">
      <header className="flex items-start justify-between border-b border-hairline px-5 pt-5 pb-4 dark:border-hairline-dark">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-ink dark:text-ink-dark">Prospectif</h1>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">Urban feasibility engine · Perak</p>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-md border border-hairline p-1.5 text-ink-2 transition-colors hover:bg-ink/5 dark:border-hairline-dark dark:text-ink-2-dark dark:hover:bg-ink-dark/8"
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? <Moon className="size-4" /> : <Sun className="size-4" />}
        </button>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        <section aria-labelledby="pillars-heading" className="space-y-2.5">
          <h2 id="pillars-heading" className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Feasibility pillars
          </h2>
          <ul className="space-y-1.5">
            {LAYER_ORDER.map((key) => (
              <PillarButton
                key={key}
                layerKey={key}
                meta={query.data?.layer === key ? query.data.meta : null}
                active={activeLayer === key}
                onSelect={setActiveLayer}
              />
            ))}
          </ul>
          <ActiveLogic meta={meta} />
        </section>

        <Legend sources={meta?.sources ?? []} />

        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-hairline px-3 py-2.5 dark:border-hairline-dark">
          <span className="flex items-center gap-2 text-sm text-ink dark:text-ink-dark">
            <Sparkles className="size-4 text-ink-2 dark:text-ink-2-dark" />
            Heatmap
          </span>
          <input type="checkbox" className="peer sr-only" checked={glow} onChange={toggleGlow} />
          <span className="relative h-5 w-9 rounded-full bg-hairline transition-colors peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent/50 after:absolute after:top-0.5 after:left-0.5 after:size-4 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-4 dark:bg-hairline-dark dark:peer-checked:bg-accent-dark" />
        </label>
      </div>

      <footer className="border-t border-hairline px-5 py-3 dark:border-hairline-dark">
        <Status {...query} cellCount={cellCount} />
      </footer>
    </aside>
  )
}

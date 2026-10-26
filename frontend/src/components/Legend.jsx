import { useStore } from '../store'
import { CATEGORIES, CATEGORY_ORDER, DIVERGING, LAYER_UI, PIN_ZOOM_START } from '../config/layers'

export default function Legend({ sources }) {
  const { theme, activeLayer, glow } = useStore()
  const ui = LAYER_UI[activeLayer]
  const steps = DIVERGING[theme]

  return (
    <section aria-labelledby="legend-heading" className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 id="legend-heading" className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          Opportunity
        </h2>
        <span className="text-[11px] text-muted">{glow ? 'density glow' : 'percentile within Perak'}</span>
      </div>

      <div>
        <div className="flex gap-0.5" role="img" aria-label="Colour scale from low opportunity in blue to high opportunity in red">
          {steps.map((hex, i) => (
            <span
              key={hex}
              className={`h-2.5 flex-1 ${i === 0 ? 'rounded-l' : ''} ${i === steps.length - 1 ? 'rounded-r' : ''}`}
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] text-ink-2 dark:text-ink-2-dark">
          <span>Low</span>
          <span className="text-muted">Perak median</span>
          <span>High</span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-3 text-[11px] leading-snug text-ink-2 dark:text-ink-2-dark">
          <p>{ui.legendLow}</p>
          <p className="text-right">{ui.legendHigh}</p>
        </div>
      </div>

      <div className="border-t border-hairline pt-3 dark:border-hairline-dark">
        <p className="mb-2 text-[11px] text-muted">Anchor pins appear from zoom {PIN_ZOOM_START}</p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
          {CATEGORY_ORDER.filter((c) => sources.includes(c)).map((key) => (
            <li key={key} className="flex items-center gap-1.5 text-xs text-ink dark:text-ink-dark">
              <span
                className="size-2.5 rounded-full ring-2 ring-surface dark:ring-surface-dark"
                style={{ backgroundColor: CATEGORIES[key][theme] }}
              />
              {CATEGORIES[key].label}
              <span className="text-muted">· {CATEGORIES[key].detail}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

import { LAYER_UI } from '../config/layers'
import { fmtRank } from './format'

export const TIERS = [
  { min: 0.85, key: 'prime', label: 'Prime opportunity', band: 'high' },
  { min: 0.6, key: 'strong', label: 'Strong opportunity', band: 'high' },
  { min: 0.4, key: 'moderate', label: 'Moderate opportunity', band: 'mid' },
  { min: 0, key: 'weak', label: 'Weak opportunity', band: 'low' },
]

export const tierFor = (percentile) => TIERS.find((t) => percentile >= t.min)

// How each formula term reads once its direction is applied
export function termLabel(term) {
  return term.inverted ? `Low ${term.label.charAt(0).toLowerCase()}${term.label.slice(1)}` : term.label
}

/** Expand a layer formula against one district's metrics. */
export function breakdown(formula, metrics) {
  return formula.map((term) => {
    const raw = metrics?.[term.metric] ?? 0
    const value = term.inverted ? 1 - raw : raw
    return { ...term, display: termLabel(term), raw, value, contribution: term.weight * value }
  })
}

export function buildVerdict({ layer, layerTitle, cell, terms }) {
  const tier = tierFor(cell.percentile)
  const ranked = [...terms].sort((a, b) => b.value - a.value)
  const strongest = ranked[0]
  const weakest = ranked[ranked.length - 1]

  const parts = [
    `This cell ranks in the ${fmtRank(cell.percentile).toLowerCase()} of Perak for ${layerTitle}, ` +
      `backed by ${cell.count} mapped anchor${cell.count === 1 ? '' : 's'} in ${cell.district}.`,
  ]
  if (strongest && weakest && strongest !== weakest) {
    parts.push(
      `Its strongest driver is ${strongest.display.toLowerCase()} (${strongest.value.toFixed(2)}); ` +
        `the main drag is ${weakest.display.toLowerCase()} (${weakest.value.toFixed(2)}).`
    )
  }
  parts.push(LAYER_UI[layer].action[tier.band])

  return { tier, text: parts.join(' ') }
}

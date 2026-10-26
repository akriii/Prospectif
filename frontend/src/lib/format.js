const integer = new Intl.NumberFormat('en-MY', { maximumFractionDigits: 0 })
const compact = new Intl.NumberFormat('en-MY', { notation: 'compact', maximumFractionDigits: 1 })

export const fmtInt = (n) => integer.format(n ?? 0)
export const fmtCompact = (n) => compact.format(n ?? 0)
export const fmtRm = (n) => `RM ${integer.format(n ?? 0)}`
export const fmtScore = (n) => (n ?? 0).toFixed(2)
export const fmtPct = (n) => `${Math.round((n ?? 0) * 100)}%`

// "Top 8%" / "Bottom 30%" for a 0-1 percentile rank
export function fmtRank(percentile) {
  if (percentile >= 0.5) return `Top ${Math.max(1, Math.round((1 - percentile) * 100))}%`
  return `Bottom ${Math.max(1, Math.round(percentile * 100))}%`
}

import { Crown, GraduationCap, ShoppingBag, House } from 'lucide-react'

// Presentation-only details per pillar. Titles, descriptions and formula weights
// come from the API (`meta` in /api/predict/{layer}) so they never drift from the maths.
export const LAYER_ORDER = ['apex', 'talent', 'retail', 'housing']

export const LAYER_UI = {
  apex: {
    icon: Crown,
    fallbackTitle: 'The Apex Score',
    legendHigh: 'Balanced, high-performing micro-city',
    legendLow: 'Weak fundamentals across the board',
    action: {
      high: 'Prioritise for flagship mixed-use or township development.',
      mid: 'Viable for phased development once a key weakness is addressed.',
      low: 'Fundamentals do not yet support large-scale investment here.',
    },
  },
  talent: {
    icon: GraduationCap,
    fallbackTitle: 'Talent Magnet',
    legendHigh: 'Educated, affordable workforce',
    legendLow: 'Thin talent pool or high wage cost',
    action: {
      high: 'Strong fit for shared-services centres, tech offices or R&D hubs hiring graduates.',
      mid: 'Consider satellite offices or training partnerships with local institutions.',
      low: 'Limited graduate supply; recruit regionally instead.',
    },
  },
  retail: {
    icon: ShoppingBag,
    fallbackTitle: 'Retail Vacuum',
    legendHigh: 'High spending power, few amenities',
    legendLow: 'Saturated or low-income market',
    action: {
      high: 'Strong fit for F&B, convenience retail or a neighbourhood mall serving local workers.',
      mid: 'Test demand with smaller-format or pop-up retail first.',
      low: 'Market is saturated or spending power is too low for new retail.',
    },
  },
  housing: {
    icon: House,
    fallbackTitle: 'Housing Gap',
    legendHigh: 'Job growth outpacing housing supply',
    legendLow: 'Oversupplied or weak demand',
    action: {
      high: 'Strong fit for mid-market residential or worker housing near employment.',
      mid: 'Moderate demand; favour smaller, phased residential launches.',
      low: 'Existing unsold stock or weak job growth; avoid new residential supply.',
    },
  },
}

// Anchor categories, in fixed categorical order (validated all-pairs, both modes)
export const CATEGORY_ORDER = ['lifestyle', 'education', 'industry']

export const CATEGORIES = {
  lifestyle: { label: 'Lifestyle', detail: 'Cafes & malls', light: '#2a78d6', dark: '#3987e5' },
  education: { label: 'Education', detail: 'Universities & colleges', light: '#eb6834', dark: '#d95926' },
  industry: { label: 'Industry', detail: 'Industrial zones', light: '#1baf7a', dark: '#199e70' },
}

// Diverging opportunity scale: 3 blue steps, neutral midpoint, 3 red steps.
// Light mode darkens toward the extremes; dark mode brightens so hotspots glow.
export const DIVERGING = {
  light: ['#184f95', '#2a78d6', '#86b6ef', '#e1e0d9', '#f1a9a0', '#e34948', '#a82a2c'],
  dark: ['#86b6ef', '#3987e5', '#1c5cab', '#383835', '#8f3434', '#e66767', '#f6b0a8'],
}

// Low-opportunity cells recede so the eye lands on the red end first
export const TIER_ALPHA = [150, 120, 95, 70, 160, 200, 235]

export const THEME = {
  light: {
    basemap: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    ink: [11, 11, 11],
    boundary: [82, 81, 78, 150],
    surface: [252, 252, 251],
  },
  dark: {
    basemap: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    ink: [240, 239, 236],
    boundary: [195, 194, 183, 110],
    surface: [26, 26, 25],
  },
}

export const HEX_RADIUS_M = 1500
// Past this zoom the abstract hexes fade and the real OSM anchors take over
export const PIN_ZOOM_START = 11
export const PIN_ZOOM_FULL = 12.5

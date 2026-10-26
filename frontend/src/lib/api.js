// Unset: the local Docker API in dev, same-origin `/api/...` in production
// (where the host routes /api to the backend). Set it only for a separate API domain.
const API_URL = (
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:8000' : '')
).replace(/\/$/, '')

async function getJson(path) {
  const res = await fetch(`${API_URL}${path}`)
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`
    try {
      detail = (await res.json()).detail || detail
    } catch {
      // non-JSON error body; keep the status line
    }
    throw new Error(detail)
  }
  return res.json()
}

export const fetchLayer = (layer) => getJson(`/api/predict/${layer}`)
export const fetchBoundaries = () => getJson('/api/districts/boundaries')

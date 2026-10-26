export function hexToRgb(hex, alpha) {
  const n = parseInt(hex.slice(1), 16)
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  return alpha === undefined ? rgb : [...rgb, alpha]
}

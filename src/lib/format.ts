import { parseUnits } from 'viem'

/**
 * Format a decimal string to a fixed number of places, rounding half up, with no
 * floating point. "1.2" at 2 places is "1.20", "0.000001" at 6 places stays exact, and
 * the whole part gets thousands separators: "650847.07" is "650,847.07".
 */
export function formatFixed(value: string, places: number): string {
  const scale = 10n ** BigInt(places)
  const raw = parseUnits(value, Math.max(places, 18))
  const unit = 10n ** BigInt(Math.max(places, 18) - places)
  const rounded = (raw + unit / 2n) / unit
  const whole = rounded / scale
  const frac = (rounded % scale).toString().padStart(places, '0')
  const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return places === 0 ? grouped : `${grouped}.${frac}`
}

/** Up to six places with trailing zeros dropped, never fewer than two: "0.002", "1.50". For small amounts that 2 places would show as zero. */
export function formatUsdcTight(value: string): string {
  const full = formatFixed(value, 6)
  const [whole, frac] = full.split('.')
  const trimmed = frac.replace(/0+$/, '').padEnd(2, '0')
  return `${whole}.${trimmed}`
}

export const formatUsdc = (value: string, places = 2) => formatFixed(value, places)

/** "199s", "12m", "2h 5m". Short form for table cells, in seconds up to ten minutes. */
export function formatDuration(seconds: number): string {
  if (seconds < 600) return `${seconds}s`
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return s === 0 ? `${m}m` : `${m}m ${s}s`
  }
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/** "199 seconds", "12 minutes", "3 hours". Long form for headlines. */
export function formatDurationWords(seconds: number): string {
  const unit = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
  if (seconds < 600) return unit(seconds, 'second')
  if (seconds < 7200) return unit(Math.round(seconds / 60), 'minute')
  return unit(Math.round(seconds / 3600), 'hour')
}

export const shortHash = (hash: string) =>
  hash.length > 14 ? `${hash.slice(0, 6)}…${hash.slice(-4)}` : hash

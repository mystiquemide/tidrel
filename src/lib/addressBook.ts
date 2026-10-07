const KEY = 'tidrel:counterparties'
const LIMIT = 50

/** Counterparties paid before, newest first. Kept in this browser only. */
export function savedCounterparties(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(raw) ? raw.filter((a): a is string => typeof a === 'string') : []
  } catch {
    return []
  }
}

export function rememberCounterparties(addresses: string[]): void {
  try {
    const seen = new Set<string>()
    const next = [...addresses, ...savedCounterparties()].filter((a) => {
      const k = a.toLowerCase()
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    localStorage.setItem(KEY, JSON.stringify(next.slice(0, LIMIT)))
  } catch {
    // Storage can be blocked. The list is a convenience, so a failure is silent.
  }
}

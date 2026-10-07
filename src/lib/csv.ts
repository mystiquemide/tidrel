import { isAddress } from 'viem'
import type { Settlement } from './history'

const HEADER = [
  'reference',
  'counterparties',
  'drawn_usdc',
  'open_seconds',
  'interest_usdc',
  'state',
  'draw_tx',
  'payout_tx',
  'repay_tx',
]

/** A cell is quoted when it holds a comma, a quote or a line break. A leading formula character is neutralised. */
function cell(value: string | number | null): string {
  let v = value === null ? '' : String(value)
  if (/^[=+\-@]/.test(v) && !/^-?\d+(\.\d+)?$/.test(v)) v = `'${v}`
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

export function settlementsToCsv(rows: Settlement[]): string {
  const lines = rows.map((s) =>
    [
      s.reference,
      s.legs,
      s.drawTxHash ? s.drawnUsdc : null,
      s.openSeconds,
      s.interestUsdc,
      s.state,
      s.drawTxHash,
      s.txHash,
      s.repayTxHash,
    ]
      .map(cell)
      .join(','),
  )
  return [HEADER.join(','), ...lines].join('\n') + '\n'
}

export type ParsedRecipients = {
  rows: { to: string; amount: string }[]
  errors: string[]
}

/**
 * Reads "address, amount" lines pasted from a spreadsheet. Commas, tabs, semicolons
 * and spaces all separate the two. A header line is skipped.
 */
export function parseRecipients(text: string): ParsedRecipients {
  const rows: ParsedRecipients['rows'] = []
  const errors: string[] = []
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .forEach((line, i) => {
      if (!line) return
      const [to, amount, ...rest] = line.split(/[\s,;]+/).filter(Boolean)
      if (i === 0 && to && !isAddress(to, { strict: false }) && !/^\d/.test(to)) return
      if (!to || !isAddress(to, { strict: false })) {
        errors.push(`Line ${i + 1}: the first value is not an address.`)
      } else if (!amount || !/^\d*\.?\d+$/.test(amount) || rest.length > 0) {
        errors.push(`Line ${i + 1}: expected an address and one amount.`)
      } else {
        rows.push({ to, amount })
      }
    })
  return { rows, errors }
}

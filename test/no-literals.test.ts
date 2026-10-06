import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * UI code must not carry a hardcoded amount, rate or duration. A figure with a
 * unit or a dollar sign in a string or JSX text is a number that did not come from
 * chain, so it fails here. Class names and SVG geometry are not figures.
 */
const UNIT = /(?<![\w.#-])\d[\d,]*(?:\.\d+)?\s?(?:USDC|cirBTC|BTC|%|s\b)/
const DOLLAR = /\$\s?\d/

function findHardcodedFigures(source: string): { line: number; text: string }[] {
  const hits: { line: number; text: string }[] = []
  source.split('\n').forEach((raw, i) => {
    const line = raw
      .replace(/^\s*(\/\/|\*|\/\*).*$/, '')
      .replace(/className=(?:"[^"]*"|\{`[^`]*`\}|\{"[^"]*"\})/g, '')
      .replace(/\b(?:viewBox|width|height|x|y|rx|d)="[^"]*"/g, '')
    if (UNIT.test(line) || DOLLAR.test(line)) hits.push({ line: i + 1, text: raw.trim() })
  })
  return hits
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

describe('findHardcodedFigures', () => {
  it('flags amounts, rates, durations and dollar values in copy', () => {
    expect(findHardcodedFigures('<p>Drawn 1.2 USDC</p>')).toHaveLength(1)
    expect(findHardcodedFigures('<p>Open for 199s</p>')).toHaveLength(1)
    expect(findHardcodedFigures('const rate = "1.4%"')).toHaveLength(1)
    expect(findHardcodedFigures('<p>Liquidation near $71,300</p>')).toHaveLength(1)
    expect(findHardcodedFigures('<p>0.00001957 cirBTC</p>')).toHaveLength(1)
  })

  it('ignores class names, svg geometry, comments and bound values', () => {
    expect(findHardcodedFigures('<div className="w-[120px] p-4 text-[96px]" />')).toEqual([])
    expect(findHardcodedFigures('<rect x="2" y="6.5" width="20" height="4" rx="2" />')).toEqual([])
    expect(findHardcodedFigures('// draws 1.2 USDC in the example')).toEqual([])
    expect(findHardcodedFigures('<p>{position.debtUsdc} USDC</p>')).toEqual([])
  })
})

describe('UI source has no hardcoded figures', () => {
  const files = [...walk('src/app'), ...walk('src/components')].filter((f) =>
    /\.tsx?$/.test(f),
  )

  it('scans at least the shell files', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it.each(files)('%s', (file) => {
    expect(findHardcodedFigures(readFileSync(file, 'utf8'))).toEqual([])
  })
})

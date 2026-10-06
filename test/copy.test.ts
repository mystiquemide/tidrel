import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const EM_DASH = String.fromCharCode(0x2014)

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

describe('copy rules', () => {
  const files = [...walk('src'), ...walk('scripts'), ...walk('test')].filter((f) =>
    /\.(tsx?|css|svg|md)$/.test(f),
  )

  it.each(files)('%s has no em dash', (file) => {
    expect(readFileSync(file, 'utf8').includes(EM_DASH)).toBe(false)
  })
})

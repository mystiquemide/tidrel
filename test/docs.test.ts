import { describe, expect, it } from 'vitest'
import { ADDRESSES } from '../src/lib/chain'
import { DOC_SECTIONS } from '../src/lib/docsContent'
import { PRIVACY, TERMS } from '../src/lib/legalContent'
import { MIN_HEALTH } from '../src/lib/settle'

describe('docs content', () => {
  it('gives every section a unique anchor and some content', () => {
    const ids = DOC_SECTIONS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const s of DOC_SECTIONS) {
      expect(s.id).toMatch(/^[a-z-]+$/)
      expect(s.title.length).toBeGreaterThan(0)
      expect(s.blocks.length).toBeGreaterThan(0)
    }
  })

  it('names the real contract addresses and the real health floor', () => {
    const text = JSON.stringify(DOC_SECTIONS)
    for (const a of Object.values(ADDRESSES)) expect(text).toContain(a)
    expect(text).toContain(MIN_HEALTH.toFixed(2))
  })

  it('keeps every internal link pointing at a real route', () => {
    const routes = new Set(['/desk', '/proof', '/safety', '/contracts', '/terms', '/privacy', '/docs'])
    for (const s of DOC_SECTIONS) {
      for (const b of s.blocks) {
        if (b.type !== 'links') continue
        for (const l of b.items) {
          if (l.href.startsWith('/view/') || !l.href.startsWith('/')) continue
          expect(routes.has(l.href)).toBe(true)
        }
      }
    }
  })
})

describe('legal content', () => {
  it.each([TERMS, PRIVACY])('$title has a date and sections', (doc) => {
    expect(doc.updated).toMatch(/\d{4}$/)
    expect(doc.sections.length).toBeGreaterThan(5)
  })

  it('does not claim analytics or accounts', () => {
    const text = JSON.stringify(PRIVACY).toLowerCase()
    expect(text).toContain('no analytics')
    expect(text).toContain('no user accounts')
  })
})

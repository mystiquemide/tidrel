import { describe, expect, it } from 'vitest'
import {
  formatDuration,
  formatDurationWords,
  formatFixed,
  formatUsdc,
  shortHash,
} from '../src/lib/format'

describe('formatFixed', () => {
  it('pads and keeps exact decimals', () => {
    expect(formatUsdc('1.2')).toBe('1.20')
    expect(formatUsdc('0.000001', 6)).toBe('0.000001')
    expect(formatUsdc('1.200001', 6)).toBe('1.200001')
    expect(formatUsdc('0', 6)).toBe('0.000000')
    expect(formatFixed('5', 0)).toBe('5')
  })

  it('rounds half up without float error', () => {
    expect(formatFixed('1.005', 2)).toBe('1.01')
    expect(formatFixed('1.004999', 2)).toBe('1.00')
    expect(formatFixed('0.9999995', 6)).toBe('1.000000')
    expect(formatFixed('2.675', 2)).toBe('2.68')
  })

  it('keeps large values exact', () => {
    expect(formatFixed('194067197.88092', 2)).toBe('194,067,197.88')
  })
})

describe('durations', () => {
  it('formats short', () => {
    expect(formatDuration(45)).toBe('45s')
    expect(formatDuration(199)).toBe('199s')
    expect(formatDuration(599)).toBe('599s')
    expect(formatDuration(600)).toBe('10m')
    expect(formatDuration(725)).toBe('12m 5s')
    expect(formatDuration(7500)).toBe('2h 5m')
    expect(formatDuration(3600)).toBe('1h')
  })

  it('formats for headlines', () => {
    expect(formatDurationWords(1)).toBe('1 second')
    expect(formatDurationWords(199)).toBe('199 seconds')
    expect(formatDurationWords(900)).toBe('15 minutes')
    expect(formatDurationWords(10_800)).toBe('3 hours')
  })
})

describe('shortHash', () => {
  it('keeps the ends of a hash', () => {
    expect(shortHash(`0x${'a'.repeat(60)}beef`)).toBe('0xaaaa…beef')
    expect(shortHash('0x12')).toBe('0x12')
  })
})

import { formatUsdcTight } from '../src/lib/format'

describe('formatUsdcTight', () => {
  it('keeps small amounts visible and large ones tidy', () => {
    expect(formatUsdcTight('0.002')).toBe('0.002')
    expect(formatUsdcTight('1.5')).toBe('1.50')
    expect(formatUsdcTight('1.200001')).toBe('1.200001')
    expect(formatUsdcTight('3')).toBe('3.00')
    expect(formatUsdcTight('0.0000004')).toBe('0.00')
  })
})

describe('thousands separators', () => {
  it('groups the whole part and leaves the decimals alone', () => {
    expect(formatFixed('650847.07', 2)).toBe('650,847.07')
    expect(formatFixed('1234567.891234', 6)).toBe('1,234,567.891234')
    expect(formatFixed('1000', 0)).toBe('1,000')
    expect(formatFixed('999.999', 2)).toBe('1,000.00')
  })
  it('leaves amounts under a thousand untouched', () => {
    expect(formatFixed('999.5', 2)).toBe('999.50')
    expect(formatFixed('0.00001966', 8)).toBe('0.00001966')
    expect(formatUsdcTight('12345.5')).toBe('12,345.50')
  })
})

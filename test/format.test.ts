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
    expect(formatFixed('194067197.88092', 2)).toBe('194067197.88')
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

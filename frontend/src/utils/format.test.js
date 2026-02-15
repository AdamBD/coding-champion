import { describe, it, expect } from 'vitest'

// Example utility function to test
export function formatXP(xp) {
  return xp.toLocaleString()
}

describe('formatXP', () => {
  it('should format small numbers without commas', () => {
    expect(formatXP(100)).toBe('100')
    expect(formatXP(999)).toBe('999')
  })

  it('should format large numbers with commas', () => {
    expect(formatXP(1000)).toBe('1,000')
    expect(formatXP(10000)).toBe('10,000')
    expect(formatXP(100000)).toBe('100,000')
  })

  it('should handle zero', () => {
    expect(formatXP(0)).toBe('0')
  })
})


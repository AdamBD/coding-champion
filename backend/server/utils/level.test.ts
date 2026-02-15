import { describe, it, expect } from 'vitest'
import { calculateLevel, xpForNextLevel, xpInCurrentLevel } from './level'

describe('Level Calculations', () => {
  describe('calculateLevel', () => {
    it('should return level 1 for 0 XP', () => {
      expect(calculateLevel(0)).toBe(1)
    })

    it('should return level 1 for 999 XP', () => {
      expect(calculateLevel(999)).toBe(1)
    })

    it('should return level 2 for 1000 XP', () => {
      expect(calculateLevel(1000)).toBe(2)
    })

    it('should return level 5 for 4000 XP', () => {
      expect(calculateLevel(4000)).toBe(5)
    })

    it('should return level 10 for 9000 XP', () => {
      expect(calculateLevel(9000)).toBe(10)
    })
  })

  describe('xpForNextLevel', () => {
    it('should return 1000 XP needed for level 1 to reach level 2', () => {
      expect(xpForNextLevel(1)).toBe(1000)
    })

    it('should return 5000 XP needed for level 5 to reach level 6', () => {
      expect(xpForNextLevel(5)).toBe(5000)
    })
  })

  describe('xpInCurrentLevel', () => {
    it('should return 0 XP for level 1 at 0 total XP', () => {
      expect(xpInCurrentLevel(0)).toBe(0)
    })

    it('should return 500 XP for level 1 at 500 total XP', () => {
      expect(xpInCurrentLevel(500)).toBe(500)
    })

    it('should return 0 XP for level 2 at 1000 total XP', () => {
      expect(xpInCurrentLevel(1000)).toBe(0)
    })

    it('should return 250 XP for level 2 at 1250 total XP', () => {
      expect(xpInCurrentLevel(1250)).toBe(250)
    })
  })
})


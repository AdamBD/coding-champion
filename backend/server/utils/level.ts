/**
 * Calculate level from total XP
 * Simple formula: every 1000 XP = 1 level
 * Level 1 starts at 0 XP
 */
export function calculateLevel(totalXp: number): number {
  return Math.floor(totalXp / 1000) + 1
}

/**
 * Calculate XP needed for next level
 */
export function xpForNextLevel(currentLevel: number): number {
  return currentLevel * 1000
}

/**
 * Calculate XP progress in current level
 */
export function xpInCurrentLevel(totalXp: number): number {
  const currentLevel = calculateLevel(totalXp)
  const xpAtCurrentLevel = (currentLevel - 1) * 1000
  return totalXp - xpAtCurrentLevel
}


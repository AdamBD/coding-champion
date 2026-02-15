import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('Migration: Add Quest Generation Fields', () => {
  const migrationPath = join(__dirname, '001_add_quest_generation_fields.sql')
  
  it('should have migration file with correct SQL syntax', () => {
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    
    // Verify migration contains all required field additions
    expect(migrationSQL).toContain('thumbnail_url')
    expect(migrationSQL).toContain('thumbnail_data')
    expect(migrationSQL).toContain('status')
    expect(migrationSQL).toContain('generated_at')
    
    // Verify idempotent checks are present
    expect(migrationSQL).toContain('IF NOT EXISTS')
    expect(migrationSQL).toContain('information_schema.columns')
    
    // Verify correct data types
    expect(migrationSQL).toContain('TEXT') // thumbnail_url
    expect(migrationSQL).toContain('BYTEA') // thumbnail_data
    expect(migrationSQL).toContain('VARCHAR(50)') // status
    expect(migrationSQL).toContain('TIMESTAMP') // generated_at
    
    // Verify default value for status
    expect(migrationSQL).toContain("DEFAULT 'completed'")
  })

  it('should have idempotent migration (safe to run multiple times)', () => {
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    
    // Each field addition should check if column exists first
    const thumbnailUrlChecks = (migrationSQL.match(/thumbnail_url/g) || []).length
    const thumbnailDataChecks = (migrationSQL.match(/thumbnail_data/g) || []).length
    const statusChecks = (migrationSQL.match(/status/g) || []).length
    const generatedAtChecks = (migrationSQL.match(/generated_at/g) || []).length
    
    // Each field should appear at least twice: once in check, once in ALTER TABLE
    expect(thumbnailUrlChecks).toBeGreaterThanOrEqual(2)
    expect(thumbnailDataChecks).toBeGreaterThanOrEqual(2)
    expect(statusChecks).toBeGreaterThanOrEqual(2)
    expect(generatedAtChecks).toBeGreaterThanOrEqual(2)
  })
})


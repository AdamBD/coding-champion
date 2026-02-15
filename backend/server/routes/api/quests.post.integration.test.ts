import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getDb } from '../../utils/db'

/**
 * Integration test - requires real database connection
 * These tests validate actual database operations
 * 
 * To run: Ensure PostgreSQL is running and coding_champion database exists
 * Skip these in CI if database is not available
 */
describe('Quest Creation - Database Integration Tests', () => {
  let db: any

  beforeAll(async () => {
    try {
      db = await getDb()
      // Verify we can connect
      await db.query('SELECT 1')
    } catch (error) {
      console.warn('Database not available, skipping integration tests')
      // Skip all tests if DB not available
      return
    }
  })

  afterAll(async () => {
    if (db) {
      // Cleanup test data
      await db.query("DELETE FROM quests WHERE name LIKE 'Test%' OR name LIKE 'Integration%'")
      await db.end?.()
    }
  })

  it('should insert quest with all new fields into real database', async () => {
    if (!db) {
      console.log('Skipping: Database not available')
      return
    }

    const questData = {
      name: 'Integration Test Quest',
      description: 'Test description for integration',
      total_xp_reward: 5000,
      link: 'https://example.com/course',
      thumbnail_url: 'https://example.com/thumb.jpg',
      status: 'processing',
      generated_at: new Date(),
    }

    const result = await db.query(`
      INSERT INTO quests (name, description, total_xp_reward, link, thumbnail_url, status, generated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, description, total_xp_reward, link, thumbnail_url, status, generated_at
    `, [
      questData.name,
      questData.description,
      questData.total_xp_reward,
      questData.link,
      questData.thumbnail_url,
      questData.status,
      questData.generated_at,
    ])

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].name).toBe(questData.name)
    expect(result.rows[0].link).toBe(questData.link)
    expect(result.rows[0].thumbnail_url).toBe(questData.thumbnail_url)
    expect(result.rows[0].status).toBe(questData.status)
    expect(result.rows[0].generated_at).toBeDefined()

    // Cleanup
    await db.query('DELETE FROM quests WHERE id = $1', [result.rows[0].id])
  })

  it('should insert quest with thumbnail_data (binary) into real database', async () => {
    if (!db) {
      console.log('Skipping: Database not available')
      return
    }

    const imageBuffer = Buffer.from('fake-image-binary-data-for-testing')
    
    const result = await db.query(`
      INSERT INTO quests (name, description, total_xp_reward, thumbnail_data, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, thumbnail_data, status
    `, [
      'Integration Binary Quest',
      'Test binary storage',
      3000,
      imageBuffer,
      'completed',
    ])

    expect(result.rows[0].thumbnail_data).toBeDefined()
    expect(Buffer.isBuffer(result.rows[0].thumbnail_data)).toBe(true)
    expect(result.rows[0].thumbnail_data.toString()).toBe('fake-image-binary-data-for-testing')

    // Cleanup
    await db.query('DELETE FROM quests WHERE id = $1', [result.rows[0].id])
  })

  it('should use default status value when not provided', async () => {
    if (!db) {
      console.log('Skipping: Database not available')
      return
    }

    const result = await db.query(`
      INSERT INTO quests (name, total_xp_reward)
      VALUES ($1, $2)
      RETURNING id, name, status
    `, ['Integration Default Status', 1000])

    expect(result.rows[0].status).toBe('completed') // Should use default

    // Cleanup
    await db.query('DELETE FROM quests WHERE id = $1', [result.rows[0].id])
  })

  it('should allow all status values', async () => {
    if (!db) {
      console.log('Skipping: Database not available')
      return
    }

    const statuses = ['pending', 'processing', 'completed', 'failed']
    const insertedIds: number[] = []

    for (const status of statuses) {
      const result = await db.query(`
        INSERT INTO quests (name, total_xp_reward, status)
        VALUES ($1, $2, $3)
        RETURNING id, status
      `, [`Integration Status ${status}`, 1000, status])

      expect(result.rows[0].status).toBe(status)
      insertedIds.push(result.rows[0].id)
    }

    // Cleanup
    for (const id of insertedIds) {
      await db.query('DELETE FROM quests WHERE id = $1', [id])
    }
  })
})


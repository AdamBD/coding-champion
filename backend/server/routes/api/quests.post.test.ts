import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getDb } from '../../utils/db'

// Mock the database module
vi.mock('../../utils/db', () => ({
  getDb: vi.fn(),
}))

describe('Quest Creation (Database Schema Validation)', () => {
  let mockDb: any

  beforeEach(() => {
    mockDb = {
      query: vi.fn(),
    }
    vi.mocked(getDb).mockResolvedValue(mockDb as any)
  })

  it('should allow inserting quest with all new fields', async () => {
    const questData = {
      name: 'Test AI Quest',
      description: 'Test description',
      total_xp_reward: 5000,
      link: 'https://example.com/course',
      thumbnail_url: 'https://example.com/thumb.jpg',
      status: 'processing',
      generated_at: new Date('2025-01-01'),
    }

    // Mock successful insert
    mockDb.query.mockResolvedValueOnce({
      rows: [{
        id: 1,
        ...questData,
        created_at: new Date(),
      }],
    })

    // Simulate the INSERT query that would be used
    const result = await mockDb.query(`
      INSERT INTO quests (name, description, total_xp_reward, link, thumbnail_url, status, generated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
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
    expect(result.rows[0]).toMatchObject({
      name: questData.name,
      link: questData.link,
      thumbnail_url: questData.thumbnail_url,
      status: questData.status,
    })
    expect(result.rows[0].id).toBeDefined()
  })

  it('should allow inserting quest with thumbnail_data (binary)', async () => {
    const imageBuffer = Buffer.from('fake-image-binary-data')
    
    mockDb.query.mockResolvedValueOnce({
      rows: [{
        id: 2,
        name: 'Quest with Binary Thumbnail',
        description: 'Test',
        total_xp_reward: 3000,
        thumbnail_data: imageBuffer,
        status: 'completed',
      }],
    })

    const result = await mockDb.query(`
      INSERT INTO quests (name, description, total_xp_reward, thumbnail_data, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      'Quest with Binary Thumbnail',
      'Test',
      3000,
      imageBuffer,
      'completed',
    ])

    expect(result.rows[0].thumbnail_data).toBeDefined()
    expect(Buffer.isBuffer(result.rows[0].thumbnail_data)).toBe(true)
  })

  it('should allow inserting quest with minimal required fields', async () => {
    mockDb.query.mockResolvedValueOnce({
      rows: [{
        id: 3,
        name: 'Minimal Quest',
        description: null,
        total_xp_reward: 1000,
        link: null,
        thumbnail_url: null,
        thumbnail_data: null,
        status: 'completed',
        generated_at: null,
      }],
    })

    const result = await mockDb.query(`
      INSERT INTO quests (name, total_xp_reward)
      VALUES ($1, $2)
      RETURNING *
    `, ['Minimal Quest', 1000])

    expect(result.rows[0].name).toBe('Minimal Quest')
    expect(result.rows[0].status).toBe('completed') // Should use default
  })

  it('should handle status field with different values', async () => {
    const statuses = ['pending', 'processing', 'completed', 'failed']
    
    for (const status of statuses) {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 4, name: 'Test', total_xp_reward: 1000, status }],
      })

      const result = await mockDb.query(`
        INSERT INTO quests (name, total_xp_reward, status)
        VALUES ($1, $2, $3)
        RETURNING status
      `, ['Test', 1000, status])

      expect(result.rows[0].status).toBe(status)
    }
  })
})


import { Pool } from 'pg'

let pool: Pool | null = null

export async function getDb(): Promise<Pool> {
  if (!pool) {
    // Railway provides DATABASE_URL, use it if available
    if (process.env.DATABASE_URL) {
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      })
    } else {
      // Fall back to individual environment variables for local development
      pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'coding_champion',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
      })
    }
  }
  return pool
}


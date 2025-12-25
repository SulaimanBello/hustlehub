import { Pool, PoolClient, QueryResult } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Database connection pool configuration
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  min: parseInt(process.env.DATABASE_POOL_MIN || '2'),
  max: parseInt(process.env.DATABASE_POOL_MAX || '10'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Create the connection pool
const pool = new Pool(poolConfig);

// Log connection events
pool.on('connect', () => {
  console.log('📦 Database connection established');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

// Query helper function with logging
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;

    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Query executed', {
        text: text.substring(0, 100),
        duration: `${duration}ms`,
        rows: result.rowCount,
      });
    }

    return result;
  } catch (error) {
    console.error('❌ Database query error:', error);
    throw error;
  }
}

// Transaction helper
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW() as now');
    console.log('✅ Database connected successfully at', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function closePool(): Promise<void> {
  await pool.end();
  console.log('👋 Database pool closed');
}

export default pool;

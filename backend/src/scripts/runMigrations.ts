import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const execAsync = promisify(exec);

async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');

    const migrationsPath = path.join(__dirname, '../../migrations');

    // Run all SQL migrations in order
    const migrations = [
      '001_enable_extensions.sql',
      '002_create_users_table.sql',
      '003_create_otp_table.sql',
      '004_create_tasks_table.sql',
      '005_create_wallets_table.sql',
      '006_create_transactions_table.sql',
      '007_create_chat_messages_table.sql',
    ];

    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });

    await client.connect();

    for (const migration of migrations) {
      console.log(`  Running ${migration}...`);
      const fs = require('fs');
      const sql = fs.readFileSync(
        path.join(migrationsPath, migration),
        'utf-8'
      );
      await client.query(sql);
      console.log(`  ✅ ${migration} completed`);
    }

    await client.end();

    console.log('✅ All migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();

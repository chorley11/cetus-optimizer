import { DatabaseService } from '../src/services/database';
import { Logger } from '../src/utils/logger';

/**
 * Initialize the database schema
 * Run with: npm run db:init
 */
async function initDatabase() {
  try {
    Logger.info('Initializing database...');
    const db = new DatabaseService();
    
    // Database is automatically initialized in constructor
    Logger.info('Database initialized successfully');
    
    db.close();
    process.exit(0);
  } catch (error) {
    Logger.error('Failed to initialize database', error);
    process.exit(1);
  }
}

initDatabase();


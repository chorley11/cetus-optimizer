import Database from 'better-sqlite3';
import { join } from 'path';
import { Position, Rebalance, SkimWalletStatus } from '../types';
import { Logger } from '../utils/logger';

const DB_PATH = process.env.DB_PATH || join(process.cwd(), 'data', 'optimizer.db');

export class DatabaseService {
  private db: Database.Database;

  constructor() {
    // Ensure data directory exists
    const { mkdirSync } = require('fs');
    const { dirname } = require('path');
    try {
      mkdirSync(dirname(DB_PATH), { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');
    this.initializeSchema();
  }

  private initializeSchema(): void {
    // Positions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS positions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pool_address TEXT NOT NULL,
        position_id TEXT UNIQUE,
        tick_lower INTEGER NOT NULL,
        tick_upper INTEGER NOT NULL,
        price_lower REAL NOT NULL,
        price_upper REAL NOT NULL,
        liquidity TEXT NOT NULL,
        amount_a TEXT NOT NULL,
        amount_b TEXT NOT NULL,
        entry_price REAL NOT NULL,
        entry_value_usd REAL NOT NULL,
        status TEXT DEFAULT 'active',
        opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        closed_at DATETIME,
        close_reason TEXT
      )
    `);

    // Rebalances table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS rebalances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pool_address TEXT NOT NULL,
        old_position_id INTEGER REFERENCES positions(id),
        new_position_id INTEGER REFERENCES positions(id),
        trigger_price REAL NOT NULL,
        trigger_reason TEXT NOT NULL,
        old_range_lower REAL NOT NULL,
        old_range_upper REAL NOT NULL,
        new_range_lower REAL NOT NULL,
        new_range_upper REAL NOT NULL,
        fees_collected_a TEXT,
        fees_collected_b TEXT,
        fees_collected_usd REAL,
        skim_amount_usdc REAL DEFAULT 0,
        skim_amount_sui REAL DEFAULT 0,
        gas_used TEXT,
        tx_digest TEXT,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Price snapshots
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS price_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pool_address TEXT NOT NULL,
        price REAL NOT NULL,
        in_range BOOLEAN NOT NULL,
        distance_to_lower REAL,
        distance_to_upper REAL,
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Skim ledger
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS skim_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pool_address TEXT NOT NULL,
        rebalance_id INTEGER REFERENCES rebalances(id),
        usdc_amount REAL NOT NULL,
        sui_amount REAL NOT NULL,
        tx_digest TEXT,
        transferred_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Skim wallet balance
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS skim_wallet_balance (
        id INTEGER PRIMARY KEY DEFAULT 1,
        usdc_balance REAL DEFAULT 0,
        sui_balance REAL DEFAULT 0,
        last_deposit_alert DATETIME,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Bluefin deposits
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS bluefin_deposits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset TEXT NOT NULL,
        amount REAL NOT NULL,
        tx_digest TEXT,
        deposited_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Daily summaries
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS daily_summaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date DATE UNIQUE NOT NULL,
        total_fees_usd REAL DEFAULT 0,
        total_rebalances INTEGER DEFAULT 0,
        total_gas_usd REAL DEFAULT 0,
        total_skim_usdc REAL DEFAULT 0,
        total_skim_sui REAL DEFAULT 0,
        avg_time_in_range REAL,
        net_pnl_usd REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_positions_pool ON positions(pool_address);
      CREATE INDEX IF NOT EXISTS idx_positions_status ON positions(status);
      CREATE INDEX IF NOT EXISTS idx_rebalances_pool ON rebalances(pool_address);
      CREATE INDEX IF NOT EXISTS idx_rebalances_date ON rebalances(executed_at);
      CREATE INDEX IF NOT EXISTS idx_price_snapshots_pool_date ON price_snapshots(pool_address, recorded_at);
    `);

    // Initialize skim wallet balance if not exists
    this.db.exec(`
      INSERT OR IGNORE INTO skim_wallet_balance (id, usdc_balance, sui_balance)
      VALUES (1, 0, 0)
    `);

    Logger.info('Database initialized', { path: DB_PATH });
  }

  // Position methods
  createPosition(position: Omit<Position, 'id' | 'openedAt'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO positions (
        pool_address, position_id, tick_lower, tick_upper,
        price_lower, price_upper, liquidity, amount_a, amount_b,
        entry_price, entry_value_usd, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      position.poolAddress,
      position.positionId,
      position.tickLower,
      position.tickUpper,
      position.priceLower,
      position.priceUpper,
      position.liquidity,
      position.amountA,
      position.amountB,
      position.entryPrice,
      position.entryValueUsd,
      position.status
    );

    return result.lastInsertRowid as number;
  }

  getActivePosition(poolAddress: string): Position | null {
    const stmt = this.db.prepare(`
      SELECT * FROM positions
      WHERE pool_address = ? AND status = 'active'
      ORDER BY opened_at DESC
      LIMIT 1
    `);

    const row = stmt.get(poolAddress) as any;
    if (!row) return null;

    return this.mapRowToPosition(row);
  }

  closePosition(positionId: number, reason: 'rebalance' | 'manual' | 'emergency'): void {
    const stmt = this.db.prepare(`
      UPDATE positions
      SET status = 'closed', closed_at = CURRENT_TIMESTAMP, close_reason = ?
      WHERE id = ?
    `);
    stmt.run(reason, positionId);
  }

  // Rebalance methods
  createRebalance(rebalance: Omit<Rebalance, 'id' | 'executedAt'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO rebalances (
        pool_address, old_position_id, new_position_id,
        trigger_price, trigger_reason,
        old_range_lower, old_range_upper,
        new_range_lower, new_range_upper,
        fees_collected_a, fees_collected_b, fees_collected_usd,
        skim_amount_usdc, skim_amount_sui,
        gas_used, tx_digest
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      rebalance.poolAddress,
      rebalance.oldPositionId,
      rebalance.newPositionId,
      rebalance.triggerPrice,
      rebalance.triggerReason,
      rebalance.oldRange.lower,
      rebalance.oldRange.upper,
      rebalance.newRange.lower,
      rebalance.newRange.upper,
      rebalance.feesCollected.tokenA,
      rebalance.feesCollected.tokenB,
      rebalance.feesCollected.usd,
      rebalance.skimAmount.usdc,
      rebalance.skimAmount.sui,
      rebalance.gasUsed,
      rebalance.txDigest
    );

    return result.lastInsertRowid as number;
  }

  // Price snapshot methods
  recordPriceSnapshot(
    poolAddress: string,
    price: number,
    inRange: boolean,
    distanceToLower: number,
    distanceToUpper: number
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO price_snapshots (
        pool_address, price, in_range, distance_to_lower, distance_to_upper
      ) VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(poolAddress, price, inRange ? 1 : 0, distanceToLower, distanceToUpper);
  }

  // Skim methods
  recordSkim(
    poolAddress: string,
    rebalanceId: number,
    usdcAmount: number,
    suiAmount: number,
    txDigest?: string
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO skim_ledger (
        pool_address, rebalance_id, usdc_amount, sui_amount, tx_digest
      ) VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(poolAddress, rebalanceId, usdcAmount, suiAmount, txDigest || null);

    // Update skim wallet balance
    this.updateSkimWalletBalance(usdcAmount, suiAmount);
  }

  getSkimWalletStatus(thresholds: { usdc: number; sui: number }): SkimWalletStatus {
    const stmt = this.db.prepare(`
      SELECT usdc_balance, sui_balance, last_deposit_alert
      FROM skim_wallet_balance
      WHERE id = 1
    `);
    const row = stmt.get() as any;

    const usdcBalance = row?.usdc_balance || 0;
    const suiBalance = row?.sui_balance || 0;

    return {
      usdcBalance,
      suiBalance,
      usdcThreshold: thresholds.usdc,
      suiThreshold: thresholds.sui,
      readyForDeposit: usdcBalance >= thresholds.usdc || suiBalance >= thresholds.sui,
      lastAlertSent: row?.last_deposit_alert ? new Date(row.last_deposit_alert) : undefined,
    };
  }

  updateSkimWalletBalance(usdcDelta: number, suiDelta: number): void {
    const stmt = this.db.prepare(`
      UPDATE skim_wallet_balance
      SET usdc_balance = usdc_balance + ?,
          sui_balance = sui_balance + ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `);
    stmt.run(usdcDelta, suiDelta);
  }

  markDepositAlertSent(): void {
    const stmt = this.db.prepare(`
      UPDATE skim_wallet_balance
      SET last_deposit_alert = CURRENT_TIMESTAMP
      WHERE id = 1
    `);
    stmt.run();
  }

  // Helper method to map database row to Position
  private mapRowToPosition(row: any): Position {
    return {
      id: row.id,
      poolAddress: row.pool_address,
      positionId: row.position_id,
      tickLower: row.tick_lower,
      tickUpper: row.tick_upper,
      priceLower: row.price_lower,
      priceUpper: row.price_upper,
      liquidity: row.liquidity,
      amountA: row.amount_a,
      amountB: row.amount_b,
      entryPrice: row.entry_price,
      entryValueUsd: row.entry_value_usd,
      status: row.status,
      openedAt: new Date(row.opened_at),
      closedAt: row.closed_at ? new Date(row.closed_at) : undefined,
      closeReason: row.close_reason,
    };
  }

  close(): void {
    this.db.close();
  }
}


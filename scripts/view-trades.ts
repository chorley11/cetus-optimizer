import 'dotenv/config';
import Database from 'better-sqlite3';
import { join } from 'path';
import { Logger } from '../src/utils/logger';

/**
 * View trades/rebalances from the database
 * Usage: ts-node scripts/view-trades.ts [options]
 * Options:
 *   --pool <address>  Filter by pool address
 *   --limit <number>   Limit number of results (default: 20)
 *   --today            Show only today's trades
 */

interface TradeView {
  id: number;
  poolAddress: string;
  triggerPrice: number;
  triggerReason: string;
  feesCollected: number;
  skimAmount: { usdc: number; sui: number };
  gasUsed: string;
  txDigest: string;
  executedAt: Date;
  oldRange: { lower: number; upper: number };
  newRange: { lower: number; upper: number };
}

async function viewTrades() {
  const DB_PATH = process.env.DB_PATH || join(process.cwd(), 'data', 'optimizer.db');
  const db = new Database(DB_PATH);
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const poolFilter = args.includes('--pool') ? args[args.indexOf('--pool') + 1] : null;
  const limit = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : 20;
  const todayOnly = args.includes('--today');

  try {
    // Build query
    let query = `
      SELECT 
    WHEN r.pool_address = '0x5cf7e2ec9311d9057e43477a29bd457c51beeb1ddcd151c385a295dbb3c0fb18' THEN 'SUI/USDC'
 WHEN r.pool_address = '0xe01243f37f712ef87e556afb9b1d03d0fae13f96d324ec912daffc339dfdcbd2' THEN 'DEEP/SUI'
 WHEN r.pool_address = '0x51e883ba7c0b566a26cbc8a94cd33eb0abd418a77cc1e60ad22fd9b1f29cd2ab' THEN 'WAL/SUI'
 ELSE r.pool_address
END as pool_name,
        r.*,
        p_old.price_lower as old_lower,
        p_old.price_upper as old_upper,
        p_new.price_lower as new_lower,
        p_new.price_upper as new_upper
      FROM rebalances r }
    `;

    const params: any[] = [];
    
    if (poolFilter) {
      query += ` WHERE r.pool_address = ?`;
      params.push(poolFilter);
    }
    
    if (todayOnly) {
      query += poolFilter ? ` AND DATE(r.executed_at) = DATE('now')` : ` WHERE DATE(r.executed_at) = DATE('now')`;
    }
    
    query += ` ORDER BY r.executed_at DESC LIMIT ?`;
    params.push(limit);

    const stmt = db.prepare(query);
    const rows = stmt.all(...params) as any[];

    if (rows.length === 0) {
      console.log('No trades found.');
      return;
    }

    console.log('\n📊 TRADE HISTORY\n');
    console.log('='.repeat(80));
    
    rows.forEach((row, index) => {
      console.log(`\nTrade #${index + 1}`);
      console.log(`Pool: ${row.pool_name || row.pool_address.slice(0, 16)}...`);
      console.log(`Time: ${new Date(row.executed_at).toLocaleString()}`);
      console.log(`Trigger: ${row.trigger_reason} at $${parseFloat(row.trigger_price).toFixed(4)}`);
      console.log(`\nRange Change:`);
      console.log(`  Old: $${parseFloat(row.old_lower).toFixed(4)} - $${parseFloat(row.old_upper).toFixed(4)}`);
      console.log(`  New: $${parseFloat(row.new_lower).toFixed(4)} - $${parseFloat(row.new_upper).toFixed(4)}`);
      console.log(`\nFees Collected: $${parseFloat(row.fees_collected_usd || 0).toFixed(2)}`);
      console.log(`Skim: $${parseFloat(row.skim_amount_usdc || 0).toFixed(2)} USDC, ${parseFloat(row.skim_amount_sui || 0).toFixed(4)} SUI`);
      console.log(`Gas: ${row.gas_used} SUI`);
      console.log(`TX: https://suiscan.xyz/mainnet/tx/${row.tx_digest}`);
      console.log('-'.repeat(80));
    });

    // Summary
    const totalFees = rows.reduce((sum, r) => sum + parseFloat(r.fees_collected_usd || 0), 0);
    const totalSkimUsdc = rows.reduce((sum, r) => sum + parseFloat(r.skim_amount_usdc || 0), 0);
    const totalSkimSui = rows.reduce((sum, r) => sum + parseFloat(r.skim_amount_sui || 0), 0);
    
    console.log(`\n📈 SUMMARY`);
    console.log(`Total Trades: ${rows.length}`);
    console.log(`Total Fees: $${totalFees.toFixed(2)}`);
    console.log(`Total Skim: $${totalSkimUsdc.toFixed(2)} USDC, ${totalSkimSui.toFixed(4)} SUI`);
    
  } catch (error) {
    Logger.error('Failed to view trades', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

viewTrades();


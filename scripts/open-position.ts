import 'dotenv/config';
import { SuiClient } from '@mysten/sui/client';
import { SuiService } from '../src/services/sui';
import { CetusService } from '../src/services/cetus';
import { DatabaseService } from '../src/services/database';
import { StrategyEngine } from '../src/core/strategyEngine';
import { PositionManager } from '../src/core/positionManager';
import { POOL_CONFIGS } from '../src/config/pools';
import { PriceMonitor } from '../src/core/priceMonitor';

/**
 * Manual script to open a position for a specific pool
 * Usage: ts-node scripts/open-position.ts [POOL_NAME]
 * Example: ts-node scripts/open-position.ts SUI/USDC
 */

async function main() {
  const poolName = process.argv[2];
  
  if (!poolName) {
    console.error('Usage: ts-node scripts/open-position.ts [POOL_NAME]');
    console.error('Example: ts-node scripts/open-position.ts SUI/USDC');
    console.error('\nAvailable pools:');
    POOL_CONFIGS.forEach(pool => {
      console.error(`  - ${pool.name}`);
    });
    process.exit(1);
  }

  const pool = POOL_CONFIGS.find(p => p.name === poolName);
  
  if (!pool) {
    console.error(`Pool "${poolName}" not found`);
    console.error('\nAvailable pools:');
    POOL_CONFIGS.forEach(p => {
      console.error(`  - ${p.name}`);
    });
    process.exit(1);
  }

  if (!pool.enabled) {
    console.error(`Pool "${poolName}" is disabled`);
    process.exit(1);
  }

  console.log(`🚀 Opening position for ${pool.name}...\n`);

  try {
    // Initialize services
    const rpcUrl = process.env.SUI_RPC_URL || 'https://fullnode.mainnet.sui.io';
    const client = new SuiClient({ url: rpcUrl });
    const suiService = new SuiService(client);
    const cetusService = new CetusService(client, process.env.SUI_NETWORK || 'mainnet');
    const db = new DatabaseService();
    const strategyEngine = new StrategyEngine();
    const positionManager = new PositionManager(cetusService, suiService, db, strategyEngine);
    const priceMonitor = new PriceMonitor(cetusService, db);

    // Check if position already exists
    const existingPosition = db.getActivePosition(pool.address);
    if (existingPosition) {
      console.log(`⚠️  Active position already exists for ${pool.name}`);
      console.log(`   Position ID: ${existingPosition.positionId}`);
      console.log(`   Range: $${existingPosition.priceLower.toFixed(4)} - $${existingPosition.priceUpper.toFixed(4)}`);
      console.log(`\n   To open a new position, close the existing one first.`);
      process.exit(1);
    }

    // Get current price
    console.log('📊 Fetching current price...');
    const snapshot = await priceMonitor.getPriceSnapshot(pool.address);
    const currentPrice = snapshot.price;
    
    console.log(`   Current price: $${currentPrice.toFixed(4)}`);

    // Calculate price range
    const priceLower = currentPrice * (pool.rangeLowerBps / 100);
    const priceUpper = currentPrice * (pool.rangeUpperBps / 100);
    
    console.log(`\n💰 Position Configuration:`);
    console.log(`   Size: $${pool.positionSizeUsd}`);
    console.log(`   Range: $${priceLower.toFixed(4)} - $${priceUpper.toFixed(4)}`);
    console.log(`   Mode: ${pool.rangeMode}`);
    console.log(`   Fee Tier: ${pool.feeTier / 10000}%`);

    // Confirm
    console.log(`\n⚠️  This will open a position on-chain.`);
    console.log(`   Make sure your wallet has sufficient balance.`);
    console.log(`   Press Ctrl+C to cancel, or wait 5 seconds to continue...`);
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Open position
    console.log(`\n🔨 Opening position...`);
    const positionId = await positionManager.openPosition(
      pool,
      priceLower,
      priceUpper,
      currentPrice
    );

    console.log(`\n✅ Position opened successfully!`);
    console.log(`   Position ID: ${positionId}`);
    console.log(`   Pool: ${pool.name}`);
    console.log(`   Range: $${priceLower.toFixed(4)} - $${priceUpper.toFixed(4)}`);
    console.log(`\n   Monitor via Telegram: /status`);
    console.log(`   View trades: npm run trades`);

  } catch (error) {
    console.error(`\n❌ Failed to open position:`, error);
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    }
    process.exit(1);
  }
}

main().catch(console.error);


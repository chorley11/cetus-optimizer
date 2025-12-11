import 'dotenv/config';
import { SuiClient } from '@mysten/sui/client';
import { CetusService } from '../src/services/cetus';
import { POOL_CONFIGS } from '../src/config';
import { Logger } from '../src/utils/logger';

async function checkPrices() {
  Logger.info('Starting price check for all pools...');

  // Initialize services
  const rpcUrl = process.env.SUI_RPC_URL || 'https://fullnode.mainnet.sui.io';
  const suiClient = new SuiClient({ url: rpcUrl });
  const cetusService = new CetusService(
    suiClient,
    (process.env.SUI_NETWORK as 'mainnet' | 'testnet') || 'mainnet'
  );

  console.log('\n=== POOL PRICE CHECK ===\n');

  for (const pool of POOL_CONFIGS) {
    if (!pool.enabled) {
      console.log(`⏭️  ${pool.name}: DISABLED (skipping)`);
      continue;
    }

    if (!pool.address || pool.address.trim() === '' || pool.address === '0x') {
      console.log(`❌ ${pool.name}: NO ADDRESS CONFIGURED`);
      console.log(`   Set POOL_${pool.name.replace('/', '_').toUpperCase()} environment variable`);
      continue;
    }

    try {
      console.log(`🔍 Checking ${pool.name}...`);
      console.log(`   Address: ${pool.address}`);

      const poolInfo = await cetusService.getPoolInfo(pool.address);

      console.log(`✅ ${pool.name}: SUCCESS`);
      console.log(`   Current Price: $${poolInfo.currentPrice.toFixed(6)}`);
      console.log(`   Sqrt Price: ${poolInfo.currentSqrtPrice}`);
      console.log(`   Tick Spacing: ${poolInfo.tickSpacing}`);
      console.log(`   Fee Tier: ${poolInfo.feeTier} bps (${poolInfo.feeTier / 10000}%)`);
      console.log('');

    } catch (error: any) {
      console.log(`❌ ${pool.name}: FAILED`);
      console.log(`   Error: ${error.message || String(error)}`);
      if (error.stack) {
        console.log(`   Stack: ${error.stack.split('\n')[0]}`);
      }
      console.log('');
    }
  }

  console.log('=== PRICE CHECK COMPLETE ===\n');
  process.exit(0);
}

checkPrices().catch(error => {
  Logger.error('Price check failed', error);
  process.exit(1);
});


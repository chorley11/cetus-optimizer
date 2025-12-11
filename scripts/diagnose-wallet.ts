import 'dotenv/config';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiService } from '../src/services/sui';
import { CetusService } from '../src/services/cetus';
import { POOL_CONFIGS } from '../src/config/pools';

/**
 * Diagnostic script to check wallet and pool connectivity
 * Usage: ts-node scripts/diagnose-wallet.ts
 */

async function main() {
  console.log('🔍 Diagnosing Wallet and Pool Connectivity...\n');

  // Check environment variables
  const privateKey = process.env.MAIN_WALLET_PRIVATE_KEY;
  if (!privateKey) {
    console.error('❌ MAIN_WALLET_PRIVATE_KEY not set');
    process.exit(1);
  }

  console.log('✅ Environment variables loaded\n');

  // Initialize services
  const rpcUrl = process.env.SUI_RPC_URL || 'https://fullnode.mainnet.sui.io';
  const client = new SuiClient({ url: rpcUrl });
  const suiService = new SuiService();
  const network = (process.env.SUI_NETWORK as 'mainnet' | 'testnet') || 'mainnet';
  const cetusService = new CetusService(client, network);

  try {
    // 1. Check wallet initialization
    console.log('1️⃣ Checking wallet initialization...');
    try {
      suiService.initializeWallet(privateKey);
      const address = suiService.getAddress();
      console.log(`   ✅ Wallet initialized`);
      console.log(`   📍 Address: ${address}\n`);
    } catch (error) {
      console.error(`   ❌ Failed to initialize wallet:`, error);
      if (error instanceof Error) {
        console.error(`   Error: ${error.message}`);
        if (error.message.includes('Invalid')) {
          console.error(`   ⚠️  Private key format may be incorrect`);
          console.error(`   Expected format: suiprivkey1... (64+ characters)`);
        }
      }
      process.exit(1);
    }

    // 2. Check wallet balance
    console.log('2️⃣ Checking wallet balance...');
    try {
      const address = suiService.getAddress();
      const balance = await suiService.getSuiBalance(address);
      console.log(`   ✅ Balance: ${balance.toFixed(4)} SUI`);
      
      if (balance < 0.1) {
        console.log(`   ⚠️  WARNING: Low balance! You need at least 0.1 SUI for gas`);
        console.log(`   ⚠️  Recommended: 1-5 SUI for operations`);
      } else if (balance < 1) {
        console.log(`   ⚠️  Balance is low. Consider adding more SUI for gas`);
      } else {
        console.log(`   ✅ Balance sufficient for operations`);
      }
      console.log();
    } catch (error) {
      console.error(`   ❌ Failed to get balance:`, error);
      if (error instanceof Error) {
        console.error(`   Error: ${error.message}`);
      }
    }

    // 3. Check RPC connection
    console.log('3️⃣ Checking RPC connection...');
    try {
      const chainId = await client.getChainIdentifier();
      console.log(`   ✅ Connected to Sui network`);
      console.log(`   🔗 Chain ID: ${chainId}`);
      console.log(`   🌐 RPC URL: ${rpcUrl}\n`);
    } catch (error) {
      console.error(`   ❌ Failed to connect to RPC:`, error);
      if (error instanceof Error) {
        console.error(`   Error: ${error.message}`);
        console.error(`   ⚠️  Check your SUI_RPC_URL`);
      }
    }

    // 4. Check pool connectivity
    console.log('4️⃣ Checking pool connectivity...');
    for (const pool of POOL_CONFIGS) {
      if (!pool.enabled) {
        console.log(`   ⏭️  ${pool.name}: Disabled (skipping)`);
        continue;
      }

      if (!pool.address || pool.address === '') {
        console.log(`   ⚠️  ${pool.name}: Pool address not set`);
        continue;
      }

      try {
        const poolInfo = await cetusService.getPoolInfo(pool.address);
        console.log(`   ✅ ${pool.name}: Connected`);
        console.log(`      Current Price: $${poolInfo.currentPrice.toFixed(4)}`);
        console.log(`      Fee Tier: ${poolInfo.feeTier / 10000}%`);
        console.log(`      Tick Spacing: ${poolInfo.tickSpacing}`);
      } catch (error) {
        console.error(`   ❌ ${pool.name}: Failed to connect`);
        if (error instanceof Error) {
          console.error(`      Error: ${error.message}`);
          if (error.message.includes('not found')) {
            console.error(`      ⚠️  Pool address may be incorrect: ${pool.address}`);
          }
        }
      }
    }
    console.log();

    // 5. Check token balances (if possible)
    console.log('5️⃣ Checking token balances...');
    try {
      const address = suiService.getAddress();
      const allCoins = await client.getCoins({ owner: address });
      
      const suiCoins = allCoins.data.filter(c => c.coinType === '0x2::sui::SUI');
      const totalSui = suiCoins.reduce((sum, c) => sum + BigInt(c.balance), BigInt(0));
      
      console.log(`   ✅ SUI: ${Number(totalSui) / 1e9} SUI`);
      
      // Check for USDC or other tokens
      const otherCoins = allCoins.data.filter(c => c.coinType !== '0x2::sui::SUI');
      if (otherCoins.length > 0) {
        console.log(`   📦 Other tokens: ${otherCoins.length} types`);
        for (const coin of otherCoins.slice(0, 5)) {
          console.log(`      - ${coin.coinType}: ${coin.balance}`);
        }
      } else {
        console.log(`   ⚠️  No other tokens found (you may need USDC for positions)`);
      }
      console.log();
    } catch (error) {
      console.error(`   ⚠️  Could not check token balances:`, error);
    }

    // 6. Test transaction capability
    console.log('6️⃣ Testing transaction capability...');
    try {
      const address = suiService.getAddress();
      // Just check if we can read from the chain
      const objects = await client.getOwnedObjects({ owner: address, limit: 1 });
      console.log(`   ✅ Can read from chain`);
      console.log(`   📦 Owned objects: ${objects.data.length}`);
    } catch (error) {
      console.error(`   ⚠️  Transaction capability check failed:`, error);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 DIAGNOSIS SUMMARY');
    console.log('='.repeat(60));
    
    const address = suiService.getAddress();
    const balance = await suiService.getSuiBalance(address);
    
    console.log(`Wallet Address: ${address}`);
    console.log(`Balance: ${balance.toFixed(4)} SUI`);
    console.log(`RPC: ${rpcUrl}`);
    console.log(`Pools Configured: ${POOL_CONFIGS.filter(p => p.enabled).length}`);
    
    if (balance < 0.1) {
      console.log('\n⚠️  ISSUES FOUND:');
      console.log('   - Low balance: Add more SUI for gas');
    } else {
      console.log('\n✅ Wallet appears ready for operations');
    }

  } catch (error) {
    console.error('\n❌ Diagnostic failed:', error);
    if (error instanceof Error) {
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

main().catch(console.error);


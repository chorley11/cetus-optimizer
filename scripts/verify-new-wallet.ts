import { SuiClient } from '@mysten/sui/client';

/**
 * Check the new wallet address directly
 */
async function main() {
  const newAddress = '0x035534424fb1ed864202a32d9e8d3ec180176b546872286e8323564af6d7a690';
  const client = new SuiClient({
    url: process.env.SUI_RPC_URL || 'https://fullnode.mainnet.sui.io',
  });

  console.log('🔍 Checking New Wallet Address...\n');
  console.log(`Address: ${newAddress}\n`);

  try {
    // Check balance
    const balance = await client.getBalance({ owner: newAddress });
    const suiBalance = Number(balance.totalBalance) / 1e9;
    
    console.log('💰 Balance:');
    console.log(`   ${suiBalance.toFixed(4)} SUI\n`);
    
    if (suiBalance < 0.1) {
      console.log('⚠️  WARNING: Low balance!');
      console.log('   You need at least 0.1 SUI for gas');
      console.log('   Recommended: 1-5 SUI for operations\n');
      console.log('📝 Action Required:');
      console.log('   1. Transfer SUI to this address');
      console.log(`   2. Update MAIN_WALLET_PRIVATE_KEY in .env (or Railway)`);
      console.log(`   3. Use the private key that corresponds to this address\n`);
    } else {
      console.log('✅ Balance sufficient for operations\n');
      console.log('📝 Next Step:');
      console.log('   Update MAIN_WALLET_PRIVATE_KEY in .env (or Railway)');
      console.log('   Use the private key that corresponds to this address\n');
    }

    // Check owned objects
    const objects = await client.getOwnedObjects({ owner: newAddress, limit: 10 });
    console.log(`📦 Owned Objects: ${objects.data.length}`);
    
    if (objects.data.length > 0) {
      console.log('   Objects found (wallet is active)');
    } else {
      console.log('   No objects found (new wallet or empty)');
    }

  } catch (error) {
    console.error('❌ Error checking wallet:', error);
  }
}

main().catch(console.error);

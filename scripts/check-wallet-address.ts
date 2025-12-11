import 'dotenv/config';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

/**
 * Check wallet address from private key
 * Usage: ts-node scripts/check-wallet-address.ts
 */

async function main() {
  const privateKey = process.env.MAIN_WALLET_PRIVATE_KEY;
  
  if (!privateKey) {
    console.error('❌ MAIN_WALLET_PRIVATE_KEY not set in environment');
    process.exit(1);
  }

  try {
    // Initialize wallet from private key
    const keypair = Ed25519Keypair.fromSecretKey(privateKey);
    const address = keypair.toSuiAddress();
    
    console.log('✅ Wallet Address from Private Key:');
    console.log(`   ${address}\n`);
    
    // Check if it matches expected address
    const expectedAddress = '0x035534424fb1ed864202a32d9e8d3ec180176b546872286e8323564af6d7a690';
    
    if (address.toLowerCase() === expectedAddress.toLowerCase()) {
      console.log('✅ Address matches expected address!\n');
    } else {
      console.log('⚠️  Address does NOT match expected address:');
      console.log(`   Expected: ${expectedAddress}`);
      console.log(`   Got:      ${address}\n`);
      console.log('   This means your private key does not correspond to the expected address.');
      console.log('   Make sure you updated MAIN_WALLET_PRIVATE_KEY with the correct key.\n');
    }
    
    // Check balance
    const client = new SuiClient({
      url: process.env.SUI_RPC_URL || 'https://fullnode.mainnet.sui.io',
    });
    
    try {
      const balance = await client.getBalance({ owner: address });
      const suiBalance = Number(balance.totalBalance) / 1e9;
      
      console.log('💰 Wallet Balance:');
      console.log(`   ${suiBalance.toFixed(4)} SUI\n`);
      
      if (suiBalance < 0.1) {
        console.log('⚠️  WARNING: Low balance!');
        console.log('   You need at least 0.1 SUI for gas');
        console.log('   Recommended: 1-5 SUI for operations\n');
      } else {
        console.log('✅ Balance sufficient for operations\n');
      }
    } catch (error) {
      console.error('❌ Failed to check balance:', error);
    }
    
  } catch (error) {
    console.error('❌ Failed to initialize wallet:', error);
    if (error instanceof Error) {
      console.error(`   Error: ${error.message}`);
      if (error.message.includes('Invalid')) {
        console.error('\n⚠️  Private key format may be incorrect');
        console.error('   Expected format: suiprivkey1... (64+ characters)');
      }
    }
    process.exit(1);
  }
}

main().catch(console.error);


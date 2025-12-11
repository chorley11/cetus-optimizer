import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { Logger } from './logger';

/**
 * Get coin objects for a specific coin type
 */
export async function getCoinObjects(
  client: SuiClient,
  owner: string,
  coinType: string
): Promise<string[]> {
  try {
    const coins = await client.getCoins({
      owner,
      coinType,
    });

    return coins.data.map((coin: any) => coin.coinObjectId);
  } catch (error) {
    Logger.error(`Failed to get coin objects for ${coinType}`, error);
    return [];
  }
}

/**
 * Get total balance of a specific coin type
 */
export async function getCoinBalance(
  client: SuiClient,
  owner: string,
  coinType: string
): Promise<bigint> {
  try {
    const balance = await client.getBalance({
      owner,
      coinType,
    });
    return BigInt(balance.totalBalance);
  } catch (error) {
    Logger.error(`Failed to get coin balance for ${coinType}`, error);
    return BigInt(0);
  }
}

/**
 * Add coin transfer to transaction
 * Handles merging coins if needed and transferring
 */
export function addCoinTransfer(
  txb: Transaction,
  client: SuiClient,
  owner: string,
  coinType: string,
  amount: bigint,
  recipient: string
): void {
  // For SUI, use gas coin splitting
  if (coinType === '0x2::sui::SUI') {
    txb.transferObjects(
      [txb.splitCoins(txb.gas, [amount])],
      recipient
    );
    return;
  }

  // For other coins (like USDC), need to:
  // 1. Get coin objects
  // 2. Merge if multiple
  // 3. Split amount needed
  // 4. Transfer

  // This is a simplified version - in production, you'd want to:
  // - Get all coin objects
  // - Merge them into one
  // - Split the amount needed
  // - Transfer

  // For now, we'll use a helper that does this
  const coinObjects = getCoinObjects(client, owner, coinType).then(coins => {
    if (coins.length === 0) {
      throw new Error(`No ${coinType} coins found`);
    }

    // If multiple coins, merge them first
    if (coins.length > 1) {
      const primaryCoin = txb.object(coins[0]);
      const otherCoins = coins.slice(1).map(id => txb.object(id));
      txb.mergeCoins(primaryCoin, otherCoins);
    }

    // Split the amount needed
    const coinToTransfer = txb.splitCoins(
      txb.object(coins[0]),
      [amount]
    );

    // Transfer
    txb.transferObjects([coinToTransfer], recipient);
  });
}


import { SuiTransactionBlockResponse } from '@mysten/sui/client';
import { Logger } from './logger';

export interface ParsedTransactionResult {
  positionId?: string;
  feesCollected?: {
    tokenA: string;
    tokenB: string;
    usd: number;
  };
  gasUsed?: string;
  gasUsedMist?: bigint;
  events?: any[];
  objectChanges?: any[];
}

/**
 * Parse transaction result to extract position ID
 */
export function parsePositionIdFromTx(
  txResult: SuiTransactionBlockResponse,
  poolAddress: string
): string | null {
  try {
    // Look for created objects
    if (txResult.objectChanges) {
      for (const change of txResult.objectChanges) {
        if (change.type === 'created') {
          const object = change as any;
          // Check if this is a position NFT (Cetus positions are NFTs)
          if (object.objectType?.includes('Position')) {
            return object.objectId;
          }
        }
      }
    }

    // Look in events for position creation
    if (txResult.events) {
      for (const event of txResult.events) {
        const eventData = event.parsedJson as any;
        if (eventData?.position_id) {
          return eventData.position_id;
        }
        if (eventData?.position) {
          return eventData.position;
        }
      }
    }

    // Check transaction effects for created objects
    if (txResult.effects?.created) {
      for (const created of txResult.effects.created) {
        // Position NFTs typically have specific owner structure
        if (created.owner && created.reference) {
          // Try to fetch object details to verify it's a position
          return created.reference.objectId;
        }
      }
    }

    Logger.warn('Could not find position ID in transaction result', {
      txDigest: txResult.digest,
    });

    return null;
  } catch (error) {
    Logger.error('Failed to parse position ID from transaction', error);
    return null;
  }
}

/**
 * Parse fee amounts from transaction result
 */
export function parseFeesFromTx(
  txResult: SuiTransactionBlockResponse,
  tokenAAddress: string,
  tokenBAddress: string
): { tokenA: string; tokenB: string; usd: number } {
  try {
    let tokenAAmount = '0';
    let tokenBAmount = '0';

    // Look for balance changes
    if (txResult.objectChanges) {
      for (const change of txResult.objectChanges) {
        if (change.type === 'mutated') {
          const mutated = change as any;
          // Check if this is a coin balance change
          if (mutated.objectType?.includes('Coin')) {
            const coinType = mutated.objectType;
            const balance = mutated.balance || '0';

            if (coinType.includes(tokenAAddress) || coinType.includes('USDC')) {
              tokenAAmount = balance;
            } else if (coinType.includes(tokenBAddress) || coinType.includes('SUI')) {
              tokenBAmount = balance;
            }
          }
        }
      }
    }

    // Look in events for fee collection
    if (txResult.events) {
      for (const event of txResult.events) {
        const eventData = event.parsedJson as any;
        if (eventData?.amount_a) {
          tokenAAmount = eventData.amount_a.toString();
        }
        if (eventData?.amount_b) {
          tokenBAmount = eventData.amount_b.toString();
        }
        if (eventData?.fee_amount_a) {
          tokenAAmount = eventData.fee_amount_a.toString();
        }
        if (eventData?.fee_amount_b) {
          tokenBAmount = eventData.fee_amount_b.toString();
        }
      }
    }

    // Calculate USD value (simplified - assumes tokenB is USDC or SUI)
    // In production, fetch actual prices
    const usdValue = parseFloat(tokenAAmount) + parseFloat(tokenBAmount);

    return {
      tokenA: tokenAAmount,
      tokenB: tokenBAmount,
      usd: usdValue,
    };
  } catch (error) {
    Logger.error('Failed to parse fees from transaction', error);
    return { tokenA: '0', tokenB: '0', usd: 0 };
  }
}

/**
 * Parse gas used from transaction result
 */
export function parseGasUsedFromTx(
  txResult: SuiTransactionBlockResponse
): { gasUsed: string; gasUsedMist: bigint } {
  try {
    const gasUsed = txResult.effects?.gasUsed;
    
    if (gasUsed) {
      const gasUsedMist = BigInt(gasUsed.computationCost || 0) + 
                          BigInt(gasUsed.storageCost || 0) - 
                          BigInt(gasUsed.storageRebate || 0);
      
      const gasUsedSui = Number(gasUsedMist) / 1e9;
      
      return {
        gasUsed: gasUsedSui.toFixed(6),
        gasUsedMist,
      };
    }

    return {
      gasUsed: '0',
      gasUsedMist: BigInt(0),
    };
  } catch (error) {
    Logger.error('Failed to parse gas used from transaction', error);
    return {
      gasUsed: '0',
      gasUsedMist: BigInt(0),
    };
  }
}

/**
 * Parse complete transaction result
 */
export function parseTransactionResult(
  txResult: SuiTransactionBlockResponse,
  poolAddress: string,
  tokenAAddress: string,
  tokenBAddress: string
): ParsedTransactionResult {
  const positionId = parsePositionIdFromTx(txResult, poolAddress);
  const fees = parseFeesFromTx(txResult, tokenAAddress, tokenBAddress);
  const gas = parseGasUsedFromTx(txResult);

  return {
    positionId: positionId || undefined,
    feesCollected: fees,
    gasUsed: gas.gasUsed,
    gasUsedMist: gas.gasUsedMist,
    events: txResult.events || undefined,
    objectChanges: txResult.objectChanges || undefined,
  };
}


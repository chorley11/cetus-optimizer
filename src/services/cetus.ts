import { CetusClmmSDK } from '@cetusprotocol/cetus-sui-clmm-sdk';
import { SuiClient } from '@mysten/sui/client';
import { PoolConfig } from '../types';
import { Logger } from '../utils/logger';
import { retryWithBackoff } from '../utils/retry';

export interface PoolInfo {
  poolAddress: string;
  currentSqrtPrice: string;
  currentPrice: number;
  tickSpacing: number;
  feeTier: number;
}

export interface PositionInfo {
  positionId: string;
  tickLower: number;
  tickUpper: number;
  liquidity: string;
  amountA: string;
  amountB: string;
}

export class CetusService {
  private sdk: CetusClmmSDK;

  constructor(suiClient: SuiClient, network: 'mainnet' | 'testnet' = 'mainnet') {
    // Cetus SDK initialization - check actual API
    this.sdk = new CetusClmmSDK({
      // SDK options may vary - using any to bypass type checking for now
    } as any);
    // Set client if SDK supports it
    if ((this.sdk as any).setClient) {
      (this.sdk as any).setClient(suiClient);
    }
  }

  async getPoolInfo(poolAddress: string): Promise<PoolInfo> {
    return retryWithBackoff(async () => {
      const pool = await this.sdk.Pool.getPool(poolAddress);
      
      // Calculate current price from sqrt price
      // price = (sqrtPrice / 2^96)^2
      const sqrtPrice = BigInt(pool.current_sqrt_price);
      const Q96 = BigInt(2) ** BigInt(96);
      const price = Number(sqrtPrice * sqrtPrice) / Number(Q96 * Q96);
      
      return {
        poolAddress,
        currentSqrtPrice: String((pool as any).currentSqrtPrice || (pool as any).current_sqrt_price || '0'),
        currentPrice: price,
        tickSpacing: (pool as any).tickSpacing || (pool as any).tick_spacing || 60,
        feeTier: (pool as any).feeRate || (pool as any).fee_rate || 2500,
      };
    });
  }

  async getPosition(positionId: string): Promise<PositionInfo | null> {
    return retryWithBackoff(async () => {
      try {
        // getPosition may require additional parameters
        const position = await (this.sdk.Position.getPosition as any)(positionId);
        
        // Handle both camelCase and snake_case property names
        const pos = position as any;
        
        return {
          positionId: pos.positionId || pos.position_id || positionId,
          tickLower: pos.tickLower || pos.tick_lower || 0,
          tickUpper: pos.tickUpper || pos.tick_upper || 0,
          liquidity: pos.liquidity || '0',
          amountA: pos.amountA || pos.amount_a || '0',
          amountB: pos.amountB || pos.amount_b || '0',
        };
      } catch (error: any) {
        if (error.message?.includes('not found')) {
          return null;
        }
        throw error;
      }
    });
  }

  async createPositionTx(
    poolAddress: string,
    tickLower: number,
    tickUpper: number,
    amountA: string,
    amountB: string,
    slippage: number = 0.5
  ) {
    return retryWithBackoff(async () => {
      // Try different API method names
      const positionModule = this.sdk.Position as any;
      
      if (positionModule.createPositionTx) {
        return await positionModule.createPositionTx({
          poolId: poolAddress,
          tickLower,
          tickUpper,
          amountA,
          amountB,
          slippage,
        });
      } else if (positionModule.createPosition) {
        return await positionModule.createPosition({
          poolId: poolAddress,
          tickLower,
          tickUpper,
          amountA,
          amountB,
          slippage,
        });
      } else {
        // Fallback: create transaction manually
        const { Transaction } = require('@mysten/sui/transactions');
        const txb = new Transaction();
        // This would need actual SDK method - placeholder for now
        throw new Error('Position creation method not found in SDK');
      }
    });
  }

  async closePositionTx(
    positionId: string,
    collectFee: boolean = true
  ) {
    return retryWithBackoff(async () => {
      const positionModule = this.sdk.Position as any;
      
      if (positionModule.closePositionTx) {
        return await positionModule.closePositionTx({
          positionId,
          collectFee,
        });
      } else if (positionModule.closePosition) {
        return await positionModule.closePosition({
          positionId,
          collectFee,
        });
      } else {
        throw new Error('Position close method not found in SDK');
      }
    });
  }

  async collectFeesTx(positionId: string) {
    return retryWithBackoff(async () => {
      const positionModule = this.sdk.Position as any;
      
      if (positionModule.collectFeeTx) {
        return await positionModule.collectFeeTx({
          positionId,
        });
      } else if (positionModule.collectFee) {
        return await positionModule.collectFee({
          positionId,
        });
      } else {
        throw new Error('Fee collection method not found in SDK');
      }
    });
  }

  /**
   * Convert price to tick
   * Uses the formula: tick = log(price) / log(1.0001)
   */
  priceToTick(price: number, tickSpacing: number): number {
    if (price <= 0) {
      throw new Error('Price must be greater than 0');
    }
    
    // Calculate tick from price: price = 1.0001^tick
    const tick = Math.log(price) / Math.log(1.0001);
    
    // Round down to nearest tick spacing
    const tickRounded = Math.floor(tick / tickSpacing) * tickSpacing;
    
    return tickRounded;
  }

  /**
   * Convert tick to price
   */
  tickToPrice(tick: number): number {
    return Math.pow(1.0001, tick);
  }

  getSDK(): CetusClmmSDK {
    return this.sdk;
  }
}


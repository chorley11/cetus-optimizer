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
    this.sdk = new CetusClmmSDK({
      network,
      client: suiClient,
    });
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
        currentSqrtPrice: pool.current_sqrt_price,
        currentPrice: price,
        tickSpacing: pool.tick_spacing,
        feeTier: pool.fee_rate,
      };
    });
  }

  async getPosition(positionId: string): Promise<PositionInfo | null> {
    return retryWithBackoff(async () => {
      try {
        const position = await this.sdk.Position.getPosition(positionId);
        
        return {
          positionId: position.position_id,
          tickLower: position.tick_lower,
          tickUpper: position.tick_upper,
          liquidity: position.liquidity,
          amountA: position.amount_a,
          amountB: position.amount_b,
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
      const txb = await this.sdk.Position.createPosition({
        pool_id: poolAddress,
        tick_lower: tickLower,
        tick_upper: tickUpper,
        amount_a: amountA,
        amount_b: amountB,
        slippage,
      });
      return txb;
    });
  }

  async closePositionTx(
    positionId: string,
    collectFee: boolean = true
  ) {
    return retryWithBackoff(async () => {
      const txb = await this.sdk.Position.closePosition({
        position_id: positionId,
        collect_fee: collectFee,
      });
      return txb;
    });
  }

  async collectFeesTx(positionId: string) {
    return retryWithBackoff(async () => {
      const txb = await this.sdk.Position.collectFee({
        position_id: positionId,
      });
      return txb;
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


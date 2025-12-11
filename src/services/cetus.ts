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
  private suiClient: SuiClient;

  constructor(suiClient: SuiClient, network: 'mainnet' | 'testnet' = 'mainnet') {
    this.suiClient = suiClient;
    // Cetus SDK initialization
    // The SDK needs the fullNodeUrl parameter explicitly set
    const rpcUrl = process.env.SUI_RPC_URL || 'https://fullnode.mainnet.sui.io';
    
    Logger.info('Initializing Cetus SDK', { network, rpcUrl });
    
    // Ensure the passed SuiClient has the URL set
    if (!(suiClient as any).url) {
      (suiClient as any).url = rpcUrl;
    }
    
    try {
      // Primary method: Initialize with both client and fullNodeUrl
      // IMPORTANT: Ensure the SuiClient we pass has the URL properly set
      // The SDK may create its own client, so we need to ensure fullNodeUrl is set
      this.sdk = new CetusClmmSDK({
        network,
        fullNodeUrl: rpcUrl,
        client: suiClient,
      } as any);
      
      Logger.info('Cetus SDK initialized successfully with client and fullNodeUrl', { rpcUrl });
      
      // Immediately patch the SDK's internal client to ensure URL is set
      const sdkAny = this.sdk as any;
      
      // Patch all possible client locations
      const clients = [
        sdkAny.client,
        sdkAny.suiClient,
        sdkAny.Pool?.client,
        sdkAny.Pool?.suiClient,
      ].filter(Boolean);
      
      for (const client of clients) {
        if (client) {
          if (!client.url) client.url = rpcUrl;
          if (!client.fullNodeUrl) client.fullNodeUrl = rpcUrl;
          
          // Patch transport - this is critical
          if (client.transport) {
            if (!client.transport.url) client.transport.url = rpcUrl;
            if (!client.transport.fullNodeUrl) client.transport.fullNodeUrl = rpcUrl;
          }
          
          // Some SDKs store transport in a different location
          if (client.rpc?.transport) {
            if (!client.rpc.transport.url) client.rpc.transport.url = rpcUrl;
          }
        }
      }
      
      Logger.info('Cetus SDK client patching completed', { 
        clientCount: clients.length,
        hasPoolClient: !!sdkAny.Pool?.client 
      });
      
    } catch (error) {
      Logger.error('Failed to initialize Cetus SDK with client and fullNodeUrl, trying fullNodeUrl only', error);
      
      // Fallback 1: Try with fullNodeUrl only
      try {
        this.sdk = new CetusClmmSDK({
          network,
          fullNodeUrl: rpcUrl,
        } as any);
        
        Logger.info('Cetus SDK initialized with fullNodeUrl only');
        
        // Patch after initialization
        const sdkAny = this.sdk as any;
        if (sdkAny.client && !sdkAny.client.url) {
          sdkAny.client.url = rpcUrl;
        }
        if (sdkAny.Pool && sdkAny.Pool.client && !sdkAny.Pool.client.url) {
          sdkAny.Pool.client.url = rpcUrl;
        }
      } catch (fallbackError) {
        Logger.error('Failed to initialize Cetus SDK with fullNodeUrl, trying client only', fallbackError);
        
        // Fallback 2: Try with client only
        try {
          const clientWithUrl = new SuiClient({ url: rpcUrl });
          this.sdk = new CetusClmmSDK({
            client: clientWithUrl,
            network,
          } as any);
          
          Logger.info('Cetus SDK initialized with client only');
        } catch (finalError) {
          Logger.error('Failed to initialize Cetus SDK with all methods', finalError);
          throw new Error(`Failed to initialize Cetus SDK: ${finalError instanceof Error ? finalError.message : String(finalError)}`);
        }
      }
    }
    
    // Verify SDK has access to RPC by checking if it has a client
    try {
      const sdkAny = this.sdk as any;
      const sdkClient = sdkAny.client || sdkAny.suiClient || (sdkAny.Pool && sdkAny.Pool.client);
      if (sdkClient) {
        const clientUrl = sdkClient.url || sdkClient.fullNodeUrl || (sdkClient.transport && sdkClient.transport.url);
        Logger.info('Cetus SDK client URL verified', { url: clientUrl || 'not found' });
      } else {
        Logger.warn('Cetus SDK client not found - may have RPC issues');
      }
    } catch (error) {
      Logger.warn('Could not verify Cetus SDK client URL', error);
    }
  }

  async getPoolInfo(poolAddress: string): Promise<PoolInfo> {
    // Validate pool address format
    if (!poolAddress || poolAddress.trim() === '' || poolAddress === '0x') {
      throw new Error(`Invalid pool address: "${poolAddress}" - Pool address is empty or not set`);
    }
    
    // Validate Sui address format (should start with 0x and be 64 chars)
    if (!poolAddress.startsWith('0x') || poolAddress.length < 66) {
      throw new Error(`Invalid pool address format: "${poolAddress}" - Must start with 0x and be 64+ characters`);
    }
    
    return retryWithBackoff(async () => {
      // Ensure SDK client has RPC URL before making request
      const rpcUrl = process.env.SUI_RPC_URL || 'https://fullnode.mainnet.sui.io';
      const sdkAny = this.sdk as any;
      
      // Comprehensive patching of all possible client locations
      const clientsToPatch = [
        sdkAny.client,
        sdkAny.suiClient,
        sdkAny.Pool?.client,
        sdkAny.Pool?.suiClient,
      ].filter(Boolean);
      
      for (const client of clientsToPatch) {
        if (client) {
          // Set URL on client itself
          if (!client.url) client.url = rpcUrl;
          if (!client.fullNodeUrl) client.fullNodeUrl = rpcUrl;
          
          // Patch transport layer - this is where the actual HTTP request happens
          if (client.transport) {
            if (!client.transport.url) client.transport.url = rpcUrl;
            if (!client.transport.fullNodeUrl) client.transport.fullNodeUrl = rpcUrl;
            // Handle JsonRpcHTTPTransport specifically
            if (client.transport.constructor?.name === 'JsonRpcHTTPTransport') {
              (client.transport as any).url = rpcUrl;
            }
          }
          
          // Patch RPC module if it exists
          if (client.rpc?.transport) {
            if (!client.rpc.transport.url) client.rpc.transport.url = rpcUrl;
          }
        }
      }
      
      // Patch Pool module's client directly
      if (sdkAny.Pool) {
        const poolClient = sdkAny.Pool.client || sdkAny.Pool.suiClient;
        if (poolClient?.transport && !poolClient.transport.url) {
          poolClient.transport.url = rpcUrl;
        }
        if (sdkAny.Pool.rpc?.transport && !sdkAny.Pool.rpc.transport.url) {
          sdkAny.Pool.rpc.transport.url = rpcUrl;
        }
      }
      
      // Final attempt: directly patch the Pool module's internal client before calling
      // The SDK may create a new client instance, so we need to patch it right before use
      const poolModule = sdkAny.Pool;
      if (poolModule) {
        // Try to get the actual client used by Pool.getPool
        const poolClient = poolModule.client || poolModule.suiClient || poolModule._client;
        if (poolClient) {
          // Force set URL on all possible properties
          poolClient.url = rpcUrl;
          poolClient.fullNodeUrl = rpcUrl;
          
          // Patch transport aggressively
          if (poolClient.transport) {
            poolClient.transport.url = rpcUrl;
            poolClient.transport.fullNodeUrl = rpcUrl;
            // Some transports use _url internally
            (poolClient.transport as any)._url = rpcUrl;
          }
          
          // Patch RPC if it exists
          if (poolClient.rpc?.transport) {
            poolClient.rpc.transport.url = rpcUrl;
            (poolClient.rpc.transport as any)._url = rpcUrl;
          }
        }
        
        // Also try to patch the module's RPC directly
        if (poolModule.rpc?.transport) {
          poolModule.rpc.transport.url = rpcUrl;
          (poolModule.rpc.transport as any)._url = rpcUrl;
        }
      }
      
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

  /**
   * Get pool info directly from Sui RPC, bypassing SDK
   * This is a fallback when SDK has RPC URL issues
   */
  private async getPoolDirect(poolAddress: string): Promise<any> {
    return retryWithBackoff(async () => {
      Logger.info(`Fetching pool ${poolAddress} directly from Sui RPC`);
      
      // Get the pool object directly
      const poolObject = await this.suiClient.getObject({
        id: poolAddress,
        options: {
          showContent: true,
          showType: true,
        },
      });

      if (!poolObject.data || !poolObject.data.content) {
        throw new Error(`Pool object not found at ${poolAddress}`);
      }

      const content = poolObject.data.content;
      if (content.dataType !== 'moveObject') {
        throw new Error(`Invalid pool object type: ${content.dataType}`);
      }

      const fields = (content as any).fields || {};
      
      // Extract pool data - Cetus pools have these fields
      // The structure may vary, so we try multiple possible field names
      const sqrtPrice = fields.current_sqrt_price || 
                       fields.currentSqrtPrice || 
                       fields.sqrt_price ||
                       fields.sqrtPrice ||
                       '0';
      
      const tickSpacing = fields.tick_spacing || 
                         fields.tickSpacing || 
                         fields.tick_spacing ||
                         60;
      
      const feeRate = fields.fee_rate || 
                     fields.feeRate || 
                     fields.fee ||
                     2500;

      Logger.info(`Successfully fetched pool directly`, {
        sqrtPrice,
        tickSpacing,
        feeRate,
      });

      return {
        current_sqrt_price: sqrtPrice,
        currentSqrtPrice: sqrtPrice,
        tick_spacing: tickSpacing,
        tickSpacing: tickSpacing,
        fee_rate: feeRate,
        feeRate: feeRate,
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

  /**
   * Create a swap transaction to convert SUI to another token
   * Used for "zap in" functionality
   */
  async createSwapTx(
    poolAddress: string,
    tokenIn: string,  // Token address to swap from (e.g., SUI)
    tokenOut: string, // Token address to swap to (e.g., USDC)
    amountIn: string,
    slippage: number = 0.5
  ) {
    return retryWithBackoff(async () => {
      const swapModule = this.sdk.Swap as any;
      
      if (swapModule.swapTx) {
        return await swapModule.swapTx({
          poolId: poolAddress,
          tokenIn,
          tokenOut,
          amountIn,
          slippage,
        });
      } else if (swapModule.swap) {
        return await swapModule.swap({
          poolId: poolAddress,
          tokenIn,
          tokenOut,
          amountIn,
          slippage,
        });
      } else {
        // Fallback: create transaction manually using SDK
        const { Transaction } = require('@mysten/sui/transactions');
        const txb = new Transaction();
        
        // Use SDK's swap method if available
        const swapMethod = (this.sdk as any).swap || (this.sdk as any).Swap?.swap;
        if (swapMethod) {
          return await swapMethod({
            poolId: poolAddress,
            tokenIn,
            tokenOut,
            amountIn,
            slippage,
          });
        }
        
        throw new Error('Swap method not found in Cetus SDK');
      }
    });
  }

  /**
   * Calculate swap amount needed to get equal value of both tokens
   * For zap-in: if providing SUI, swap half value to USDC
   */
  calculateZapSwapAmount(
    totalValueUsd: number,
    currentPrice: number,
    tokenInIsTokenA: boolean // true if tokenIn is tokenA (e.g., SUI)
  ): { amountIn: string; expectedAmountOut: string } {
    // For equal value positions, we need:
    // - If SUI is tokenA: need equal USD value of SUI and USDC
    // - Total value = amountA * price + amountB
    // - For equal value: amountA * price = amountB
    // - So: amountB = amountA * price
    // - Total = amountA * price + amountA * price = 2 * amountA * price
    // - amountA = total / (2 * price)
    // - amountB = total / 2
    
    if (tokenInIsTokenA) {
      // Providing SUI (tokenA), need to swap to get USDC (tokenB)
      // We want: amountA * price = amountB
      // Total USD = amountA * price + amountB = 2 * amountA * price
      // So: amountA = total / (2 * price)
      const amountAUsd = totalValueUsd / 2;
      const amountBUsd = totalValueUsd / 2;
      
      // Convert to token amounts
      const amountA = amountAUsd / currentPrice; // SUI amount
      const amountB = amountBUsd; // USDC amount
      
      // We have SUI, need to swap some to get USDC
      // If we have X SUI total, we want amountA SUI and amountB USDC
      // So we need to swap: (X - amountA) SUI to get amountB USDC
      // But we don't know X yet... let's think differently
      
      // Actually: if total value is V, we want V/2 in each token
      // If providing SUI: we need V/2 worth of SUI, swap V/2 worth to USDC
      const suiNeeded = amountAUsd / currentPrice;
      const usdcNeeded = amountBUsd;
      
      // Amount to swap: half the total value in SUI
      const swapAmountSui = totalValueUsd / (2 * currentPrice);
      const expectedUsdcOut = totalValueUsd / 2;
      
      return {
        amountIn: String(Math.floor(swapAmountSui * 1e9)), // Convert to smallest unit
        expectedAmountOut: String(Math.floor(expectedUsdcOut * 1e6)), // USDC has 6 decimals
      };
    } else {
      // Providing USDC (tokenB), need to swap to get SUI (tokenA)
      const amountAUsd = totalValueUsd / 2;
      const amountBUsd = totalValueUsd / 2;
      
      const swapAmountUsdc = totalValueUsd / 2;
      const expectedSuiOut = amountAUsd / currentPrice;
      
      return {
        amountIn: String(Math.floor(swapAmountUsdc * 1e6)), // USDC has 6 decimals
        expectedAmountOut: String(Math.floor(expectedSuiOut * 1e9)), // SUI has 9 decimals
      };
    }
  }

  /**
   * Create a zap-in transaction: swap + open position in one transaction
   */
  async createZapInPositionTx(
    poolAddress: string,
    tickLower: number,
    tickUpper: number,
    tokenIn: string,  // Token to zap in with (e.g., SUI)
    tokenA: string,   // Token A address
    tokenB: string,   // Token B address
    totalValueUsd: number,
    currentPrice: number,
    tokenInIsTokenA: boolean,
    slippage: number = 0.5
  ) {
    return retryWithBackoff(async () => {
      const { Transaction } = require('@mysten/sui/transactions');
      const txb = new Transaction();
      
      // Calculate swap amounts
      const swapAmounts = this.calculateZapSwapAmount(
        totalValueUsd,
        currentPrice,
        tokenInIsTokenA
      );
      
      // Step 1: Swap half to get the other token
      // Note: This is a simplified approach - in practice, you might need to
      // use the SDK's actual swap method or combine transactions differently
      
      // For now, we'll create a transaction that:
      // 1. Splits coins for swap
      // 2. Performs swap
      // 3. Opens position with both tokens
      
      // This is a placeholder - actual implementation depends on Cetus SDK API
      // The SDK might have a built-in zap method, or we need to combine swap + position
      
      throw new Error('Zap-in transaction creation not fully implemented - use two-step process');
    });
  }

  getSDK(): CetusClmmSDK {
    return this.sdk;
  }
}


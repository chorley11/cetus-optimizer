import { CetusClmmSDK } from '@cetusprotocol/cetus-sui-clmm-sdk';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
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
  private suiService: any; // Store SuiService reference for coin operations

  constructor(suiClient: SuiClient, network: 'mainnet' | 'testnet' = 'mainnet', suiService?: any) {
    this.suiClient = suiClient;
    this.suiService = suiService; // Store SuiService reference
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
      
      // Try SDK first, fallback to direct RPC if SDK fails
      let pool: any;
      try {
        pool = await this.sdk.Pool.getPool(poolAddress);
      } catch (sdkError: any) {
        Logger.warn(`SDK getPool failed for ${poolAddress}, using direct RPC`, { error: sdkError.message });
        pool = await this.getPoolDirect(poolAddress);
      }
      
      // Calculate current price from sqrt price
      // price = (sqrtPrice / 2^96)^2
      const sqrtPrice = BigInt(pool.current_sqrt_price || pool.currentSqrtPrice || '0');
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
   * Patch SDK client with RPC URL before making SDK calls
   * This should be called before any SDK operation
   */
  private patchSdkClient(): void {
    const rpcUrl = process.env.SUI_RPC_URL || 'https://fullnode.mainnet.sui.io';
    const sdkAny = this.sdk as any;
    
    const clientsToPatch = [
      sdkAny.client,
      sdkAny.suiClient,
      sdkAny.Position?.client,
      sdkAny.Position?.suiClient,
      sdkAny.Pool?.client,
      sdkAny.Pool?.suiClient,
      sdkAny.Swap?.client,
      sdkAny.Swap?.suiClient,
    ].filter(Boolean);
    
    for (const client of clientsToPatch) {
      if (client) {
        client.url = rpcUrl;
        client.fullNodeUrl = rpcUrl;
        if (client.transport) {
          client.transport.url = rpcUrl;
          client.transport.fullNodeUrl = rpcUrl;
          (client.transport as any)._url = rpcUrl;
        }
        if (client.rpc?.transport) {
          client.rpc.transport.url = rpcUrl;
          (client.rpc.transport as any)._url = rpcUrl;
        }
      }
    }
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
    slippage: number = 0.5,
    coinTypeA?: string,
    coinTypeB?: string
  ) {
    return retryWithBackoff(async () => {
      // Patch SDK client before making position calls
      this.patchSdkClient();
      
      // Try different API method names and SDK structures
      const positionModule = this.sdk.Position as any;
      const sdkAny = this.sdk as any;
      
      // Log SDK structure for debugging
      const availableMethods = Object.keys(positionModule || {}).filter(k => typeof positionModule[k] === 'function');
      const positionModuleKeys = Object.keys(positionModule || {});
      Logger.debug('SDK Position module structure', { 
        methods: availableMethods,
        keys: positionModuleKeys,
        hasPositionModule: !!positionModule,
        sdkKeys: Object.keys(sdkAny || {}),
      });
      
      // If Position module is empty or doesn't have methods, build transaction manually
      if (!positionModule || availableMethods.length === 0) {
        Logger.warn('SDK Position module has no methods, building transaction manually');
        return await this.createPositionTxManual(
          poolAddress,
          tickLower,
          tickUpper,
          amountA,
          amountB,
          slippage,
          coinTypeA,
          coinTypeB
        );
      }
      
      try {
        // Try multiple possible method names
        if (positionModule.createPositionTx) {
          Logger.debug('Using createPositionTx method');
          return await positionModule.createPositionTx({
            poolId: poolAddress,
            tickLower,
            tickUpper,
            amountA,
            amountB,
            slippage,
          });
        } else if (positionModule.createPosition) {
          Logger.debug('Using createPosition method');
          return await positionModule.createPosition({
            poolId: poolAddress,
            tickLower,
            tickUpper,
            amountA,
            amountB,
            slippage,
          });
        } else if (positionModule.openPosition) {
          Logger.debug('Using openPosition method');
          return await positionModule.openPosition({
            poolId: poolAddress,
            tickLower,
            tickUpper,
            amountA,
            amountB,
            slippage,
          });
        } else if (positionModule.mintPositionTx) {
          Logger.debug('Using mintPositionTx method');
          return await positionModule.mintPositionTx({
            poolId: poolAddress,
            tickLower,
            tickUpper,
            amountA,
            amountB,
            slippage,
          });
        } else if (sdkAny.createPositionTx) {
          Logger.debug('Using SDK-level createPositionTx method');
          return await sdkAny.createPositionTx({
            poolId: poolAddress,
            tickLower,
            tickUpper,
            amountA,
            amountB,
            slippage,
          });
        } else if (sdkAny.Pool?.createPositionTx) {
          Logger.debug('Using Pool.createPositionTx method');
          return await sdkAny.Pool.createPositionTx({
            poolId: poolAddress,
            tickLower,
            tickUpper,
            amountA,
            amountB,
            slippage,
          });
        } else {
          // Fallback to manual transaction building
          Logger.warn('No SDK position creation methods found, using manual transaction builder');
          return await this.createPositionTxManual(
            poolAddress,
            tickLower,
            tickUpper,
            amountA,
            amountB,
            slippage,
            coinTypeA,
            coinTypeB
          );
        }
      } catch (error: any) {
        Logger.error('SDK createPositionTx failed, trying manual builder', { 
          error: error.message,
        });
        // Fallback to manual transaction building
        return await this.createPositionTxManual(
          poolAddress,
          tickLower,
          tickUpper,
          amountA,
          amountB,
          slippage,
          coinTypeA,
          coinTypeB
        );
      }
    });
  }

  async closePositionTx(
    positionId: string,
    collectFee: boolean = true
  ) {
    return retryWithBackoff(async () => {
      // Patch SDK client before position operations
      this.patchSdkClient();
      
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
      // Patch SDK client before position operations
      this.patchSdkClient();
      
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
      // Try SDK methods first
      const swapModule = this.sdk.Swap as any;
      
      if (swapModule?.swapTx) {
        try {
          return await swapModule.swapTx({
            poolId: poolAddress,
            tokenIn,
            tokenOut,
            amountIn,
            slippage,
          });
        } catch (error) {
          Logger.warn('SDK swapTx failed, trying manual builder', error);
        }
      }
      
      if (swapModule?.swap) {
        try {
          return await swapModule.swap({
            poolId: poolAddress,
            tokenIn,
            tokenOut,
            amountIn,
            slippage,
          });
        } catch (error) {
          Logger.warn('SDK swap failed, trying manual builder', error);
        }
      }
      
      // Fallback: create swap transaction manually using Move calls
      Logger.info('Building swap transaction manually using Move calls', {
        poolAddress,
        tokenIn,
        tokenOut,
        amountIn,
      });
      
      return await this.createSwapTxManual(
        poolAddress,
        tokenIn,
        tokenOut,
        amountIn,
        slippage
      );
    });
  }

  /**
   * Create swap transaction manually using Move calls
   * This is a fallback when SDK swap methods are not available
   */
  private async createSwapTxManual(
    poolAddress: string,
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
    slippage: number
  ): Promise<Transaction> {
    const { Transaction } = require('@mysten/sui/transactions');
    const txb = new Transaction();
    
    // Cetus CLMM package address (mainnet)
    const CETUS_PACKAGE = process.env.CETUS_PACKAGE || '0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb';
    
    if (!this.suiService) {
      throw new Error('SuiService not available - cannot fetch coin objects for swap');
    }
    
    const walletAddress = this.suiService.getAddress();
    
    // Validate amount fits within u64
    const amountInBigInt = BigInt(amountIn);
    const U64_MAX = BigInt('18446744073709551615');
    if (amountInBigInt > U64_MAX) {
      throw new Error(`Swap amount ${amountIn} exceeds u64 maximum`);
    }
    
    // Get coin objects for the input token
    const coinObjects = await this.suiService.getClient().getCoins({
      owner: walletAddress,
      coinType: tokenIn,
    });
    
    if (coinObjects.data.length === 0) {
      throw new Error(`No ${tokenIn} coins found in wallet for swap`);
    }
    
    // Prepare coin for swap
    let coinInput: any;
    
    if (tokenIn === '0x2::sui::SUI') {
      // Use gas coin for SUI
      coinInput = txb.splitCoins(txb.gas, [Number(amountInBigInt)]);
    } else {
      // For other coins, merge all coins first, then split
      const primaryCoin = txb.object(coinObjects.data[0].coinObjectId);
      if (coinObjects.data.length > 1) {
        const otherCoins = coinObjects.data.slice(1).map((c: any) => txb.object(c.coinObjectId));
        txb.mergeCoins(primaryCoin, otherCoins);
      }
      coinInput = txb.splitCoins(primaryCoin, [Number(amountInBigInt)]);
    }
    
    // Get pool object
    const poolObj = txb.object(poolAddress);
    
    // Calculate slippage tolerance (convert percentage to basis points)
    // slippage = 0.5 means 0.5% = 50 basis points
    // For Cetus, we might need to calculate sqrt price bounds
    // For now, we'll pass null and let Cetus handle slippage
    const slippageSqrtPrice = null;
    
    // Build the Move call to swap
    // Function signature: swap<CoinTypeIn, CoinTypeOut>(
    //   pool: &Pool<CoinTypeIn, CoinTypeOut>,
    //   coin_in: Coin<CoinTypeIn>,
    //   amount: u64,
    //   slippage_sqrt_price: Option<U256>,
    //   ctx: &mut TxContext
    // ) -> Coin<CoinTypeOut>
    txb.moveCall({
      target: `${CETUS_PACKAGE}::clmm::swap`,
      typeArguments: [tokenIn, tokenOut],
      arguments: [
        poolObj,
        coinInput,
        txb.pure.u64(Number(amountInBigInt)),
        slippageSqrtPrice ? txb.pure.option('u256', slippageSqrtPrice) : txb.pure.option('u256', null),
      ],
    });
    
    Logger.info('Manual swap transaction built successfully', {
      poolAddress,
      tokenIn,
      tokenOut,
      amountIn,
    });
    
    return txb;
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

  /**
   * Create position transaction manually using Move calls
   * This is a fallback when SDK methods are not available
   */
  private async createPositionTxManual(
    poolAddress: string,
    tickLower: number,
    tickUpper: number,
    amountA: string,
    amountB: string,
    slippage: number,
    coinTypeA?: string,
    coinTypeB?: string
  ): Promise<Transaction> {
    const txb = new Transaction();
    
    // Cetus CLMM package address (mainnet)
    const CETUS_PACKAGE = process.env.CETUS_PACKAGE || '0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb';
    
    Logger.info('Building position transaction manually using Move calls', {
      poolAddress,
      tickLower,
      tickUpper,
      amountA,
      amountB,
      coinTypeA,
      coinTypeB,
    });
    
    // Validate coin types are provided and not placeholders
    if (!coinTypeA || !coinTypeB) {
      throw new Error(
        'Manual position creation requires coin types. ' +
        `coinTypeA: ${coinTypeA || 'missing'}, coinTypeB: ${coinTypeB || 'missing'}. ` +
        'Please ensure pool config includes token addresses.'
      );
    }
    
    // Validate coin types are not placeholders (e.g., "0x...::usdc::USDC")
    if (coinTypeA.includes('...') || coinTypeB.includes('...')) {
      throw new Error(
        `Invalid coin type format (contains placeholder): coinTypeA=${coinTypeA}, coinTypeB=${coinTypeB}. ` +
        'Please set proper token addresses in environment variables (e.g., DEEP_ADDRESS, WAL_ADDRESS, USDC_ADDRESS).'
      );
    }
    
    // Validate coin types start with 0x and have proper format
    if (!coinTypeA.startsWith('0x') || !coinTypeB.startsWith('0x')) {
      throw new Error(
        `Invalid coin type format (must start with 0x): coinTypeA=${coinTypeA}, coinTypeB=${coinTypeB}`
      );
    }
    
    try {
      // Get pool object
      const poolObj = txb.object(poolAddress);
      
      // Get coin objects for both tokens
      if (!this.suiService) {
        throw new Error('SuiService not available - cannot fetch coin objects');
      }
      const walletAddress = this.suiService.getAddress();
      
      Logger.info('Fetching coin objects', {
        walletAddress,
        coinTypeA,
        coinTypeB,
      });
      
      const coinObjectsA = await this.suiService.getClient().getCoins({
        owner: walletAddress,
        coinType: coinTypeA,
      });
      const coinObjectsB = await this.suiService.getClient().getCoins({
        owner: walletAddress,
        coinType: coinTypeB,
      });
      
      if (coinObjectsA.data.length === 0) {
        throw new Error(`No ${coinTypeA} coins found in wallet`);
      }
      if (coinObjectsB.data.length === 0) {
        throw new Error(`No ${coinTypeB} coins found in wallet`);
      }
      
      // Convert amounts to bigint (handling decimals)
      const amountABigInt = BigInt(amountA);
      const amountBBigInt = BigInt(amountB);
      
      // Validate amounts fit within u64 range (max: 18446744073709551615)
      const U64_MAX = BigInt('18446744073709551615');
      if (amountABigInt > U64_MAX) {
        Logger.error('Amount A exceeds u64 maximum', {
          amountA,
          amountABigInt: amountABigInt.toString(),
          u64Max: U64_MAX.toString(),
          poolAddress,
        });
        throw new Error(
          `Amount A (${amountA}) exceeds u64 maximum (18446744073709551615). ` +
          `This usually indicates a calculation error. Please check position size and token decimals.`
        );
      }
      if (amountBBigInt > U64_MAX) {
        Logger.error('Amount B exceeds u64 maximum', {
          amountB,
          amountBBigInt: amountBBigInt.toString(),
          u64Max: U64_MAX.toString(),
          poolAddress,
        });
        throw new Error(
          `Amount B (${amountB}) exceeds u64 maximum (18446744073709551615). ` +
          `This usually indicates a calculation error. Please check position size and token decimals.`
        );
      }
      
      // Prepare coin objects for the transaction
      // For SUI, we can use gas coin splitting
      let coinA: any;
      let coinB: any;
      
      // Helper function to convert BigInt to u64-safe value for splitCoins
      // The Sui SDK's splitCoins accepts BigInt directly, but we need to ensure it's within u64 range
      const toU64Safe = (value: bigint): bigint => {
        if (value > U64_MAX) {
          throw new Error(`Value ${value.toString()} exceeds u64 maximum`);
        }
        return value;
      };
      
      if (coinTypeA === '0x2::sui::SUI') {
        // Use gas coin for SUI - pass BigInt directly (SDK handles u64 serialization)
        coinA = txb.splitCoins(txb.gas, [toU64Safe(amountABigInt)]);
      } else {
        // For other coins, merge all coins first, then split
        const primaryCoinA = txb.object(coinObjectsA.data[0].coinObjectId);
        if (coinObjectsA.data.length > 1) {
          const otherCoinsA = coinObjectsA.data.slice(1).map((c: any) => txb.object(c.coinObjectId));
          txb.mergeCoins(primaryCoinA, otherCoinsA);
        }
        coinA = txb.splitCoins(primaryCoinA, [toU64Safe(amountABigInt)]);
      }
      
      if (coinTypeB === '0x2::sui::SUI') {
        // Use gas coin for SUI (if both are SUI, this won't work - but that's not a valid pool)
        coinB = txb.splitCoins(txb.gas, [toU64Safe(amountBBigInt)]);
      } else {
        // For other coins, merge all coins first, then split
        const primaryCoinB = txb.object(coinObjectsB.data[0].coinObjectId);
        if (coinObjectsB.data.length > 1) {
          const otherCoinsB = coinObjectsB.data.slice(1).map((c: any) => txb.object(c.coinObjectId));
          txb.mergeCoins(primaryCoinB, otherCoinsB);
        }
        coinB = txb.splitCoins(primaryCoinB, [toU64Safe(amountBBigInt)]);
      }
      
      // Calculate slippage sqrt price (optional parameter)
      // slippage_sqrt_price = current_sqrt_price * (1 + slippage) for upper, (1 - slippage) for lower
      // For simplicity, we'll pass None (null) and let Cetus handle slippage
      const slippageSqrtPrice = null; // Option<U256> - None
      
      // Build the Move call to open_position
      // Function signature: open_position<CoinTypeA, CoinTypeB>(
      //   pool: &Pool<CoinTypeA, CoinTypeB>,
      //   tick_lower: I32,
      //   tick_upper: I32,
      //   coin_a: Coin<CoinTypeA>,
      //   coin_b: Coin<CoinTypeB>,
      //   slippage_sqrt_price: Option<U256>,
      //   ctx: &mut TxContext
      // ) -> PositionNFT
      txb.moveCall({
        target: `${CETUS_PACKAGE}::clmm::open_position`,
        typeArguments: [coinTypeA, coinTypeB],
        arguments: [
          poolObj,
          txb.pure.u32(tickLower), // I32 as u32
          txb.pure.u32(tickUpper), // I32 as u32
          coinA,
          coinB,
          slippageSqrtPrice ? txb.pure.u256(slippageSqrtPrice) : txb.pure.option('u256', null),
        ],
      });
      
      Logger.info('Manual position transaction built successfully', {
        poolAddress,
        coinTypeA,
        coinTypeB,
        tickLower,
        tickUpper,
      });
      
      return txb;
    } catch (error: any) {
      Logger.error('Manual position transaction building failed', error);
      throw new Error(
        `Failed to create position transaction manually: ${error.message}. ` +
        `Please check wallet balances and coin types.`
      );
    }
  }

  getSDK(): CetusClmmSDK {
    return this.sdk;
  }
}


import { SuiClient } from '@mysten/sui/client';
import { Logger } from '../utils/logger';
import { retryWithBackoff } from '../utils/retry';

/**
 * Pyth Network price feed service for Sui
 * Uses Pyth's on-chain price feeds for reliable price data
 */
export class PythService {
  private client: SuiClient;
  private priceFeedIds: Map<string, string> = new Map();

  // Pyth price feed IDs for Sui mainnet
  // These are the on-chain price feed object IDs
  private readonly PYTH_PRICE_FEEDS: Record<string, string> = {
    // SUI/USD price feed
    'SUI/USD': process.env.PYTH_SUI_USD_FEED || '0x23efa1fb3d0674e68b5085a0c3e97e8d3c8c3000b8c7e3e3e3e3e3e3e3e3e3e3',
    // USDC/USD is typically 1:1, but we can use a feed if needed
    'USDC/USD': process.env.PYTH_USDC_USD_FEED || '0x23efa1fb3d0674e68b5085a0c3e97e8d3c8c3000b8c7e3e3e3e3e3e3e3e3e3e3',
  };

  constructor(suiClient: SuiClient) {
    this.client = suiClient;
    this.initializePriceFeeds();
  }

  private initializePriceFeeds(): void {
    // Map pool pairs to Pyth feed IDs
    // For pairs like SUI/USDC, we can derive from SUI/USD and USDC/USD
    this.priceFeedIds.set('SUI/USDC', 'SUI/USD'); // Will calculate ratio
    this.priceFeedIds.set('DEEP/SUI', 'DEEP/USD'); // Need DEEP/USD feed
    this.priceFeedIds.set('WAL/SUI', 'WAL/USD'); // Need WAL/USD feed
  }

  /**
   * Get price from Pyth Network price feed
   * @param feedId Pyth price feed ID (e.g., 'SUI/USD')
   * @returns Price in USD
   */
  async getPrice(feedId: string): Promise<number> {
    return retryWithBackoff(async () => {
      try {
        // Pyth price feeds on Sui are stored as objects
        // The feed ID should be the object ID of the price feed
        const feedObjectId = this.PYTH_PRICE_FEEDS[feedId];
        
        if (!feedObjectId || feedObjectId.startsWith('0x23efa')) {
          // Fallback: Use HTTP API if on-chain feed not available
          return await this.getPriceFromAPI(feedId);
        }

        // Try to fetch from on-chain
        try {
          const feedObject = await this.client.getObject({
            id: feedObjectId,
            options: {
              showContent: true,
            },
          });

          if (feedObject.data?.content && 'fields' in feedObject.data.content) {
            const fields = (feedObject.data.content as any).fields;
            // Pyth price structure: price, conf, expo
            const price = fields.price || fields.price_feed?.price;
            const expo = fields.expo || fields.price_feed?.expo || -8;
            
            if (price) {
              // Convert from integer with exponent to decimal
              return Number(price) * Math.pow(10, expo);
            }
          }
        } catch (error) {
          Logger.warn(`Failed to fetch Pyth feed ${feedId} from on-chain, using API`, error);
        }

        // Fallback to API
        return await this.getPriceFromAPI(feedId);
      } catch (error) {
        Logger.error(`Failed to get price from Pyth for ${feedId}`, error);
        throw error;
      }
    });
  }

  /**
   * Get price from Pyth HTTP API (fallback)
   */
  private async getPriceFromAPI(feedId: string): Promise<number> {
    // Map feed IDs to Pyth API feed IDs
    const apiFeedMap: Record<string, string> = {
      'SUI/USD': '0x23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744', // SUI/USD
      'USDC/USD': '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a', // USDC/USD
      'DEEP/USD': '0x...', // Need to find DEEP/USD feed ID
      'WAL/USD': '0x...', // Need to find WAL/USD feed ID
    };

    const apiFeedId = apiFeedMap[feedId];
    if (!apiFeedId || apiFeedId === '0x...') {
      throw new Error(`Pyth feed ID not configured for ${feedId}`);
    }

    // Use Pyth's HTTP API
    const response = await fetch(
      `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${apiFeedId}`
    );

    if (!response.ok) {
      throw new Error(`Pyth API error: ${response.statusText}`);
    }

    const data = await response.json() as any;
    const priceData = data.parsed?.[0] || data[0];
    
    if (!priceData || !priceData.price) {
      throw new Error(`No price data found for ${feedId}`);
    }

    // Pyth prices are in the format: price * 10^expo
    const price = priceData.price.price;
    const expo = priceData.price.expo || -8;
    
    return Number(price) * Math.pow(10, expo);
  }

  /**
   * Get price for a pool pair
   * @param poolName Pool name (e.g., 'SUI/USDC')
   * @returns Price ratio (e.g., SUI price in USDC)
   */
  async getPoolPrice(poolName: string): Promise<number> {
    try {
      if (poolName === 'SUI/USDC') {
        // Get SUI/USD and USDC/USD, then calculate ratio
        const suiPrice = await this.getPrice('SUI/USD');
        const usdcPrice = await this.getPrice('USDC/USD');
        return suiPrice / usdcPrice; // SUI per USDC
      } else if (poolName === 'DEEP/SUI') {
        // Get DEEP/USD and SUI/USD, then calculate ratio
        const deepPrice = await this.getPrice('DEEP/USD');
        const suiPrice = await this.getPrice('SUI/USD');
        return deepPrice / suiPrice; // DEEP per SUI
      } else if (poolName === 'WAL/SUI') {
        // Get WAL/USD and SUI/USD, then calculate ratio
        const walPrice = await this.getPrice('WAL/USD');
        const suiPrice = await this.getPrice('SUI/USD');
        return walPrice / suiPrice; // WAL per SUI
      } else {
        throw new Error(`Unsupported pool pair: ${poolName}`);
      }
    } catch (error) {
      Logger.error(`Failed to get pool price for ${poolName}`, error);
      throw error;
    }
  }
}


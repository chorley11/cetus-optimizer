import { CetusService, PoolInfo } from '../services/cetus';
import { PythService } from '../services/pyth';
import { PoolConfig } from '../types';
import { DatabaseService } from '../services/database';
import { Logger } from '../utils/logger';
import { isInRange, calculateRangeDistances } from '../utils/math';

export interface PriceSnapshot {
  poolAddress: string;
  price: number;
  inRange: boolean;
  distanceToLower: number;
  distanceToUpper: number;
  timestamp: Date;
}

export class PriceMonitor {
  private cetusService: CetusService;
  private pythService?: PythService;
  private db: DatabaseService;
  private priceCache: Map<string, PriceSnapshot> = new Map();
  private usePyth: boolean;

  constructor(cetusService: CetusService, db: DatabaseService, pythService?: PythService) {
    this.cetusService = cetusService;
    this.pythService = pythService;
    this.db = db;
    // Use Pyth if available, default to true (can be disabled with USE_PYTH_PRICES=false)
    this.usePyth = !!pythService && (process.env.USE_PYTH_PRICES !== 'false');
  }

  async fetchPrice(poolConfig: PoolConfig): Promise<PriceSnapshot> {
    let price: number;
    
    // Try Pyth first if enabled, otherwise use Cetus
    if (this.usePyth && this.pythService) {
      try {
        Logger.debug(`Fetching price from Pyth for ${poolConfig.name}`);
        price = await this.pythService.getPoolPrice(poolConfig.name);
        Logger.debug(`Got price from Pyth for ${poolConfig.name}: ${price}`);
      } catch (error: any) {
        // Check if error indicates feed doesn't exist (expected for DEEP/SUI, WAL/SUI)
        const isFeedNotAvailable = error.message?.includes('not available') || 
                                   error.message?.includes('does not exist') ||
                                   error.message?.includes('Bad Request');
        
        if (isFeedNotAvailable) {
          Logger.debug(`Pyth feed not available for ${poolConfig.name}, using Cetus (expected for some pools)`);
        } else {
          Logger.warn(`Pyth price fetch failed for ${poolConfig.name}, falling back to Cetus`, error);
        }
        
        // Fallback to Cetus
        try {
          price = await this.fetchPriceFromCetus(poolConfig);
        } catch (cetusError) {
          Logger.error(`Both Pyth and Cetus failed for ${poolConfig.name}`, { pythError: error, cetusError });
          throw new Error(`Failed to fetch price for ${poolConfig.name} from both Pyth and Cetus`);
        }
      }
    } else {
      // Use Cetus (original method)
      price = await this.fetchPriceFromCetus(poolConfig);
    }
    
    // Get active position to check if in range
    const position = this.db.getActivePosition(poolConfig.address);
    
    let inRange = false;
    let distanceToLower = 0;
    let distanceToUpper = 0;

    if (position) {
      inRange = isInRange(price, position.priceLower, position.priceUpper);
      const distances = calculateRangeDistances(
        price,
        position.priceLower,
        position.priceUpper
      );
      distanceToLower = distances.distanceToLower;
      distanceToUpper = distances.distanceToUpper;
    }

    const snapshot: PriceSnapshot = {
      poolAddress: poolConfig.address,
      price,
      inRange,
      distanceToLower,
      distanceToUpper,
      timestamp: new Date(),
    };

    // Cache the snapshot
    this.priceCache.set(poolConfig.address, snapshot);

    // Record in database
    this.db.recordPriceSnapshot(
      poolConfig.address,
      price,
      inRange,
      distanceToLower,
      distanceToUpper
    );

    return snapshot;
  }

  private async fetchPriceFromCetus(poolConfig: PoolConfig): Promise<number> {
    // Validate pool address before attempting to fetch
    if (!poolConfig.address || poolConfig.address.trim() === '' || poolConfig.address === '0x') {
      const envVarName = `POOL_${poolConfig.name.replace('/', '_').toUpperCase()}`;
      throw new Error(`Pool ${poolConfig.name} has invalid address: "${poolConfig.address}" - Check ${envVarName} environment variable`);
    }
    
    const poolInfo = await this.cetusService.getPoolInfo(poolConfig.address);
    return poolInfo.currentPrice;
  }

  async fetchPricesForPools(pools: PoolConfig[]): Promise<Map<string, PriceSnapshot>> {
    const snapshots = new Map<string, PriceSnapshot>();

    for (const pool of pools) {
      if (!pool.enabled) continue;

      try {
        const snapshot = await this.fetchPrice(pool);
        snapshots.set(pool.address, snapshot);
      } catch (error) {
        Logger.error(`Failed to fetch price for ${pool.name}`, error);
        // Continue with other pools even if one fails
      }
    }

    return snapshots;
  }

  getCachedPrice(poolAddress: string): PriceSnapshot | undefined {
    return this.priceCache.get(poolAddress);
  }

  getPoolInfo(poolAddress: string): Promise<PoolInfo> {
    return this.cetusService.getPoolInfo(poolAddress);
  }
}


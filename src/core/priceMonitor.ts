import { CetusService, PoolInfo } from '../services/cetus';
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
  private db: DatabaseService;
  private priceCache: Map<string, PriceSnapshot> = new Map();

  constructor(cetusService: CetusService, db: DatabaseService) {
    this.cetusService = cetusService;
    this.db = db;
  }

  async fetchPrice(poolConfig: PoolConfig): Promise<PriceSnapshot> {
    // Validate pool address before attempting to fetch
    if (!poolConfig.address || poolConfig.address.trim() === '' || poolConfig.address === '0x') {
      throw new Error(`Pool ${poolConfig.name} has invalid address: "${poolConfig.address}" - Check POOL_${poolConfig.name} environment variable`);
    }
    
    try {
      const poolInfo = await this.cetusService.getPoolInfo(poolConfig.address);
      
      // Get active position to check if in range
      const position = this.db.getActivePosition(poolConfig.address);
      
      let inRange = false;
      let distanceToLower = 0;
      let distanceToUpper = 0;

      if (position) {
        inRange = isInRange(poolInfo.currentPrice, position.priceLower, position.priceUpper);
        const distances = calculateRangeDistances(
          poolInfo.currentPrice,
          position.priceLower,
          position.priceUpper
        );
        distanceToLower = distances.distanceToLower;
        distanceToUpper = distances.distanceToUpper;
      }

      const snapshot: PriceSnapshot = {
        poolAddress: poolConfig.address,
        price: poolInfo.currentPrice,
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
        poolInfo.currentPrice,
        inRange,
        distanceToLower,
        distanceToUpper
      );

      return snapshot;
    } catch (error) {
      Logger.error(`Failed to fetch price for pool ${poolConfig.name}`, error);
      throw error;
    }
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


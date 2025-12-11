import { Transaction } from '@mysten/sui/transactions';
import { PoolConfig, Position } from '../types';
import { CetusService } from '../services/cetus';
import { SuiService } from '../services/sui';
import { DatabaseService } from '../services/database';
import { StrategyEngine } from './strategyEngine';
import { Logger } from '../utils/logger';
import { calculateSkim } from '../utils/math';

export interface RebalanceResult {
  success: boolean;
  newPositionId?: string;
  feesCollected?: { tokenA: string; tokenB: string; usd: number };
  skimAmount?: { usdc: number; sui: number };
  gasUsed?: string;
  txDigest?: string;
  error?: string;
}

export class PositionManager {
  private cetusService: CetusService;
  private suiService: SuiService;
  private db: DatabaseService;
  private strategyEngine: StrategyEngine;
  private lastRebalanceTime: Map<string, number> = new Map();

  constructor(
    cetusService: CetusService,
    suiService: SuiService,
    db: DatabaseService,
    strategyEngine: StrategyEngine
  ) {
    this.cetusService = cetusService;
    this.suiService = suiService;
    this.db = db;
    this.strategyEngine = strategyEngine;
  }

  async openPosition(
    config: PoolConfig,
    priceLower: number,
    priceUpper: number,
    currentPrice: number
  ): Promise<string> {
    try {
      // Calculate position size
      const { amountA, amountB } = this.strategyEngine.calculatePositionSize(
        config.positionSizeUsd,
        currentPrice,
        config.tokenA.decimals,
        config.tokenB.decimals
      );

      // Convert prices to ticks
      const poolInfo = await this.cetusService.getPoolInfo(config.address);
      const tickLower = this.cetusService.priceToTick(priceLower, poolInfo.tickSpacing);
      const tickUpper = this.cetusService.priceToTick(priceUpper, poolInfo.tickSpacing);

      // Create position transaction
      const txb = await this.cetusService.createPositionTx(
        config.address,
        tickLower,
        tickUpper,
        amountA,
        amountB,
        config.maxSlippageBps / 100
      );

      // Execute transaction
      const txDigest = await this.suiService.executeTransaction(txb);

      // Get position ID from transaction result
      // In production, parse the transaction result to get position ID
      const positionId = await this.getPositionIdFromTx(txDigest);

      // Record position in database
      const positionIdNum = this.db.createPosition({
        poolAddress: config.address,
        positionId,
        tickLower,
        tickUpper,
        priceLower,
        priceUpper,
        liquidity: '0', // Will be updated when we fetch position details
        amountA,
        amountB,
        entryPrice: currentPrice,
        entryValueUsd: config.positionSizeUsd,
        status: 'active',
      });

      Logger.info(`Position opened`, {
        pool: config.name,
        positionId,
        range: { lower: priceLower, upper: priceUpper },
        txDigest,
      });

      return positionId;
    } catch (error) {
      Logger.error(`Failed to open position for ${config.name}`, error);
      throw error;
    }
  }

  async closePosition(
    config: PoolConfig,
    position: Position,
    collectFees: boolean = true
  ): Promise<{ feesCollected: { tokenA: string; tokenB: string; usd: number }; gasUsed: string; txDigest: string }> {
    try {
      // Collect fees first if needed
      let feesCollected = { tokenA: '0', tokenB: '0', usd: 0 };
      
      if (collectFees) {
        const feeTxb = await this.cetusService.collectFeesTx(position.positionId);
        const feeTxDigest = await this.suiService.executeTransaction(feeTxb);
        
        // In production, parse transaction to get actual fee amounts
        // For now, estimate based on position value
        feesCollected = {
          tokenA: '0',
          tokenB: '0',
          usd: parseFloat(position.entryValueUsd.toString()) * 0.01, // Estimate 1% fees
        };
      }

      // Close position
      const closeTxb = await this.cetusService.closePositionTx(position.positionId, collectFees);
      const txDigest = await this.suiService.executeTransaction(closeTxb);

      // Mark position as closed in database
      this.db.closePosition(position.id, 'rebalance');

      Logger.info(`Position closed`, {
        pool: config.name,
        positionId: position.positionId,
        feesCollected: feesCollected.usd,
        txDigest,
      });

      return {
        feesCollected,
        gasUsed: '0.002', // Estimate - in production, parse from transaction
        txDigest,
      };
    } catch (error) {
      Logger.error(`Failed to close position for ${config.name}`, error);
      throw error;
    }
  }

  async rebalancePosition(
    config: PoolConfig,
    position: Position,
    newRange: { lower: number; upper: number },
    currentPrice: number,
    triggerReason: 'upper_breach' | 'lower_breach'
  ): Promise<RebalanceResult> {
    try {
      // Check minimum rebalance interval
      const lastRebalance = this.lastRebalanceTime.get(config.address);
      const now = Date.now();
      if (lastRebalance && (now - lastRebalance) < config.minRebalanceIntervalMs) {
        Logger.warn(`Rebalance skipped - too soon after last rebalance`, {
          pool: config.name,
          timeSinceLastRebalance: now - lastRebalance,
        });
        return { success: false, error: 'Rebalance interval not met' };
      }

      // Close old position and collect fees
      const closeResult = await this.closePosition(config, position, true);

      // Calculate current position value (simplified)
      const currentValue = parseFloat(position.entryValueUsd.toString()) + closeResult.feesCollected.usd;

      // Calculate skim amount
      const skimAmount = calculateSkim(
        parseFloat(position.entryValueUsd.toString()),
        currentValue,
        closeResult.feesCollected.usd,
        0.10 // 10% skim
      );

      // Open new position with remaining capital
      const newPositionId = await this.openPosition(
        config,
        newRange.lower,
        newRange.upper,
        currentPrice
      );

      // Update last rebalance time
      this.lastRebalanceTime.set(config.address, now);

      // Record rebalance in database
      const newPosition = this.db.getActivePosition(config.address);
      if (!newPosition) {
        throw new Error('Failed to retrieve new position after creation');
      }

      const rebalanceId = this.db.createRebalance({
        poolAddress: config.address,
        oldPositionId: position.id,
        newPositionId: newPosition.id,
        triggerPrice: currentPrice,
        triggerReason,
        oldRange: { lower: position.priceLower, upper: position.priceUpper },
        newRange,
        feesCollected: closeResult.feesCollected,
        skimAmount,
        gasUsed: closeResult.gasUsed,
        txDigest: closeResult.txDigest,
      });

      Logger.info(`Rebalance completed`, {
        pool: config.name,
        rebalanceId,
        oldPositionId: position.id,
        newPositionId: newPosition.id,
      });

      return {
        success: true,
        newPositionId,
        feesCollected: closeResult.feesCollected,
        skimAmount,
        gasUsed: closeResult.gasUsed,
        txDigest: closeResult.txDigest,
      };
    } catch (error) {
      Logger.error(`Rebalance failed for ${config.name}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async getPositionIdFromTx(txDigest: string): Promise<string> {
    // In production, fetch transaction details and parse position ID
    // For now, return a placeholder
    // This would require parsing the transaction result from Sui
    return `position_${txDigest.slice(0, 16)}`;
  }
}


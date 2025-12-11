import { Transaction } from '@mysten/sui/transactions';
import { PoolConfig, Position } from '../types';
import { CetusService } from '../services/cetus';
import { SuiService } from '../services/sui';
import { DatabaseService } from '../services/database';
import { StrategyEngine } from './strategyEngine';
import { Logger } from '../utils/logger';
import { calculateSkim } from '../utils/math';
import { parseTransactionResult, parsePositionIdFromTx, parseGasUsedFromTx } from '../utils/transactionParser';

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
        priceLower,
        priceUpper,
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

      // Simulate transaction first to check for errors
      try {
        await this.suiService.simulateTransaction(txb);
      } catch (error) {
        Logger.error('Transaction simulation failed', error);
        throw new Error(`Transaction simulation failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Execute transaction and get full result
      const txResult = await this.suiService.executeTransactionWithResult(txb);
      const txDigest = txResult.digest;

      // Parse transaction result to get position ID
      const parsed = parseTransactionResult(
        txResult,
        config.address,
        config.tokenA.address,
        config.tokenB.address
      );

      const positionId = parsed.positionId || await this.getPositionIdFromTx(txDigest);

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
      let feeTxDigest: string | undefined;
      
      if (collectFees) {
        const feeTxb = await this.cetusService.collectFeesTx(position.positionId);
        
        // Simulate fee collection
        try {
          await this.suiService.simulateTransaction(feeTxb);
        } catch (error) {
          Logger.warn('Fee collection simulation failed, continuing anyway', error);
        }
        
        const feeTxResult = await this.suiService.executeTransactionWithResult(feeTxb);
        feeTxDigest = feeTxResult.digest;
        
        // Parse actual fee amounts from transaction
        const feeParsed = parseTransactionResult(
          feeTxResult,
          config.address,
          config.tokenA.address,
          config.tokenB.address
        );
        
        feesCollected = feeParsed.feesCollected || {
          tokenA: '0',
          tokenB: '0',
          usd: parseFloat(position.entryValueUsd.toString()) * 0.01, // Fallback estimate
        };
      }

      // Close position
      const closeTxb = await this.cetusService.closePositionTx(position.positionId, collectFees);
      
      // Simulate close transaction
      try {
        await this.suiService.simulateTransaction(closeTxb);
      } catch (error) {
        Logger.error('Close position simulation failed', error);
        throw error;
      }
      
      const closeTxResult = await this.suiService.executeTransactionWithResult(closeTxb);
      const txDigest = closeTxResult.digest;
      
      // Parse gas used from transaction
      const gasParsed = parseGasUsedFromTx(closeTxResult);
      const gasUsed = gasParsed.gasUsed;

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
        gasUsed,
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
    try {
      // Fetch transaction details
      const txResult = await this.suiService.getTransactionResult(txDigest);
      
      // Try to parse position ID from transaction
      // This is a fallback if position ID wasn't found in initial parse
      const positionId = parsePositionIdFromTx(txResult, '');
      
      if (positionId) {
        return positionId;
      }
      
      // Last resort: generate a temporary ID based on transaction
      Logger.warn('Could not extract position ID from transaction, using fallback', {
        txDigest,
      });
      return `position_${txDigest.slice(0, 16)}`;
    } catch (error) {
      Logger.error('Failed to get position ID from transaction', error);
      return `position_${txDigest.slice(0, 16)}`;
    }
  }
}


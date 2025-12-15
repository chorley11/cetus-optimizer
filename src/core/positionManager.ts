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
  private openingPositions: Set<string> = new Set(); // Track pools currently opening positions

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
    currentPrice: number,
    zapWithSui: boolean = true  // New parameter: zap in with SUI only
  ): Promise<string> {
    // Prevent concurrent position opening for the same pool
    if (this.openingPositions.has(config.address)) {
      Logger.warn(`Position opening already in progress for ${config.name}, skipping duplicate request`);
      // Wait a bit and check if position was created
      await new Promise(resolve => setTimeout(resolve, 1000));
      const existingPosition = this.db.getActivePosition(config.address);
      if (existingPosition) {
        return existingPosition.positionId;
      }
      throw new Error(`Position opening already in progress for ${config.name}`);
    }
    
    this.openingPositions.add(config.address);
    
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

      // If zap-in mode and SUI is one of the tokens, swap first
      if (zapWithSui) {
        const suiAddress = "0x2::sui::SUI";
        const isSuiTokenA = config.tokenA.address === suiAddress;
        const isSuiTokenB = config.tokenB.address === suiAddress;
        
        if (isSuiTokenA || isSuiTokenB) {
          Logger.info(`Zap-in mode: Swapping SUI to get both tokens`, {
            pool: config.name,
            tokenA: config.tokenA.symbol,
            tokenB: config.tokenB.symbol,
          });
          
          // amountA and amountB are already in smallest units (from calculatePositionAmounts)
          // Calculate swap amount: we need to swap enough SUI to get amountB of tokenB
          // If SUI is tokenA: amountA is in MIST (smallest SUI), amountB is in smallest tokenB units
          // If SUI is tokenB: amountA is in smallest tokenA units, amountB is in MIST
          
          let swapAmountSui: string;
          const tokenIn = suiAddress;
          const tokenOut = isSuiTokenA ? config.tokenB.address : config.tokenA.address;
          
          if (isSuiTokenA) {
            // SUI is tokenA: we have amountA in MIST, need amountB in tokenB units
            // To get amountB of tokenB, we need to swap: (amountB / currentPrice) in SUI terms
            // But amountB is in smallest tokenB units, so convert to human-readable first
            const amountBHuman = parseFloat(amountB) / Math.pow(10, config.tokenB.decimals);
            const suiNeededHuman = amountBHuman / currentPrice; // SUI needed (human-readable)
            swapAmountSui = String(Math.floor(suiNeededHuman * 1e9)); // Convert to MIST
          } else {
            // SUI is tokenB: we have amountB in MIST, need amountA in tokenA units
            // To get amountA of tokenA, we need to swap: (amountA * currentPrice) in SUI terms
            const amountAHuman = parseFloat(amountA) / Math.pow(10, config.tokenA.decimals);
            const suiNeededHuman = amountAHuman * currentPrice; // SUI needed (human-readable)
            swapAmountSui = String(Math.floor(suiNeededHuman * 1e9)); // Convert to MIST
          }
          
          // Perform swap first
          try {
            const swapTx = await this.cetusService.createSwapTx(
              config.address,
              tokenIn,
              tokenOut,
              swapAmountSui, // Already in smallest units (MIST)
              config.maxSlippageBps / 100
            );
            
            // Simulate swap
            await this.suiService.simulateTransaction(swapTx);
            
            // Execute swap
            const swapResult = await this.suiService.executeTransactionWithResult(swapTx);
            Logger.info(`Swap completed for zap-in`, {
              pool: config.name,
              txDigest: swapResult.digest,
            });
            
            // Small delay to ensure swap is processed
            await new Promise(resolve => setTimeout(resolve, 2000));
          } catch (error) {
            Logger.warn(`Swap failed, attempting direct position creation`, error);
            // Fall through to direct position creation
          }
        }
      }

      // Create position transaction
      const txb = await this.cetusService.createPositionTx(
        config.address,
        tickLower,
        tickUpper,
        amountA,
        amountB,
        config.maxSlippageBps / 100,
        config.tokenA.address,
        config.tokenB.address
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

      let positionId = parsed.positionId;
      
      // If position ID not found in parsed result, try to get it from transaction
      if (!positionId) {
        positionId = await this.getPositionIdFromTx(txDigest);
      }
      
      // Validate position ID was found
      if (!positionId || positionId.startsWith('position_')) {
        // Fallback ID indicates we couldn't extract real position ID
        Logger.error(`Failed to extract position ID from transaction ${txDigest}`, {
          pool: config.name,
          parsedPositionId: parsed.positionId,
          fallbackPositionId: positionId,
        });
        // Don't record in database if we don't have a real position ID
        // The transaction might have succeeded but we can't track the position
        throw new Error(`Failed to extract position ID from transaction. Transaction digest: ${txDigest}. Position may have been created but cannot be tracked.`);
      }

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
        zapMode: zapWithSui,
        txDigest,
      });

      return positionId;
    } catch (error) {
      Logger.error(`Failed to open position for ${config.name}`, error);
      throw error;
    } finally {
      // Always remove from opening set, even on error
      this.openingPositions.delete(config.address);
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

      // Close old position and collect fees first (we need the capital to open new position)
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

      // CRITICAL: Open new position immediately after closing old one
      // If this fails, we'll be left without a position - this is a critical error
      let newPositionId: string;
      let newPosition: Position | null = null;
      
      try {
        // Open new position with remaining capital
        newPositionId = await this.openPosition(
          config,
          newRange.lower,
          newRange.upper,
          currentPrice
        );
        
        // Verify new position was created with retry logic
        newPosition = this.db.getActivePosition(config.address);
        if (!newPosition) {
          for (let retry = 0; retry < 3; retry++) {
            await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, retry)));
            newPosition = this.db.getActivePosition(config.address);
            if (newPosition) break;
          }
        }
        
        if (!newPosition) {
          // CRITICAL: Old position is closed, new position failed to create
          // This is a critical error - we have no active position
          const errorMsg = `CRITICAL: Failed to create new position after closing old position. Pool ${config.name} is now without an active position. Manual intervention required.`;
          Logger.error(errorMsg, { oldPositionId: position.positionId, newPositionId });
          throw new Error(errorMsg);
        }
      } catch (openError) {
        // Re-throw to be caught by outer catch block
        throw openError;
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

      // Update last rebalance time ONLY after successful rebalance completion
      this.lastRebalanceTime.set(config.address, now);

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


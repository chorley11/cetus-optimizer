import { PoolConfig, Position } from '../types';
import { PriceSnapshot } from './priceMonitor';
import { shouldRebalance, calculateNewRange } from '../utils/math';
import { Logger } from '../utils/logger';

export interface RebalanceDecision {
  shouldRebalance: boolean;
  triggerReason?: 'upper_breach' | 'lower_breach';
  newRange?: { lower: number; upper: number };
}

export class StrategyEngine {
  shouldRebalancePosition(
    snapshot: PriceSnapshot,
    position: Position,
    config: PoolConfig
  ): RebalanceDecision {
    if (!position) {
      return { shouldRebalance: false };
    }

    const threshold = config.rebalanceThresholdPct / 100;
    const needsRebalance = shouldRebalance(
      snapshot.price,
      position.priceLower,
      position.priceUpper,
      threshold
    );

    if (!needsRebalance) {
      return { shouldRebalance: false };
    }

    // Determine trigger reason
    const rangeWidth = position.priceUpper - position.priceLower;
    const distanceToLower = snapshot.price - position.priceLower;
    const distanceToUpper = position.priceUpper - snapshot.price;
    
    const triggerReason = distanceToLower < distanceToUpper 
      ? 'lower_breach' 
      : 'upper_breach';

    // Calculate new range
    const newRange = calculateNewRange(
      snapshot.price,
      config.rangeLowerBps,
      config.rangeUpperBps
    );

    Logger.info(`Rebalance triggered for position`, {
      pool: config.name,
      triggerReason,
      currentPrice: snapshot.price,
      oldRange: { lower: position.priceLower, upper: position.priceUpper },
      newRange,
    });

    return {
      shouldRebalance: true,
      triggerReason,
      newRange,
    };
  }

  calculatePositionSize(
    targetUsd: number,
    currentPrice: number,
    priceLower: number,
    priceUpper: number,
    tokenADecimals: number,
    tokenBDecimals: number
  ): { amountA: string; amountB: string } {
    // Import liquidity math utility
    const { calculatePositionAmounts } = require('../utils/liquidityMath');
    
    return calculatePositionAmounts(
      targetUsd,
      currentPrice,
      priceLower,
      priceUpper,
      tokenADecimals,
      tokenBDecimals
    );
  }
}


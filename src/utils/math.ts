import Decimal from 'decimal.js';

/**
 * Calculate new range bounds based on current price and range configuration
 */
export function calculateNewRange(
  currentPrice: number,
  rangeLowerBps: number,
  rangeUpperBps: number
): { lower: number; upper: number } {
  const lowerMultiplier = new Decimal(1).minus(new Decimal(rangeLowerBps).div(10000));
  const upperMultiplier = new Decimal(1).plus(new Decimal(rangeUpperBps).div(10000));
  
  return {
    lower: new Decimal(currentPrice).mul(lowerMultiplier).toNumber(),
    upper: new Decimal(currentPrice).mul(upperMultiplier).toNumber(),
  };
}

/**
 * Check if rebalance should be triggered
 * Returns true if price is within threshold% of either range edge
 */
export function shouldRebalance(
  currentPrice: number,
  lowerBound: number,
  upperBound: number,
  threshold: number = 0.80
): boolean {
  const rangeWidth = upperBound - lowerBound;
  const distanceToLower = currentPrice - lowerBound;
  const distanceToUpper = upperBound - currentPrice;
  
  const percentToLower = distanceToLower / rangeWidth;
  const percentToUpper = distanceToUpper / rangeWidth;
  
  // Trigger if price is within (1 - threshold) of either edge
  // threshold = 0.80 means trigger when within 20% of edge
  return percentToLower < (1 - threshold) || percentToUpper < (1 - threshold);
}

/**
 * Calculate distance percentages from current price to range bounds
 */
export function calculateRangeDistances(
  currentPrice: number,
  lowerBound: number,
  upperBound: number
): { distanceToLower: number; distanceToUpper: number } {
  const rangeWidth = upperBound - lowerBound;
  const distanceToLower = currentPrice - lowerBound;
  const distanceToUpper = upperBound - currentPrice;
  
  return {
    distanceToLower: (distanceToLower / rangeWidth) * 100,
    distanceToUpper: (distanceToUpper / rangeWidth) * 100,
  };
}

/**
 * Check if price is within range
 */
export function isInRange(
  currentPrice: number,
  lowerBound: number,
  upperBound: number
): boolean {
  return currentPrice >= lowerBound && currentPrice <= upperBound;
}

/**
 * Calculate profit skim amounts
 */
export function calculateSkim(
  previousPositionValue: number,
  currentPositionValue: number,
  feesCollected: number,
  skimPercentage: number = 0.10
): { usdc: number; sui: number } {
  const totalProfit = (currentPositionValue - previousPositionValue) + feesCollected;
  
  if (totalProfit <= 0) {
    return { usdc: 0, sui: 0 };
  }
  
  const skimAmount = totalProfit * skimPercentage;
  
  // Prioritize USDC for stablecoin accumulation goal
  return {
    usdc: skimAmount * 0.7,  // 70% as USDC
    sui: skimAmount * 0.3,   // 30% as SUI (or native token)
  };
}

/**
 * Convert basis points to decimal
 */
export function bpsToDecimal(bps: number): number {
  return bps / 10000;
}

/**
 * Convert decimal to basis points
 */
export function decimalToBps(decimal: number): number {
  return decimal * 10000;
}


import Decimal from 'decimal.js';

/**
 * Calculate liquidity for a given price range
 * Based on Uniswap V3 / Cetus CLMM formulas
 */
export function calculateLiquidity(
  amountA: string,
  amountB: string,
  priceLower: number,
  priceUpper: number,
  currentPrice: number
): { liquidity: string; amountA: string; amountB: string } {
  const amountADec = new Decimal(amountA);
  const amountBDec = new Decimal(amountB);
  const priceLowerDec = new Decimal(priceLower);
  const priceUpperDec = new Decimal(priceUpper);
  const currentPriceDec = new Decimal(currentPrice);

  // Calculate sqrt prices
  const sqrtPriceLower = priceLowerDec.sqrt();
  const sqrtPriceUpper = priceUpperDec.sqrt();
  const sqrtPriceCurrent = currentPriceDec.sqrt();

  let liquidity: Decimal;
  let finalAmountA: Decimal;
  let finalAmountB: Decimal;

  if (currentPrice < priceLower) {
    // Price is below range - all in token A
    liquidity = amountADec.mul(sqrtPriceLower).mul(sqrtPriceUpper).div(sqrtPriceUpper.minus(sqrtPriceLower));
    finalAmountA = amountADec;
    finalAmountB = new Decimal(0);
  } else if (currentPrice > priceUpper) {
    // Price is above range - all in token B
    liquidity = amountBDec.div(sqrtPriceUpper.minus(sqrtPriceLower));
    finalAmountA = new Decimal(0);
    finalAmountB = amountBDec;
  } else {
    // Price is in range - calculate optimal amounts
    const liquidity0 = amountADec.mul(sqrtPriceCurrent).mul(sqrtPriceUpper).div(sqrtPriceUpper.minus(sqrtPriceCurrent));
    const liquidity1 = amountBDec.div(sqrtPriceCurrent.minus(sqrtPriceLower));

    liquidity = Decimal.min(liquidity0, liquidity1);

    // Calculate actual amounts needed
    finalAmountA = liquidity.mul(sqrtPriceUpper.minus(sqrtPriceCurrent)).div(sqrtPriceCurrent.mul(sqrtPriceUpper));
    finalAmountB = liquidity.mul(sqrtPriceCurrent.minus(sqrtPriceLower));
  }

  return {
    liquidity: liquidity.toFixed(0),
    amountA: finalAmountA.toFixed(0),
    amountB: finalAmountB.toFixed(0),
  };
}

/**
 * Calculate position size for a given USD value
 * Returns optimal amounts of token A and token B
 */
export function calculatePositionAmounts(
  targetUsd: number,
  currentPrice: number,
  priceLower: number,
  priceUpper: number,
  tokenADecimals: number,
  tokenBDecimals: number
): { amountA: string; amountB: string } {
  const targetUsdDec = new Decimal(targetUsd);
  const currentPriceDec = new Decimal(currentPrice);
  const priceLowerDec = new Decimal(priceLower);
  const priceUpperDec = new Decimal(priceUpper);

  // Calculate sqrt prices
  const sqrtPriceLower = priceLowerDec.sqrt();
  const sqrtPriceUpper = priceUpperDec.sqrt();
  const sqrtPriceCurrent = currentPriceDec.sqrt();

  // Calculate liquidity needed
  const liquidity = targetUsdDec.div(sqrtPriceUpper.minus(sqrtPriceLower));

  // Calculate amounts
  const amountA = liquidity.mul(sqrtPriceUpper.minus(sqrtPriceCurrent)).div(sqrtPriceCurrent.mul(sqrtPriceUpper));
  const amountB = liquidity.mul(sqrtPriceCurrent.minus(sqrtPriceLower));

  // Convert to proper decimals
  const amountAWithDecimals = amountA.mul(new Decimal(10).pow(tokenADecimals));
  const amountBWithDecimals = amountB.mul(new Decimal(10).pow(tokenBDecimals));

  // Validate amounts are reasonable (check if they exceed u64 max: 18446744073709551615)
  const U64_MAX = new Decimal('18446744073709551615');
  const amountAStr = amountAWithDecimals.toFixed(0);
  const amountBStr = amountBWithDecimals.toFixed(0);
  
  if (amountAWithDecimals.gt(U64_MAX)) {
    throw new Error(
      `Calculated amount A (${amountAStr}) exceeds u64 maximum. ` +
      `This suggests a calculation error. ` +
      `Inputs: targetUsd=${targetUsd}, currentPrice=${currentPrice}, ` +
      `priceLower=${priceLower}, priceUpper=${priceUpper}, tokenADecimals=${tokenADecimals}`
    );
  }
  
  if (amountBWithDecimals.gt(U64_MAX)) {
    throw new Error(
      `Calculated amount B (${amountBStr}) exceeds u64 maximum. ` +
      `This suggests a calculation error. ` +
      `Inputs: targetUsd=${targetUsd}, currentPrice=${currentPrice}, ` +
      `priceLower=${priceLower}, priceUpper=${priceUpper}, tokenBDecimals=${tokenBDecimals}`
    );
  }

  return {
    amountA: amountAStr,
    amountB: amountBStr,
  };
}

/**
 * Calculate current position value in USD
 */
export function calculatePositionValue(
  amountA: string,
  amountB: string,
  currentPrice: number,
  tokenADecimals: number,
  tokenBDecimals: number
): number {
  const amountADec = new Decimal(amountA).div(new Decimal(10).pow(tokenADecimals));
  const amountBDec = new Decimal(amountB).div(new Decimal(10).pow(tokenBDecimals));

  // Assuming tokenB is USDC (or convert SUI to USD)
  const valueA = amountADec.mul(currentPrice);
  const valueB = amountBDec;

  return valueA.plus(valueB).toNumber();
}


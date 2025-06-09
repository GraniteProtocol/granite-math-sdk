/**
 * Daily Caps Module
 * 
 * It helps compute the bucket value and assess whether users can execute the related action or not.
 */

/**
 * Calculates the bucket value as of now
 * @param capFactor - The capacity factor as a scaled decimal (0.05 for 5%)
 * @param currentCapValue - The current value of the bucket
 * @param totalLiquidity - The total token amount in the state contract
 * @param timeDelta - Time elapsed since last update in seconds
 * @param resetTime - Time period for full bucket reset in seconds (usually a day)
 * @returns The new bucket value, capped at maximum capacity
 */
export function computeBucketValue(capFactor: number, currentCapValue: number, totalLiquidity: number, timeDelta: number, resetTime: number) {
  const maxBucketValue = totalLiquidity * capFactor;
  const refillAmount = timeDelta > resetTime ? maxBucketValue : (maxBucketValue * timeDelta) / resetTime;
  return Math.min(maxBucketValue, refillAmount + currentCapValue);
}

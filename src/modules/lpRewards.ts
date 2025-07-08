/**
 * LP (Liquidity Provider) Rewards Module
 *
 * This module provides utility functions to compute the
 * due incentives for initial liquidity suppliers to Granite
 */

import { secondsInAYear } from "../constants";
import { Epoch } from "../types";

/**
 * Calculates the actual APR based on epoch and deposit amount
 * @param totalLpShares - Total LP shares in the market
 * @param userLpShares - Amount of user deposited assets in shares terms
 * @param epoch - The current epoch
 * @returns The actual APR scaled as a decimal (e.g., 0.05 for 5% APR)
 */
export function calculateLpRewardApy(
  totalLpShares: number,
  userLpShares: number,
  epoch: Epoch,
): number {
  if (userLpShares <= 0)
    throw new Error("User LP shares amount must be positive");
  const shareRatio = userLpShares / totalLpShares;
  const perSecondRewards =
    epoch.totalRewards / (epoch.endTimestamp - epoch.startTimestamp);
  const userPerSecondRewards = shareRatio * perSecondRewards;
  return (userPerSecondRewards * secondsInAYear) / userLpShares;
}

/**
 * Estimates future rewards based on current LP share and APR
 * @param depositAmount - Amount of tokens deposited
 * @param apr - Annual Percentage Rate as a decimal
 * @param durationInSeconds - Duration for which to estimate rewards
 * @returns Estimated rewards for the given period
 */
export function estimatedRewards(
  depositAmount: number,
  apr: number,
  durationInSeconds: number,
): number {
  if (depositAmount <= 0) throw new Error("Deposit amount must be positive");
  if (apr < 0) throw new Error("APR cannot be negative");
  if (durationInSeconds <= 0) throw new Error("Duration must be positive");

  return depositAmount * apr * (durationInSeconds / secondsInAYear);
}

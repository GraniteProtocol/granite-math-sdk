/**
 * LP (Liquidity Provider) Rewards Module
 *
 * This module provides utility functions to compute the
 * due incentives for initial liquidity suppliers to Granite
 */

import { secondsInAYear } from "../constants";
import { Epoch, Snapshot } from "../types";

/**
 * Calculates the total rewards for the current epoch for a given LP
 * @param epoch - Current epoch data
 * @param snapshots - Array of snapshots for the current epoch
 * @returns The total rewards for the LP
 */
export function earnedRewards(epoch: Epoch, snapshots: Snapshot[]): number {
  if (snapshots.length < 2)
    throw new Error("Insufficient data to compute rewards");

  const epochDuration = epoch.endTimestamp - epoch.startTimestamp;
  if (epochDuration == 0) throw new Error("Invalid epoch duration");

  let totalEarnedRewards = 0;
  for (let i = 1; i < snapshots.length; i++) {
    const prevSnapshot = snapshots[i - 1];
    const snapshot = snapshots[i];

    const percentOfEpoch =
      (snapshot.timestamp - prevSnapshot.timestamp) / epochDuration;

    const percentOfLpShares = snapshot.userLpShares / snapshot.totalLpShares;

    totalEarnedRewards +=
      percentOfEpoch * percentOfLpShares * epoch.totalRewards;
  }

  return totalEarnedRewards;
}

/**
 * Calculates the total rewards for the current epoch for all LPs
 * @param epoch - Current epoch data
 * @returns The total rewards for all of the LPs
 */
export function totalLpRewards(epoch: Epoch): number {
  const epochDuration = epoch.endTimestamp - epoch.startTimestamp;
  if (epochDuration == 0) throw new Error("Invalid epoch duration");

  return epoch.targetAPR * (epochDuration / secondsInAYear) * epoch.cap;
}

/**
 * Calculates the actual APR based on rewards and deposit amount
 * @param rewards - Total rewards earned
 * @param depositAmount - Amount of tokens deposited
 * @param timeInSeconds - Time period in seconds
 * @returns The actual APR scaled as a decimal (e.g., 0.05 for 5% APR)
 */
export function calculateApr(
  rewards: number,
  depositAmount: number,
  timeInSeconds: number,
): number {
  if (depositAmount <= 0) throw new Error("Deposit amount must be positive");
  if (timeInSeconds <= 0) throw new Error("Time period must be positive");

  return (rewards / depositAmount) * (secondsInAYear / timeInSeconds);
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

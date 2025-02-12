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

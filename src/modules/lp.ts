/**
 * LP (Liquidity Provider) Module
 *
 * This module handles liquidity provider-related calculations including:
 * - Converting between LP assets and shares
 * - APY calculations for liquidity providers
 * - Total earnings calculations
 *
 * The module uses share-based accounting to track LP positions,
 * allowing for automatic interest distribution through share price appreciation.
 */

import { InterestRateParams } from "../types";
import { secondsInAYear } from "../constants";
import { annualizedAPR, compoundedInterest } from "./borrow";

/**
 * Converts LP assets to shares based on the current share price
 * @param assets - Amount of assets to convert to shares
 * @param totalShares - Total LP shares in the protocol
 * @param totalAssets - Total assets in the protocol
 * @param openInterest - Total outstanding loans
 * @param protocolReservePercentage - Percentage of interest that goes to protocol reserves
 * @param irParams - Interest rate parameters
 * @param timeDelta - Time elapsed since last interest accrual
 * @returns The equivalent amount of LP shares
 */
export function convertLpAssetsToShares(
  assets: number,
  totalShares: number,
  totalAssets: number,
  openInterest: number,
  protocolReservePercentage: number,
  irParams: InterestRateParams,
  timeDelta: number
): number {
  if (totalAssets == 0) return 0;

  const corretedOpenInterest = compoundedInterest(
    openInterest,
    openInterest,
    totalAssets,
    irParams,
    timeDelta
  );
  const accruedInterest =
    corretedOpenInterest * (1 - protocolReservePercentage);

  return (assets * totalShares) / (accruedInterest + totalAssets);
}

/**
 * Converts LP shares to assets based on the current share price
 * @param shares - Amount of shares to convert to assets
 * @param totalShares - Total LP shares in the protocol
 * @param totalAssets - Total assets in the protocol
 * @param openInterest - Total outstanding loans
 * @param protocolReservePercentage - Percentage of interest that goes to protocol reserves
 * @param irParams - Interest rate parameters
 * @param timeDelta - Time elapsed since last interest accrual
 * @returns The equivalent amount of assets
 */
export function convertLpSharesToAssets(
  shares: number,
  totalShares: number,
  totalAssets: number,
  openInterest: number,
  protocolReservePercentage: number,
  irParams: InterestRateParams,
  timeDelta: number
): number {
  if (totalShares == 0) return 0;

  const corretedOpenInterest = compoundedInterest(
    openInterest,
    openInterest,
    totalAssets,
    irParams,
    timeDelta
  );
  const accruedInterest =
    corretedOpenInterest * (1 - protocolReservePercentage);

  return (shares * (accruedInterest + totalAssets)) / totalShares;
}

/**
 * Calculates the Annual Percentage Yield (APY) for liquidity providers
 * @param ur - Current utilization rate
 * @param irParams - Interest rate parameters
 * @param protocolReservePercentage - Percentage of interest that goes to protocol reserves
 * @returns The APY for liquidity providers
 */
export function calculateLpAPY(
  ur: number,
  irParams: InterestRateParams,
  protocolReservePercentage: number
) {
  if (ur == 0) return 0;
  else {
    const lpAPR =
      annualizedAPR(ur, irParams) * (1 - protocolReservePercentage) * ur;
    return (1 + lpAPR / secondsInAYear) ** secondsInAYear - 1;
  }
}

/**
 * Computes the total earnings for a liquidity provider
 * @param shares - Amount of LP shares
 * @param totalShares - Total LP shares in the protocol
 * @param totalAssets - Total assets in the protocol
 * @param openInterest - Total outstanding loans
 * @param protocolReservePercentage - Percentage of interest that goes to protocol reserves
 * @param irParams - Interest rate parameters
 * @param reserveBalance - Protocol's reserve balance
 * @param timeDelta - Time elapsed since last interest accrual
 * @returns The total earnings in asset terms
 */
export function computeTotalEarning(
  shares: number,
  totalShares: number,
  totalAssets: number,
  openInterest: number,
  protocolReservePercentage: number,
  irParams: InterestRateParams,
  reserveBalance: number,
  timeDelta: number
): number {
  return Math.max(
    0,
    convertLpSharesToAssets(
      shares,
      totalShares,
      totalAssets,
      openInterest,
      protocolReservePercentage,
      irParams,
      timeDelta
    ) - reserveBalance
  );
}

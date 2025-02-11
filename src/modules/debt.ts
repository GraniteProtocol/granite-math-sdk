/**
 * Debt Module
 *
 * This module handles debt-related calculations and conversions:
 * - Converting between debt assets and shares
 * - Handling interest accrual in debt calculations
 * - Managing protocol reserve percentages
 *
 * The module uses share-based accounting to track user debt positions,
 * allowing for automatic interest accrual through share price appreciation.
 */

import { InterestRateParams } from "../types";
import { secondsInAYear } from "../constants";
import { compoundedInterest } from "./borrow";

/**
 * Converts debt assets to shares based on the current share price
 * @param debtAssets - Amount of debt in asset terms to convert to shares
 * @param totalDebtShares - Total debt shares in the protocol
 * @param totalAssets - Total assets in the protocol
 * @param openInterest - Total outstanding loans
 * @param protocolReservePercentage - Percentage of interest that goes to protocol reserves
 * @param irParams - Interest rate parameters
 * @param timeDelta - Time elapsed since last interest accrual
 * @returns The equivalent amount of debt shares
 * @example
 * // For a protocol with 1000 total shares, 2000 total assets, and 10% reserve
 * convertDebtAssetsToShares(100, 1000, 2000, 1000, 0.1, irParams, 3600)
 */
export function convertDebtAssetsToShares(
  debtAssets: number,
  totalDebtShares: number,
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

  return (debtAssets * totalDebtShares) / (accruedInterest + openInterest);
}

/**
 * Converts debt shares to assets based on the current share price
 * @param debtShares - Amount of debt shares to convert to assets
 * @param openInterest - Total outstanding loans
 * @param totalDebtShares - Total debt shares in the protocol
 * @param totalAssets - Total assets in the protocol
 * @param irParams - Interest rate parameters
 * @param timeDelta - Time elapsed since last interest accrual
 * @returns The equivalent amount of debt in asset terms
 */
export function convertDebtSharesToAssets(
  debtShares: number,
  openInterest: number,
  totalDebtShares: number,
  totalAssets: number,
  irParams: InterestRateParams,
  timeDelta: number
): number {
  if (totalDebtShares == 0) return 0;

  const accruedInterest = compoundedInterest(
    openInterest,
    openInterest,
    totalAssets,
    irParams,
    timeDelta
  );

  return (debtShares * (openInterest + accruedInterest)) / totalDebtShares;
}

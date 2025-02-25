/**
 * Account Module
 *
 * This module handles account-related calculations including:
 * - Account health calculations
 * - Account LTV (Loan-to-Value) ratio calculations
 * - Account maximum and liquidation LTV thresholds
 *
 * The module provides essential functions for monitoring account status
 * and risk assessment through various LTV metrics.
 */

import { Collateral, InterestRateParams } from "../types";
import { convertDebtSharesToAssets } from "./borrow";

/**
 * Calculates the total value of all collateral assets
 * @param collaterals - Array of collateral assets
 * @returns The sum of all collateral values (amount * price)
 */
export function calculateTotalCollateralValue(
  collaterals: Collateral[]
): number {
  return collaterals.reduce((total, collateral) => {
    return total + collateral.amount * collateral.price;
  }, 0);
}

/**
 * Calculates the health factor of an account based on collaterals and current debt
 * @param collaterals - Array of collateral assets
 * @param currentDebt - Current outstanding debt
 * @returns The health factor (ratio of weighted collateral value to debt)
 * @throws Error if liquidationLTV is not defined or current debt is zero
 */
export function calculateAccountHealth(
  collaterals: Collateral[],
  currentDebt: number
): number {
  const totalCollateralValue = collaterals.reduce((total, collateral) => {
    if (!collateral.liquidationLTV) {
      throw new Error("LiquidationLTV is not defined");
    }
    return (
      total + collateral.amount * collateral.price * collateral.liquidationLTV
    );
  }, 0);

  if (currentDebt == 0) {
    throw new Error("Current debt cannot be zero");
  }

  return totalCollateralValue / currentDebt;
}

/**
 * Calculates the current Loan-to-Value ratio for an account
 * @param accountTotalDebt - Total outstanding debt for the account
 * @param collaterals - Array of collateral assets
 * @returns The current LTV ratio (debt/collateral value)
 */
export function calculateAccountLTV(
  accountTotalDebt: number,
  collaterals: Collateral[]
): number {
  const accountCollateralValue = calculateTotalCollateralValue(collaterals);

  if (accountCollateralValue == 0) {
    return 0;
  }

  return accountTotalDebt / accountCollateralValue;
}

/**
 * Calculates the maximum allowed LTV for an account based on collateral composition
 * @param collaterals - Array of collateral assets
 * @returns The maximum allowed LTV ratio
 * @throws Error if maxLTV is not defined for any collateral
 */
export function calculateAccountMaxLTV(collaterals: Collateral[]): number {
  const totalCollateralValue = calculateTotalCollateralValue(collaterals);
  if (totalCollateralValue == 0) return 0;

  const totalWeightedLTV = collaterals.reduce((sum, collateral) => {
    if (collateral.maxLTV !== undefined) {
      return sum + collateral.maxLTV * (collateral.amount * collateral.price);
    } else {
      throw new Error("MaxLTV is not defined for one or more collaterals");
    }
  }, 0);

  return totalWeightedLTV / totalCollateralValue;
}

/**
 * Calculates the liquidation LTV threshold for an account
 * @param collaterals - Array of collateral assets
 * @returns The liquidation LTV threshold
 */
export function calculateAccountLiqLTV(collaterals: Collateral[]): number {
  const accountCollateralValue = calculateTotalCollateralValue(collaterals);
  if (accountCollateralValue == 0) {
    return 0;
  }

  const totalWeightedLTV = collaterals.reduce((total, collateral) => {
    const collateralValue = collateral.amount * collateral.price;
    if (!collateral.liquidationLTV) {
      throw new Error("LiquidationLTV is not defined");
    }
    return total + collateral.liquidationLTV * collateralValue;
  }, 0);

  return totalWeightedLTV / accountCollateralValue;
}

/**
 * Calculates the maximum amount of a specific collateral that can be withdrawn
 * @param collateralToWithdraw - The collateral asset to withdraw
 * @param allCollaterals - Array of all collateral assets
 * @param debtShares - Current debt shares of the account
 * @param openInterest - Total outstanding loans in the protocol
 * @param totalDebtShares - Total debt shares in the protocol
 * @param totalAssets - Total assets in the protocol
 * @param irParams - Interest rate parameters
 * @param timeDelta - Current time delta
 * @param decimals - Number of decimals for the token being withdrawn
 * @param futureDeltaSeconds - Optional seconds to add for future debt calculation (default: 600 seconds/10 minutes)
 * @returns The maximum amount that can be withdrawn
 */
export function calculateMaxWithdrawAmount(
  collateralToWithdraw: Collateral,
  allCollaterals: Collateral[],
  debtShares: number,
  openInterest: number,
  totalDebtShares: number,
  totalAssets: number,
  irParams: InterestRateParams,
  timeDelta: number,
  decimals: number,
  futureDeltaSeconds: number = 600
): number {
  if (!collateralToWithdraw.maxLTV) {
    throw new Error("MaxLTV is not defined for the selected collateral");
  }

  // if there's no loan, they can withdraw the full amount
  if (debtShares === 0) {
    return collateralToWithdraw.amount;
  }

  // Calculate future debt (using configurable future time delta)
  const timeDeltaFuture = timeDelta + futureDeltaSeconds;
  const futureDebt = convertDebtSharesToAssets(
    debtShares,
    openInterest,
    totalDebtShares,
    totalAssets,
    irParams,
    timeDeltaFuture
  );

  // Calculate required collateral value to maintain position
  const requiredCollateralValue = futureDebt / collateralToWithdraw.maxLTV;

  // Calculate current total collateral value
  const currentCollateralValue = calculateTotalCollateralValue(allCollaterals);

  // Calculate excess collateral value that can be withdrawn
  const excessCollateralValue =
    currentCollateralValue - requiredCollateralValue;

  // Convert excess value to token amount with proper decimal handling
  const maxWithdrawAmount =
    Math.floor(
      (excessCollateralValue / collateralToWithdraw.price) *
        Math.pow(10, decimals)
    ) / Math.pow(10, decimals);

  // Return the minimum between calculated max amount and actual collateral amount
  return Math.max(0, Math.min(maxWithdrawAmount, collateralToWithdraw.amount));
}

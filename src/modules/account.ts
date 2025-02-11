/**
 * Account Module
 *
 * This module handles account-related calculations including:
 * - Account health calculations
 * - Collateral value calculations
 * - LTV (Loan-to-Value) ratio calculations
 * - Liquidation point calculations
 *
 * The module provides essential functions for monitoring account status,
 * risk assessment, and determining liquidation thresholds.
 */

import { Collateral, InterestRateParams } from "../types";
import { convertDebtSharesToAssets } from "./borrow";

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
 * Calculates the price drop percentage that would trigger liquidation
 * @param collaterals - Array of collateral assets
 * @param currentDebt - Current outstanding debt
 * @returns The percentage drop in collateral value that would trigger liquidation
 */
export function calculateDrop(
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

  if (totalCollateralValue == 0) {
    return 0;
  }

  return 1 - currentDebt / totalCollateralValue;
}

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
 * Calculates the collateral value at which liquidation would be triggered
 * @param accountLiqLTV - Account's liquidation LTV threshold
 * @param debtShares - Amount of debt shares
 * @param openInterest - Total outstanding loans
 * @param totalDebtShares - Total debt shares in protocol
 * @param totalAssets - Total assets in protocol
 * @param irParams - Interest rate parameters
 * @param timeDelta - Time elapsed since last interest accrual
 * @returns The collateral value at which liquidation would occur
 */
export function calculateLiquidationPoint(
  accountLiqLTV: number,
  debtShares: number,
  openInterest: number,
  totalDebtShares: number,
  totalAssets: number,
  irParams: InterestRateParams,
  timeDelta: number
): number {
  const accountDebt = convertDebtSharesToAssets(
    debtShares,
    openInterest,
    totalDebtShares,
    totalAssets,
    irParams,
    timeDelta
  );

  return accountLiqLTV !== 0 ? accountDebt / accountLiqLTV : 0;
}

/**
 * Liquidation Module
 *
 * This module handles liquidation-related calculations including:
 * - Maximum repayment amount calculations for liquidators
 * - Liquidation threshold checks
 * - Liquidation trigger points
 * - Price drop calculations
 *
 * The module provides essential functions for the liquidation process,
 * ensuring proper risk management and incentives for liquidators.
 */

import { Collateral, InterestRateParams } from "../types";
import { convertDebtSharesToAssets } from "./borrow";

/**
 * Calculates the price drop percentage that would trigger liquidation
 * @param collaterals - Array of collateral assets
 * @param currentDebt - Current outstanding debt
 * @returns The percentage drop in collateral value that would trigger liquidation
 */
export function calculateDrop(
  collaterals: Collateral[],
  currentDebt: number,
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
  timeDelta: number,
): number {
  const accountDebt = convertDebtSharesToAssets(
    debtShares,
    openInterest,
    totalDebtShares,
    totalAssets,
    irParams,
    timeDelta,
  );

  return accountLiqLTV !== 0 ? accountDebt / accountLiqLTV : 0;
}

/**
 * Calculates the maximum amount a liquidator can repay for a position
 * @param debtShares - Amount of debt shares to be liquidated
 * @param openInterest - Total outstanding loans
 * @param totalDebtShares - Total debt shares in the protocol
 * @param totalAssets - Total assets in the protocol
 * @param irParams - Interest rate parameters
 * @param timeDelta - Time elapsed since last interest accrual
 * @param collateral - The collateral asset being liquidated
 * @param allCollaterals - Array of all collateral assets in the position
 * @returns The maximum amount that can be repaid by the liquidator
 * @throws Error if liquidation LTV or liquidation premium are not defined
 */
export const liquidatorMaxRepayAmount = (
  debtShares: number,
  openInterest: number,
  totalDebtShares: number,
  totalAssets: number,
  irParams: InterestRateParams,
  timeDelta: number,
  collateral: Collateral,
  allCollaterals: Collateral[],
) => {
  if (!collateral.liquidationLTV || !collateral.liquidationPremium)
    throw new Error("Liquidation LTV or liquidation premium are not defined");

  // Calculate total debt including accrued interest
  const debtAssets = convertDebtSharesToAssets(
    debtShares,
    openInterest,
    totalDebtShares,
    totalAssets,
    irParams,
    timeDelta,
  );

  // Calculate sum of secured values from all collaterals (Σ(value_i × liqLTV_i))
  const totalSecuredValue = allCollaterals.reduce((sum, coll) => {
    if (!coll.liquidationLTV) {
      throw new Error(
        "LiquidationLTV is not defined for one or more collaterals",
      );
    }
    return sum + coll.amount * coll.price * coll.liquidationLTV;
  }, 0);

  // Calculate maxRepayCalc according to formula:
  // (debt – Σ(value_i × liqLTV_i)) / (1 – (1 + liqDiscount_x) × liqLTV_x)
  const denominator =
    1 - (1 + collateral.liquidationPremium) * collateral.liquidationLTV;
  const maxRepayCalc = (debtAssets - totalSecuredValue) / denominator;

  // Calculate the collateral-based cap
  const collateralValue = collateral.amount * collateral.price;
  const collateralCap = collateralValue / (1 + collateral.liquidationPremium);

  // Return max(min(maxRepayCalc, collateralCap), 0)
  return Math.max(Math.min(maxRepayCalc, collateralCap), 0);
};

/**
 * Calculates the amount of collateral to transfer to the liquidator
 * @param repayAmount - Amount being repaid by the liquidator
 * @param collateral - The collateral being liquidated
 * @returns The amount of collateral to transfer to the liquidator
 * @throws Error if liquidation premium is not defined
 */
export const calculateCollateralToTransfer = (
  repayAmount: number,
  collateral: Collateral,
): number => {
  if (!collateral.liquidationPremium) {
    throw new Error("Liquidation premium is not defined");
  }

  const liquidationReward = repayAmount * collateral.liquidationPremium;
  return (repayAmount + liquidationReward) / collateral.price;
};

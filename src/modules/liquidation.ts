/**
 * Liquidation Module
 *
 * This module handles liquidation-related calculations including:
 * - Maximum repayment amount calculations for liquidators
 * - Liquidation threshold checks
 * - Liquidation premium calculations
 *
 * The module provides essential functions for the liquidation process,
 * ensuring proper risk management and incentives for liquidators.
 */

import { Collateral, InterestRateParams } from "../types";
import { convertDebtSharesToAssets } from "./debt";

/**
 * Calculates the maximum amount a liquidator can repay for a position
 * @param debtShares - Amount of debt shares to be liquidated
 * @param openInterest - Total outstanding loans
 * @param totalDebtShares - Total debt shares in the protocol
 * @param totalAssets - Total assets in the protocol
 * @param irParams - Interest rate parameters
 * @param timeDelta - Time elapsed since last interest accrual
 * @param collateral - The collateral asset being liquidated
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
  collateral: Collateral
) => {
  if (!collateral.liquidationLTV || !collateral.liquidationPremium)
    throw new Error("Liquidation LTV or liquidation premium are not defined");
  const debtAssets = convertDebtSharesToAssets(
    debtShares,
    openInterest,
    totalDebtShares,
    totalAssets,
    irParams,
    timeDelta
  );
  const collateralValue = collateral.amount * collateral.price;

  return (
    (debtAssets - collateralValue * collateral.liquidationLTV) /
    (1 - (1 + collateral.liquidationPremium) * collateral.liquidationLTV)
  );
};

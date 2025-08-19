/**
 * Leverage Module
 *
 * This module provides helpers to compute the max leverage
 * and required collateral to swap for margin trading
 */

import { Collateral, InterestRateParams } from "../types";
import { calculateTotalCollateralValue } from "./account";
import { convertDebtSharesToAssets } from "./borrow";

/**
 * Calculates the maximum leverage multiplier.
 * Assumes no fees or slippage and liquidation at the max LTV threshold.
 * @param maxLtv - Corrected maxLTV
 * @returns The leverage multiplier 1 / (1 - maxLTV)
 */
export function absoluteMaxLeverage(maxLTV: number): number {
  if (maxLTV >= 1 || maxLTV <= 0) throw new Error("Invalid maxLTV");
  return 1 / (1 - maxLTV);
}

/**
 * Calculates the effective maximum borrowable fraction after costs.
 * Adjusts maxLTV by deducting flash loan fees and expected swap slippage.
 * @param collateral - Collateral configuration including maxLTV
 * @param flashLoanFee - Flash loan fee as a fraction of notional
 * @param slippage - Expected slippage as a fraction of notional
 * @returns The effective max LTV after costs
 */
export function correctedMaxLTV(
  collateral: Collateral,
  flashLoanFee: number,
  slippage: number,
): number {
  if (!collateral.maxLTV) throw new Error("Invalid maxLTV");

  return (1 - flashLoanFee - slippage) * collateral.maxLTV;
}

/**
 * Calculates the unencumbered collateral amount given the user debt and including accrued interest.
 * It works for a single collateral position.
 * @param debtShares - Amount of debt shares
 * @param openInterest - Total outstanding loans
 * @param totalDebtShares - Total debt shares in protocol
 * @param totalAssets - Total assets in protocol
 * @param irParams - Interest rate parameters
 * @param timeDelta - Time elapsed since last interest accrual
 * @param collateral - Current collateral params
 * @param maxLTVcorrected - Max LTV corrected for flash loan fees and slippage
 * @returns The free collateral that the user has deposited
 */
export function unencumberedCollateral(
  debtShares: number,
  openInterest: number,
  totalDebtShares: number,
  totalAssets: number,
  irParams: InterestRateParams,
  timeDelta: number,
  collateral: Collateral,
  maxLTVcorrected: number,
) {
  // Calculate total debt including accrued interest
  const debt = convertDebtSharesToAssets(
    debtShares,
    openInterest,
    totalDebtShares,
    totalAssets,
    irParams,
    timeDelta,
  );
  const encumberedCollateralValue = debt / maxLTVcorrected;
  const totalCollateralValue = calculateTotalCollateralValue([collateral]);
  return totalCollateralValue - encumberedCollateralValue;
}

/**
 * Computes the slippage cost when levering up.
 * Based on the new collateral purchased and expected slippage.
 * @param collateralValue - Current collateral value
 * @param slippage - Expected slippage as a fraction of notional
 * @returns The incremental loss due to slippage
 */
export function leverageMaxSlippage(collateralValue: number, slippage: number) {
  if (slippage >= 1 || slippage < 0) throw new Error("Invalid slippage");
  return collateralValue / (1 - slippage) - collateralValue;
}

/**
 * Computes the swap loss for a flash loan funded purchase.
 * Compares the flash loan notional to the value received from the swap.
 * @param flashLoanAmount - Amount borrowed via flash loan in quote terms
 * @param quote - Amount of market asset received from the swap
 * @param collateralPrice - Price of collateral in quote terms
 * @param marketAssetPrice - Price of the market asset used for the swap
 * @returns The loss due to price impact and conversion
 */
export function swapLoss(
  flashLoanAmount: number,
  quote: number,
  collateralPrice: number,
  marketAssetPrice: number,
) {
  return flashLoanAmount - (quote * collateralPrice) / marketAssetPrice;
}

/**
 * Derives flash loan notional and implied slippage fraction from swap results.
 * @param newCollateralValue - Value of newly acquired collateral
 * @param swapLoss - Loss attributed to slippage and pricing
 * @returns The flash loan notional and the realized slippage fraction
 */
export function computeFlashLoanValues(
  newCollateralValue: number,
  swapLoss: number,
) {
  const flashLoanValue = newCollateralValue + swapLoss;
  const slippage = swapLoss / flashLoanValue;

  return { flashLoanValue, slippage };
}

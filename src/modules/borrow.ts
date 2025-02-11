/**
 * Borrow Module
 *
 * This module handles all borrowing-related calculations including:
 * - Utilization rate computation
 * - Interest rate calculations (due interest, compounded interest)
 * - APR/APY calculations
 * - Borrowing capacity and availability checks
 * - Maximum repayment calculations
 */

import { InterestRateParams, Collateral } from "../types";
import { secondsInAYear } from "../constants";
import { convertDebtSharesToAssets } from "./debt";

/**
 * Calculates the utilization rate of the protocol
 * @param openInterest - The total amount of outstanding loans in the protocol
 * @param totalAssets - The total amount of assets deposited in the protocol
 * @returns A percentage that can be above 100% (> 1) but never negative as it's the ratio of two non-negative numbers
 * @example
 * computeUtilizationRate(500, 1000) // Returns 0.5 (50% utilization)
 * computeUtilizationRate(0, 1000)   // Returns 0 (0% utilization)
 * computeUtilizationRate(1500, 1000) // Returns 1.5 (150% utilization)
 */
export function computeUtilizationRate(
  openInterest: number,
  totalAssets: number
): number {
  if (totalAssets == 0) return 0;
  return openInterest / totalAssets;
}

/**
 * Calculates the total interest due on a debt amount
 * @param debtAmt - The amount of debt to calculate interest for
 * @param openInterest - The total outstanding loans in the protocol
 * @param totalAssets - The total assets in the protocol
 * @param irParams - Interest rate parameters
 * @param timeDelta - Time elapsed since last interest accrual
 * @returns The total amount due including interest
 */
export function calculateDueInterest(
  debtAmt: number,
  openInterest: number,
  totalAssets: number,
  irParams: InterestRateParams,
  timeDelta: number
): number {
  const ur: number = computeUtilizationRate(openInterest, totalAssets);
  const ir = annualizedAPR(ur, irParams);

  return debtAmt * (1 + ir / secondsInAYear) ** timeDelta;
}

/**
 * Calculates just the interest portion due on a given sum
 * @param debtAmt - The principal amount to calculate interest on
 * @param openInterest - The total outstanding loans
 * @param totalAssets - The total assets in the protocol
 * @param irParams - Interest rate parameters
 * @param timeDelta - Time elapsed since last interest accrual
 * @returns The interest amount accrued
 */
export function compoundedInterest(
  debtAmt: number,
  openInterest: number,
  totalAssets: number,
  irParams: InterestRateParams,
  timeDelta: number
): number {
  const ur: number = computeUtilizationRate(openInterest, totalAssets);
  const ir = annualizedAPR(ur, irParams);

  const interestAccrued =
    debtAmt * ((1 + ir / secondsInAYear) ** timeDelta - 1);

  return interestAccrued;
}

/**
 * Calculates the annualized APR based on utilization rate
 * @param ur - Current utilization rate
 * @param irParams - Interest rate parameters including kink point and slopes
 * @returns The annualized interest rate
 */
export function annualizedAPR(ur: number, irParams: InterestRateParams) {
  let ir: number;
  if (ur < irParams.urKink) ir = irParams.slope1 * ur + irParams.baseIR;
  else
    ir =
      irParams.slope2 * (ur - irParams.urKink) +
      irParams.slope1 * irParams.urKink +
      irParams.baseIR;

  return ir;
}

/**
 * Calculates the borrowing APY including compounding effects
 * @param ur - Current utilization rate
 * @param irParams - Interest rate parameters
 * @returns The effective annual percentage yield for borrowing
 */
export function calculateBorrowAPY(ur: number, irParams: InterestRateParams) {
  const borrowApr = annualizedAPR(ur, irParams);
  return (1 + borrowApr / secondsInAYear) ** secondsInAYear - 1;
}

/**
 * Calculates the maximum amount that can be borrowed against provided collaterals
 * @param collaterals - Array of collateral assets
 * @returns The total borrowing capacity based on collateral values and maxLTVs
 * @throws Error if any collateral's maxLTV is undefined
 */
export function calculateBorrowCapacity(collaterals: Collateral[]): number {
  let sum = 0;
  for (const { amount, price, maxLTV } of collaterals) {
    if (!maxLTV) {
      throw new Error("Collateral max LTV is not defined");
    }
    sum += amount * price * maxLTV;
  }
  return sum;
}

/**
 * Calculates how much can be borrowed from the protocol's available liquidity
 * @param freeLiquidity - The total available liquidity
 * @param reserveBalance - The protocol's reserve balance
 * @returns The amount available for borrowing from the protocol
 */
export function protocolAvailableToBorrow(
  freeLiquidity: number,
  reserveBalance: number
): number {
  if (reserveBalance >= freeLiquidity) return 0;

  return freeLiquidity - reserveBalance;
}

/**
 * Calculates how much a user can borrow based on their collateral and protocol constraints
 * @param collaterals - User's collateral assets
 * @param freeLiquidity - Protocol's available liquidity
 * @param reserveBalance - Protocol's reserve balance
 * @param currentDebt - User's current outstanding debt
 * @returns The maximum amount the user can borrow
 */
export function userAvailableToBorrow(
  collaterals: Collateral[],
  freeLiquidity: number,
  reserveBalance: number,
  currentDebt: number
): number {
  const protocolFreeLiquidity = protocolAvailableToBorrow(
    freeLiquidity,
    reserveBalance
  );
  return Math.min(
    protocolFreeLiquidity,
    Math.max(calculateBorrowCapacity(collaterals) - currentDebt, 0)
  );
}

/**
 * Calculates the maximum repayment amount including accrued interest
 * @param debtShares - Amount of debt shares
 * @param openInterest - Total outstanding loans
 * @param totalDebtShares - Total debt shares in protocol
 * @param totalAssets - Total assets in protocol
 * @param irParams - Interest rate parameters
 * @param timeDelta - Time elapsed since last interest accrual
 * @returns The maximum amount that can be repaid including interest
 */
export function calculateMaxRepayAmount(
  debtShares: number,
  openInterest: number,
  totalDebtShares: number,
  totalAssets: number,
  irParams: InterestRateParams,
  timeDelta: number
): number {
  const ur = computeUtilizationRate(openInterest, totalAssets);
  const borrowAPY = calculateBorrowAPY(ur, irParams);
  const debtAssets = convertDebtSharesToAssets(
    debtShares,
    openInterest,
    totalDebtShares,
    totalAssets,
    irParams,
    timeDelta
  );
  const repayMultiplier = 1 + (borrowAPY / secondsInAYear) * (10 * 60);

  return debtAssets * repayMultiplier;
}

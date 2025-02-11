import { InterestRateParams, Collateral } from "../types";
import { secondsInAYear } from "../constants";
import { convertDebtSharesToAssets } from "./debt";

export function computeUtilizationRate(
  openInterest: number,
  totalAssets: number
): number {
  if (totalAssets == 0) return 0;
  return openInterest / totalAssets;
}

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

export function calculateBorrowAPY(ur: number, irParams: InterestRateParams) {
  const borrowApr = annualizedAPR(ur, irParams);
  return (1 + borrowApr / secondsInAYear) ** secondsInAYear - 1;
}

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

export function protocolAvailableToBorrow(
  freeLiquidity: number,
  reserveBalance: number
): number {
  if (reserveBalance >= freeLiquidity) return 0;

  return freeLiquidity - reserveBalance;
}

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

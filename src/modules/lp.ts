import { InterestRateParams } from "../types";
import { secondsInAYear } from "../constants";
import { annualizedAPR, compoundedInterest } from "./borrow";

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

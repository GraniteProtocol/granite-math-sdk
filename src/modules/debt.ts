import { InterestRateParams } from "../types";
import { secondsInAYear } from "../constants";
import { compoundedInterest } from "./borrow";

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

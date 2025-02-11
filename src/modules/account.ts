import { Collateral, InterestRateParams } from "../types";
import { convertDebtSharesToAssets } from "./debt";

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

export function calculateTotalCollateralValue(
  collaterals: Collateral[]
): number {
  return collaterals.reduce((total, collateral) => {
    return total + collateral.amount * collateral.price;
  }, 0);
}

export function calculateWeightedLTV(collaterals: Collateral[]): number {
  const totalWeightedLTV = collaterals.reduce((total, collateral) => {
    const collateralValue = collateral.amount * collateral.price;
    if (!collateral.liquidationLTV) {
      throw new Error("LiquidationLTV is not defined");
    }
    return total + collateral.liquidationLTV * collateralValue;
  }, 0);

  return totalWeightedLTV;
}

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

export function calculateAccountLiqLTV(collaterals: Collateral[]): number {
  const accountCollateralValue = calculateTotalCollateralValue(collaterals);
  if (accountCollateralValue == 0) {
    return 0;
  }

  const averageLTV = calculateWeightedLTV(collaterals);
  return averageLTV / accountCollateralValue;
}

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
